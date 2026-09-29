const crypto = require('crypto');
const User = require('../models/User');
const SwitchWallet = require('../models/SwitchWallet');
const WithdrawalTransaction = require('../models/WithdrawalTransaction');
const switchService = require('./switchService');
const ledgerService = require('./ledgerService');

class WithdrawalService {
  /**
   * Orchestrates complete off-ramp withdrawal flow:
   * 1. Validates inputs and beneficiary
   * 2. Checks idempotency
   * 3. Fetches fresh guaranteed quote from Switch
   * 4. Atomically reserves user USDC balance
   * 5. Initiates payout on Switch API
   * 6. Updates state machine with timeout protection
   * 
   * @param {object} params
   * @param {object} params.user - Authenticated user object or ID
   * @param {number} params.amount - USDC amount to withdraw
   * @param {string} params.country - 2-letter ISO country code
   * @param {string} params.currency - Destination fiat currency code
   * @param {string} [params.channel='BANK'] - Payout channel (BANK, MOBILEMONEY)
   * @param {object} params.beneficiary - Recipient details
   * @param {string} [params.idempotencyKey] - Client deduplication key
   * @param {string} [params.narration] - Memo
   * @param {string} [params.reason='SERVICE_CHARGES']
   * @returns {Promise<object>} Withdrawal transaction result
   */
  async initiateWithdrawal({
    user,
    amount,
    country,
    currency,
    channel = 'BANK',
    beneficiary,
    idempotencyKey,
    narration = 'MyArteLab Payout',
    reason = 'SERVICE_CHARGES'
  }) {
    const userId = user._id || user;
    const numAmount = parseFloat(Number(amount).toFixed(6));

    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Please provide a valid withdrawal amount greater than 0');
    }

    if (!country || typeof country !== 'string' || country.trim().length !== 2) {
      throw new Error('A valid 2-letter ISO country code is required');
    }

    if (!currency || typeof currency !== 'string' || currency.trim().length < 2) {
      throw new Error('A valid fiat currency code is required');
    }

    if (!beneficiary || typeof beneficiary !== 'object') {
      throw new Error('Beneficiary payment details are required');
    }

    const cleanCountry = country.trim().toUpperCase();
    const cleanCurrency = currency.trim().toUpperCase();
    const cleanChannel = (channel || 'BANK').trim().toUpperCase();

    // 1. Resolve idempotency key (prevent double clicks & repeat submissions)
    const resolvedKey = idempotencyKey
      ? String(idempotencyKey).trim()
      : crypto.createHash('sha256').update(`${userId}-${cleanCountry}-${cleanCurrency}-${numAmount}-${Math.floor(Date.now() / (3 * 60 * 1000))}`).digest('hex');

    // Check for existing withdrawal under this idempotency key
    const existingTx = await WithdrawalTransaction.findOne({
      user: userId,
      idempotencyKey: resolvedKey
    });

    if (existingTx) {
      return {
        success: true,
        message: 'Existing withdrawal returned (idempotent)',
        data: this._formatWithdrawalResponse(existingTx)
      };
    }

    // 2. Ensure user has an active Switch wallet
    let switchWallet = await SwitchWallet.findOne({ user: userId });
    if (!switchWallet || !switchWallet.solanaAddress) {
      const userDoc = await User.findById(userId);
      const userName = userDoc?.name || `${userDoc?.firstName || ''} ${userDoc?.lastName || ''}`.trim();
      switchWallet = await switchService.getOrCreateUserWallet(userId, userName);
    }

    // 3. Fetch fresh guaranteed quote from Switch
    const quote = await switchService.getOfframpQuote({
      amount: numAmount,
      country: cleanCountry,
      currency: cleanCurrency,
      channel: cleanChannel,
      wallet: switchWallet?.solanaAddress || undefined
    });

    const destinationAmount = quote.destination?.amount;
    const exchangeRate = quote.rate;
    const quoteExpiry = quote.expiry ? new Date(quote.expiry) : new Date(Date.now() + 10 * 60 * 1000);

    // 4. ATOMIC BALANCE RESERVATION: Lock funds in user's pendingWithdrawal
    // If availableBalance < numAmount, this throws an error immediately and aborts.
    const reservation = await ledgerService.reserveWithdrawalBalance(userId, numAmount);

    // 5. Generate unique reference UUID
    const reference = crypto.randomUUID();
    const userFullName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'MyArteLab User';

    const normalizedBeneficiary = {
      holderType: beneficiary.holderType || beneficiary.holder_type || 'INDIVIDUAL',
      holderName: beneficiary.holderName || beneficiary.holder_name || beneficiary.accountName || userFullName,
      accountName: beneficiary.accountName || beneficiary.account_name || beneficiary.holderName || userFullName,
      accountNumber: beneficiary.accountNumber || beneficiary.account_number,
      bankCode: beneficiary.bankCode || beneficiary.bank_code,
      bankName: beneficiary.bankName || beneficiary.bank_name,
      mobileNetwork: beneficiary.mobileNetwork || beneficiary.mobile_network || beneficiary.bankCode,
      mobileNumber: beneficiary.mobileNumber || beneficiary.mobile_number || beneficiary.accountNumber
    };

    // 6. Create WithdrawalTransaction record with status 'reserved'
    const withdrawalTx = await WithdrawalTransaction.create({
      user: userId,
      idempotencyKey: resolvedKey,
      reference,
      sourceAsset: 'solana:usdc',
      sourceNetwork: 'SOLANA',
      amountUsdc: numAmount,
      destinationCountry: cleanCountry,
      destinationCurrency: cleanCurrency,
      destinationAmount,
      payoutChannel: cleanChannel === 'MOBILE_MONEY' ? 'MOBILEMONEY' : cleanChannel,
      exchangeRate,
      fee: quote.fee || { total: 0, platform: 0, developer: 0, currency: 'USD' },
      quoteDetails: {
        rate: exchangeRate,
        expiry: quoteExpiry,
        settlementTime: quote.settlement || 'INSTANT',
        rawQuote: quote
      },
      beneficiary: normalizedBeneficiary,
      narration: (narration || 'MyArteLab Payout').trim(),
      reason: reason || 'SERVICE_CHARGES',
      status: 'reserved',
      switchStatus: 'INITIATED',
      reservation: {
        isReserved: true,
        reservedAt: new Date()
      }
    });

    // 7. Initiate payout on Switch API
    const callbackUrl = process.env.SWITCH_CALLBACK_URL || 'https://app.myartelab.com/webhooks';
    let switchInitiateResult;

    try {
      switchInitiateResult = await switchService.initiateOfframp({
        amount: numAmount,
        country: cleanCountry,
        currency: cleanCurrency,
        channel: cleanChannel,
        reference,
        callbackUrl,
        beneficiary: {
          holder_type: normalizedBeneficiary.holderType,
          holder_name: normalizedBeneficiary.holderName,
          account_number: normalizedBeneficiary.accountNumber,
          bank_code: normalizedBeneficiary.bankCode,
          mobile_number: normalizedBeneficiary.mobileNumber,
          mobile_network: normalizedBeneficiary.mobileNetwork
        },
        narration: withdrawalTx.narration,
        reason: withdrawalTx.reason,
        wallet: switchWallet?.switchWalletId || switchWallet?.solanaAddress,
        developerFee: 1 // 1% internal platform fee parameter
      });

      // Update status to processing on successful call
      withdrawalTx.status = 'processing';
      withdrawalTx.switchStatus = switchInitiateResult.status || 'PROCESSING';
      withdrawalTx.switchReference = switchInitiateResult.reference || reference;
      await withdrawalTx.save();

      return {
        success: true,
        message: 'Withdrawal initiated and processing',
        data: this._formatWithdrawalResponse(withdrawalTx)
      };
    } catch (apiErr) {
      const isTimeout = apiErr.name === 'AbortError' || 
        apiErr.code === 'UND_ERR_CONNECT_TIMEOUT' || 
        apiErr.message?.includes('timed out');

      if (isTimeout) {
        // TIMEOUT SAFETY: Do NOT release reservation! Payout may have reached Switch rails.
        console.warn(`[WithdrawalService] Switch initiate timed out for ${reference}. Keeping reservation locked for webhook reconciliation.`);
        withdrawalTx.status = 'processing';
        withdrawalTx.switchStatus = 'UNKNOWN';
        withdrawalTx.failureReason = 'Initiation request timed out; awaiting webhook confirmation';
        await withdrawalTx.save();

        return {
          success: true,
          message: 'Withdrawal submitted. Confirmation is pending blockchain/bank settlement.',
          data: this._formatWithdrawalResponse(withdrawalTx)
        };
      }

      // Synchronous API validation error (e.g. invalid bank account number)
      console.error(`[WithdrawalService] Switch initiate rejected for ${reference}:`, apiErr.message);
      
      // Release the reserved balance safely
      await ledgerService.releaseWithdrawalReservation(userId, numAmount);

      withdrawalTx.status = 'failed';
      withdrawalTx.switchStatus = 'FAILED';
      withdrawalTx.failureReason = apiErr.message;
      withdrawalTx.reservation.isReserved = false;
      withdrawalTx.reservation.releasedAt = new Date();
      await withdrawalTx.save();

      throw apiErr;
    }
  }

  /**
   * Syncs live status of an in-flight withdrawal by polling Switch API.
   * 
   * @param {string} reference
   * @param {string|ObjectId} userId
   * @returns {Promise<object>} Current withdrawal transaction state
   */
  async getWithdrawalStatus(reference, userId) {
    const withdrawalTx = await WithdrawalTransaction.findOne({
      reference,
      user: userId
    });

    if (!withdrawalTx) {
      throw new Error('Withdrawal transaction not found');
    }

    if (['reserved', 'processing'].includes(withdrawalTx.status)) {
      try {
        const statusRes = await switchService.getPaymentStatus(withdrawalTx.reference);
        const switchStatus = statusRes?.status;

        if (switchStatus && switchStatus !== withdrawalTx.switchStatus) {
          withdrawalTx.switchStatus = switchStatus;

          if (switchStatus === 'COMPLETED') {
            await ledgerService.settleCompletedWithdrawal(withdrawalTx);
          } else if (['FAILED', 'REVERSED', 'EXPIRED'].includes(switchStatus)) {
            await ledgerService.handleFailedOrReversedWithdrawal(withdrawalTx, switchStatus, statusRes?.message);
          } else if (switchStatus === 'PROCESSING') {
            withdrawalTx.status = 'processing';
            await withdrawalTx.save();
          }
        }
      } catch (pollErr) {
        console.warn(`[WithdrawalService] Could not sync Switch payment status for ${reference}:`, pollErr.message);
      }
    }

    // Refresh after potential settlement
    const freshTx = await WithdrawalTransaction.findById(withdrawalTx._id);
    return this._formatWithdrawalResponse(freshTx);
  }

  /**
   * Formats safe public response for withdrawal transactions.
   * @private
   */
  _formatWithdrawalResponse(tx) {
    return {
      reference: tx.reference,
      status: tx.status,
      switchStatus: tx.switchStatus,
      amountUsdc: tx.amountUsdc,
      sourceAsset: tx.sourceAsset,
      destinationAmount: tx.destinationAmount,
      destinationCurrency: tx.destinationCurrency,
      destinationCountry: tx.destinationCountry,
      exchangeRate: tx.exchangeRate,
      payoutChannel: tx.payoutChannel,
      fee: tx.fee,
      beneficiary: {
        accountName: tx.beneficiary?.accountName || tx.beneficiary?.holderName,
        accountNumber: tx.beneficiary?.accountNumber,
        bankName: tx.beneficiary?.bankName,
        bankCode: tx.beneficiary?.bankCode,
        mobileNetwork: tx.beneficiary?.mobileNetwork,
        mobileNumber: tx.beneficiary?.mobileNumber
      },
      reservation: {
        isReserved: tx.reservation?.isReserved,
        reservedAt: tx.reservation?.reservedAt,
        settledAt: tx.reservation?.settledAt,
        releasedAt: tx.reservation?.releasedAt
      },
      failureReason: tx.failureReason || null,
      createdAt: tx.createdAt,
      updatedAt: tx.updatedAt
    };
  }
}

module.exports = new WithdrawalService();
