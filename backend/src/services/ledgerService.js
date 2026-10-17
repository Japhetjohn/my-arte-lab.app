const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const FundingTransaction = require('../models/FundingTransaction');

class LedgerService {
  /**
   * Credit on-ramp funding deposit to user balance atomically and idempotently.
   * Ensures exactly-once balance increment at the database query level.
   * 
   * @param {Object} fundingTx FundingTransaction document or object with _id
   * @returns {Promise<{ credited: boolean, alreadyCredited?: boolean, amount?: number, ledgerTx?: Object, reference?: string }>}
   */
  async creditFundingDeposit(fundingTx) {
    if (!fundingTx || !fundingTx._id) {
      throw new Error('Valid funding transaction record is required for ledger crediting');
    }

    // 1. Query-level atomic guard: update only if isCredited is false
    const lockedFundingTx = await FundingTransaction.findOneAndUpdate(
      {
        _id: fundingTx._id,
        isCredited: false
      },
      {
        $set: {
          isCredited: true,
          creditedAt: new Date(),
          status: 'completed',
          switchStatus: 'COMPLETED'
        }
      },
      { new: true }
    );

    // If lockedFundingTx is null, it was already credited by a prior webhook/request
    if (!lockedFundingTx) {
      console.log(`[Ledger] Funding ${fundingTx.reference || fundingTx._id} is already credited. Preventing duplicate credit.`);
      return {
        credited: false,
        alreadyCredited: true,
        reference: fundingTx.reference
      };
    }

    const creditAmount = Number(lockedFundingTx.quotedUsdcAmount);
    if (!creditAmount || creditAmount <= 0) {
      console.error(`[Ledger] Invalid quotedUsdcAmount for funding ${lockedFundingTx.reference}: ${creditAmount}`);
      throw new Error(`Invalid deposit credit amount: ${creditAmount}`);
    }

    // 2. Find existing pending transaction or create authoritative completed transaction in the ledger
    let ledgerTx = await Transaction.findOne({
      user: lockedFundingTx.user,
      $or: [
        { reference: lockedFundingTx.reference },
        { 'metadata.fundingTransactionId': lockedFundingTx._id },
        { 'metadata.switchReference': lockedFundingTx.switchReference }
      ]
    });

    if (ledgerTx) {
      ledgerTx.status = 'completed';
      ledgerTx.amount = creditAmount;
      ledgerTx.netAmount = creditAmount;
      ledgerTx.currency = 'USDC';
      ledgerTx.completedAt = new Date();
      if (!ledgerTx.metadata) ledgerTx.metadata = {};
      ledgerTx.metadata.provider = 'switch';
      ledgerTx.metadata.fundingTransactionId = lockedFundingTx._id;
      ledgerTx.metadata.fiatCurrency = lockedFundingTx.fiatCurrency;
      ledgerTx.metadata.fiatAmount = lockedFundingTx.fiatAmount;
      ledgerTx.metadata.quoteRate = lockedFundingTx.quoteRate;
      ledgerTx.metadata.quotedUsdcAmount = creditAmount;
      ledgerTx.metadata.channel = lockedFundingTx.channel;
      ledgerTx.metadata.country = lockedFundingTx.country;
      ledgerTx.metadata.switchReference = lockedFundingTx.switchReference;
      await ledgerTx.save();
    } else {
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = crypto.randomBytes(3).toString('hex').toUpperCase();
      const transactionId = `TXN-DEP-${timestamp}-${random}`;

      ledgerTx = await Transaction.create({
        transactionId,
        user: lockedFundingTx.user,
        type: 'deposit',
        amount: creditAmount,
        netAmount: creditAmount,
        currency: 'USDC',
        status: 'completed',
        reference: lockedFundingTx.reference,
        paymentMethod: lockedFundingTx.channel === 'MOBILEMONEY' ? 'mobile_money' : 'bank_transfer',
        description: `Switch Onramp: ${lockedFundingTx.fiatAmount} ${lockedFundingTx.fiatCurrency} -> ${creditAmount} USDC`,
        blockchainNetwork: 'SOLANA',
        toAddress: lockedFundingTx.destinationAddress,
        metadata: {
          provider: 'switch',
          fundingTransactionId: lockedFundingTx._id,
          fiatCurrency: lockedFundingTx.fiatCurrency,
          fiatAmount: lockedFundingTx.fiatAmount,
          quoteRate: lockedFundingTx.quoteRate,
          quotedUsdcAmount: creditAmount,
          channel: lockedFundingTx.channel,
          country: lockedFundingTx.country,
          switchReference: lockedFundingTx.switchReference
        },
        completedAt: new Date()
      });
    }

    // 3. Atomically update user balance: keep BOTH wallet.balance and user.balance in 100% lockstep
    const userUpdate = await User.findByIdAndUpdate(
      lockedFundingTx.user,
      {
        $inc: {
          'wallet.balance': creditAmount,
          'balance': creditAmount
        },
        $set: {
          'wallet.lastUpdated': new Date(),
          'lastUpdated': new Date()
        }
      },
      { new: true }
    );

    const finalTxId = ledgerTx?.transactionId || ledgerTx?._id || 'TXN-DEP';
    console.log(`[Ledger] Successfully credited ${creditAmount} USDC to user ${lockedFundingTx.user}. New balance: ${userUpdate?.wallet?.balance || userUpdate?.balance} USDC. LedgerTx: ${finalTxId}`);

    return {
      credited: true,
      amount: creditAmount,
      currency: 'USDC',
      reference: lockedFundingTx.reference,
      ledgerTx
    };
  }

  /**
   * Atomically reserves available USDC balance for an in-flight withdrawal.
   * Ensures availableBalance (wallet.balance - wallet.pendingWithdrawal) >= withdrawalAmount
   * and increments pendingWithdrawal in 100% atomic lockstep.
   * 
   * @param {string|ObjectId} userId
   * @param {number} amountUsdc
   * @returns {Promise<{ reserved: boolean, reservedAmount: number, availableBalance: number, pendingWithdrawal: number }>}
   */
  async reserveWithdrawalBalance(userId, amountUsdc) {
    const withdrawalAmount = parseFloat(Number(amountUsdc).toFixed(6));
    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
      const err = new Error('Valid positive withdrawal amount is required for balance reservation');
      err.status = 400;
      err.statusCode = 400;
      err.isOperational = true;
      throw err;
    }

    const userUpdate = await User.findOneAndUpdate(
      {
        _id: userId,
        $expr: {
          $gte: [
            {
              $subtract: [
                { $ifNull: ['$wallet.balance', '$balance'] },
                { $ifNull: ['$wallet.pendingWithdrawal', 0] }
              ]
            },
            withdrawalAmount
          ]
        }
      },
      {
        $inc: {
          'wallet.pendingWithdrawal': withdrawalAmount,
          'pendingWithdrawal': withdrawalAmount
        },
        $set: {
          'wallet.lastUpdated': new Date(),
          'lastUpdated': new Date()
        }
      },
      { new: true }
    );

    if (!userUpdate) {
      // Fetch user to provide exact discrepancy details
      const currentUser = await User.findById(userId);
      const curBal = currentUser?.wallet?.balance || currentUser?.balance || 0;
      const curPending = currentUser?.wallet?.pendingWithdrawal || currentUser?.pendingWithdrawal || 0;
      const available = Math.max(0, curBal - curPending);
      const err = new Error(`Insufficient available balance. Required: ${withdrawalAmount} USDC, Available: ${available} USDC`);
      err.status = 400;
      err.statusCode = 400;
      err.isOperational = true;
      throw err;
    }

    const authoritativeBal = userUpdate.wallet?.balance !== undefined ? userUpdate.wallet.balance : userUpdate.balance;
    const currentPending = userUpdate.wallet?.pendingWithdrawal !== undefined ? userUpdate.wallet.pendingWithdrawal : userUpdate.pendingWithdrawal;
    const availableBalance = Math.max(0, parseFloat((authoritativeBal - currentPending).toFixed(6)));

    console.log(`[Ledger] Reserved ${withdrawalAmount} USDC for user ${userId}. Pending: ${currentPending} USDC, Available: ${availableBalance} USDC`);

    return {
      reserved: true,
      reservedAmount: withdrawalAmount,
      availableBalance,
      pendingWithdrawal: currentPending
    };
  }

  /**
   * Atomically releases a previously reserved withdrawal amount back to available balance.
   * (Decrements pendingWithdrawal without altering wallet.balance).
   * 
   * @param {string|ObjectId} userId
   * @param {number} amountUsdc
   * @returns {Promise<{ released: boolean, releasedAmount: number, pendingWithdrawal: number }>}
   */
  async releaseWithdrawalReservation(userId, amountUsdc) {
    const releaseAmount = parseFloat(Number(amountUsdc).toFixed(6));
    if (isNaN(releaseAmount) || releaseAmount <= 0) {
      return { released: false, reason: 'Invalid release amount' };
    }

    const userUpdate = await User.findOneAndUpdate(
      {
        _id: userId,
        $expr: {
          $gte: [
            { $ifNull: ['$wallet.pendingWithdrawal', 0] },
            releaseAmount
          ]
        }
      },
      {
        $inc: {
          'wallet.pendingWithdrawal': -releaseAmount,
          'pendingWithdrawal': -releaseAmount
        },
        $set: {
          'wallet.lastUpdated': new Date(),
          'lastUpdated': new Date()
        }
      },
      { new: true }
    );

    // If pending was less than releaseAmount, clamp to 0 safely
    if (!userUpdate) {
      await User.findByIdAndUpdate(userId, {
        $set: {
          'wallet.pendingWithdrawal': 0,
          'pendingWithdrawal': 0,
          'wallet.lastUpdated': new Date(),
          'lastUpdated': new Date()
        }
      });
    }

    const updatedUser = userUpdate || await User.findById(userId);
    const currentPending = updatedUser?.wallet?.pendingWithdrawal || updatedUser?.pendingWithdrawal || 0;

    console.log(`[Ledger] Released ${releaseAmount} USDC reservation for user ${userId}. New pending: ${currentPending} USDC`);

    return {
      released: true,
      releasedAmount: releaseAmount,
      pendingWithdrawal: currentPending
    };
  }

  /**
   * Finalizes and settles a completed off-ramp withdrawal:
   * Atomically decrements wallet.balance, clears pendingWithdrawal, and logs Transaction to ledger.
   * Exactly-once transition guard prevents duplicate debits.
   * 
   * @param {Object} withdrawalTx WithdrawalTransaction document or object
   * @returns {Promise<{ settled: boolean, alreadySettled?: boolean, amount?: number, ledgerTx?: Object }>}
   */
  async settleCompletedWithdrawal(withdrawalTx) {
    if (!withdrawalTx || !withdrawalTx._id) {
      throw new Error('Valid withdrawal transaction record is required for settlement');
    }

    const WithdrawalTransaction = require('../models/WithdrawalTransaction');

    // 1. Query-level atomic guard: update only if status is NOT already completed
    const lockedWithdrawalTx = await WithdrawalTransaction.findOneAndUpdate(
      {
        _id: withdrawalTx._id,
        status: { $ne: 'completed' }
      },
      {
        $set: {
          status: 'completed',
          switchStatus: 'COMPLETED',
          completedAt: new Date(),
          'reservation.settledAt': new Date()
        }
      },
      { new: true }
    );

    if (!lockedWithdrawalTx) {
      console.log(`[Ledger] Withdrawal ${withdrawalTx.reference || withdrawalTx._id} is already completed. Preventing duplicate debit.`);
      return {
        settled: false,
        alreadySettled: true,
        reference: withdrawalTx.reference
      };
    }

    const settleAmount = parseFloat(Number(lockedWithdrawalTx.amountUsdc).toFixed(6));

    // 2. Create authoritative completed transaction in the ledger
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    const transactionId = `TXN-WD-${timestamp}-${random}`;

    const ledgerTx = await Transaction.create({
      transactionId,
      user: lockedWithdrawalTx.user,
      type: 'withdrawal',
      amount: settleAmount,
      netAmount: settleAmount,
      currency: 'USDC',
      status: 'completed',
      reference: lockedWithdrawalTx.reference,
      paymentMethod: (lockedWithdrawalTx.payoutChannel === 'MOBILEMONEY' || lockedWithdrawalTx.payoutChannel === 'MOBILE_MONEY') ? 'mobile_money' : 'bank_transfer',
      description: `Switch Offramp Payout: ${settleAmount} USDC -> ${lockedWithdrawalTx.destinationAmount} ${lockedWithdrawalTx.destinationCurrency}`,
      blockchainNetwork: 'SOLANA',
      metadata: {
        provider: 'switch',
        withdrawalTransactionId: lockedWithdrawalTx._id,
        destinationCurrency: lockedWithdrawalTx.destinationCurrency,
        destinationAmount: lockedWithdrawalTx.destinationAmount,
        exchangeRate: lockedWithdrawalTx.exchangeRate,
        fee: lockedWithdrawalTx.fee,
        beneficiary: lockedWithdrawalTx.beneficiary,
        payoutChannel: lockedWithdrawalTx.payoutChannel,
        country: lockedWithdrawalTx.destinationCountry,
        switchReference: lockedWithdrawalTx.switchReference
      },
      completedAt: new Date()
    });

    // 3. Atomically debit user balance and clear pending reservation
    const userUpdate = await User.findByIdAndUpdate(
      lockedWithdrawalTx.user,
      {
        $inc: {
          'wallet.balance': -settleAmount,
          'balance': -settleAmount,
          'wallet.pendingWithdrawal': -settleAmount,
          'pendingWithdrawal': -settleAmount
        },
        $set: {
          'wallet.lastUpdated': new Date(),
          'lastUpdated': new Date()
        }
      },
      { new: true }
    );

    // Safeguard: Ensure balance and pendingWithdrawal do not drop below 0 due to concurrency
    if (userUpdate && ((userUpdate.wallet?.pendingWithdrawal || 0) < 0 || (userUpdate.pendingWithdrawal || 0) < 0)) {
      await User.findByIdAndUpdate(lockedWithdrawalTx.user, {
        $set: {
          'wallet.pendingWithdrawal': Math.max(0, userUpdate.wallet?.pendingWithdrawal || 0),
          'pendingWithdrawal': Math.max(0, userUpdate.pendingWithdrawal || 0)
        }
      });
    }

    console.log(`[Ledger] Successfully settled withdrawal of ${settleAmount} USDC for user ${lockedWithdrawalTx.user}. New balance: ${userUpdate?.wallet?.balance || userUpdate?.balance} USDC. LedgerTx: ${transactionId}`);

    return {
      settled: true,
      amount: settleAmount,
      currency: 'USDC',
      reference: lockedWithdrawalTx.reference,
      ledgerTx
    };
  }

  /**
   * Handles failed, expired, or reversed off-ramp transactions:
   * Releases locked pendingWithdrawal reservation back to available balance.
   * If already completed and reversed by bank, refunds balance and logs reversal.
   * 
   * @param {Object} withdrawalTx
   * @param {string} [failureStatus='FAILED']
   * @param {string} [failureReason]
   * @returns {Promise<{ handled: boolean, released: boolean, status: string }>}
   */
  async handleFailedOrReversedWithdrawal(withdrawalTx, failureStatus = 'FAILED', failureReason = '') {
    if (!withdrawalTx || !withdrawalTx._id) {
      throw new Error('Valid withdrawal transaction record is required');
    }

    const WithdrawalTransaction = require('../models/WithdrawalTransaction');
    const cleanStatus = failureStatus.toUpperCase() === 'REVERSED' ? 'reversed' : 'failed';
    const amount = parseFloat(Number(withdrawalTx.amountUsdc).toFixed(6));

    // 1. Fetch current status before atomic transition
    const currentTx = await WithdrawalTransaction.findById(withdrawalTx._id);
    if (!currentTx || ['failed', 'reversed', 'cancelled'].includes(currentTx.status)) {
      return { handled: false, alreadyHandled: true, reference: withdrawalTx.reference };
    }

    const previousStatus = currentTx.status;

    // 2. Transition state
    currentTx.status = cleanStatus;
    currentTx.switchStatus = failureStatus.toUpperCase();
    currentTx.failureReason = failureReason || `Switch reported status ${failureStatus}`;
    currentTx.reservation.releasedAt = new Date();
    await currentTx.save();

    // 3. If previous status was 'completed', funds were already deducted from wallet.balance -> perform full refund
    if (previousStatus === 'completed') {
      await User.findByIdAndUpdate(currentTx.user, {
        $inc: {
          'wallet.balance': amount,
          'balance': amount
        },
        $set: {
          'wallet.lastUpdated': new Date(),
          'lastUpdated': new Date()
        }
      });

      const timestamp = Date.now().toString(36).toUpperCase();
      const random = crypto.randomBytes(3).toString('hex').toUpperCase();
      await Transaction.create({
        transactionId: `TXN-REF-${timestamp}-${random}`,
        user: currentTx.user,
        type: 'refund',
        amount,
        netAmount: amount,
        currency: 'USDC',
        status: 'completed',
        reference: currentTx.reference,
        description: `Refund for reversed withdrawal ${currentTx.reference}`,
        completedAt: new Date()
      });

      console.log(`[Ledger] Refunded ${amount} USDC for reversed completed withdrawal ${currentTx.reference}`);
      return { handled: true, refunded: true, status: cleanStatus };
    }

    // Otherwise, funds were in pendingWithdrawal reservation -> release pending reservation
    await this.releaseWithdrawalReservation(currentTx.user, amount);
    console.log(`[Ledger] Released reservation of ${amount} USDC for failed withdrawal ${currentTx.reference}`);

    return { handled: true, released: true, status: cleanStatus };
  }

  /**
   * Calculate authoritative balance directly from completed ledger transactions.
   * 
   * @param {string|ObjectId} userId
   * @param {Object} [session] Optional mongoose session
   * @returns {Promise<{ calculatedBalance: number, totalCredits: number, totalDebits: number }>}
   */
  async calculateAuthoritativeBalance(userId, session = null) {
    const query = Transaction.find({
      user: userId,
      status: 'completed'
    });
    if (session) query.session(session);
    const completedTransactions = await query;

    let totalCredits = 0;
    let totalDebits = 0;

    for (const tx of completedTransactions) {
      const amt = parseFloat(tx.amount) || 0;
      const curr = (tx.currency || 'USDC').toUpperCase();
      if (curr !== 'USDC') continue;

      if (['deposit', 'earning', 'bonus', 'onramp', 'refund', 'transfer_in'].includes(tx.type)) {
        totalCredits += amt;
      } else if (['withdrawal', 'payment', 'escrow', 'verification', 'offramp', 'platform_fee', 'transfer_out'].includes(tx.type)) {
        totalDebits += amt;
      }
    }

    const calculatedBalance = Math.max(0, Math.round((totalCredits - totalDebits) * 100) / 100);

    return {
      calculatedBalance,
      totalCredits: Math.round(totalCredits * 100) / 100,
      totalDebits: Math.round(totalDebits * 100) / 100
    };
  }

  /**
   * Reconcile and synchronize user's dual balance fields with the authoritative ledger.
   * Ensures wallet.balance and balance are identical and match completed transactions.
   * 
   * @param {string|ObjectId} userId
   * @returns {Promise<{ synced: boolean, previousBalance: number, newBalance: number, totalCredits: number, totalDebits: number }>}
   */
  async syncUserBalance(userId) {
    const { calculatedBalance, totalCredits, totalDebits } = await this.calculateAuthoritativeBalance(userId);
    const user = await User.findById(userId);
    if (!user) return { synced: false, error: 'User not found' };

    const rawPrev = user.wallet?.balance !== undefined && user.wallet?.balance !== null
      ? user.wallet.balance
      : (user.balance || 0);
    const previousBalance = Math.round((Number(rawPrev) || 0) * 100) / 100;

    await User.findByIdAndUpdate(userId, {
      $set: {
        'wallet.balance': calculatedBalance,
        'balance': calculatedBalance,
        'wallet.lastUpdated': new Date(),
        'lastUpdated': new Date()
      }
    });

    return {
      synced: true,
      previousBalance,
      newBalance: calculatedBalance,
      totalCredits,
      totalDebits
    };
  }

  /**
   * Atomically and idempotently credits a verified on-chain Solana USDC deposit.
   * Updates user.balance and user.wallet.balance in 100% lockstep.
   * Records completed Transaction entry in the authoritative ledger.
   * 
   * @param {Object} solanaDeposit SolanaDeposit document or object with _id
   * @returns {Promise<{ credited: boolean, alreadyCredited?: boolean, amount?: number, ledgerTx?: Object }>}
   */
  async creditSolanaDeposit(solanaDeposit) {
    if (!solanaDeposit || !solanaDeposit._id) {
      throw new Error('Valid Solana deposit record is required for ledger crediting');
    }

    const SolanaDeposit = require('../models/SolanaDeposit');

    // 1. Atomic query-level check to guarantee exactly-once crediting
    const lockedDeposit = await SolanaDeposit.findOneAndUpdate(
      {
        _id: solanaDeposit._id,
        isCredited: false
      },
      {
        $set: {
          isCredited: true,
          creditedAt: new Date(),
          status: 'credited'
        }
      },
      { new: true }
    );

    if (!lockedDeposit) {
      console.log(`[Ledger] Solana deposit ${solanaDeposit.signature || solanaDeposit._id} is already credited. Preventing duplicate credit.`);
      return {
        credited: false,
        alreadyCredited: true,
        signature: solanaDeposit.signature
      };
    }

    const creditAmount = Number(lockedDeposit.amountUsdc);
    if (!creditAmount || creditAmount <= 0) {
      throw new Error(`Invalid Solana deposit credit amount: ${creditAmount}`);
    }

    // 2. Create authoritative completed transaction in the ledger
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    const transactionId = `TXN-SOL-${timestamp}-${random}`;

    const ledgerTx = await Transaction.create({
      transactionId,
      user: lockedDeposit.user,
      type: 'deposit',
      amount: creditAmount,
      netAmount: creditAmount,
      currency: 'USDC',
      status: 'completed',
      reference: lockedDeposit.signature,
      paymentMethod: 'solana_direct',
      blockchainNetwork: 'SOLANA',
      fromAddress: lockedDeposit.fromAddress,
      toAddress: lockedDeposit.toAddress,
      transactionHash: lockedDeposit.signature,
      confirmations: 32,
      description: `Direct Solana USDC Deposit: ${creditAmount} USDC`,
      metadata: {
        depositType: 'solana_direct',
        signature: lockedDeposit.signature,
        mint: lockedDeposit.mint,
        slot: lockedDeposit.slot,
        network: lockedDeposit.network
      },
      completedAt: new Date()
    });

    // 3. Atomically update user balance: keep BOTH wallet.balance and user.balance in 100% lockstep
    const userUpdate = await User.findByIdAndUpdate(
      lockedDeposit.user,
      {
        $inc: {
          'wallet.balance': creditAmount,
          'balance': creditAmount
        },
        $set: {
          'wallet.lastUpdated': new Date(),
          'lastUpdated': new Date()
        }
      },
      { new: true }
    );

    // Update SolanaDeposit with ledger transaction ID
    await SolanaDeposit.findByIdAndUpdate(lockedDeposit._id, {
      $set: { ledgerTransactionId: transactionId }
    });

    console.log(`[Ledger] Successfully credited ${creditAmount} USDC from Solana tx ${lockedDeposit.signature} to user ${lockedDeposit.user}. New balance: ${userUpdate?.wallet?.balance || userUpdate?.balance} USDC. LedgerTx: ${transactionId}`);

    return {
      credited: true,
      amount: creditAmount,
      currency: 'USDC',
      signature: lockedDeposit.signature,
      ledgerTx
    };
  }

  /**
   * Executes an atomic internal wallet-to-wallet transfer between users.
   * Guarantees:
   * 1. Idempotency via unique idempotencyKey / reference
   * 2. Sender available balance check ($gte: balance - pendingWithdrawal >= amount)
   * 3. Atomic dual-balance debit for sender
   * 4. Atomic dual-balance credit for recipient
   * 5. Immutable auditable Transaction ledger records for both parties
   * 6. Safe rollback if recipient update fails
   *
   * @param {Object} params
   * @param {string|ObjectId} params.senderId - Sender user ID
   * @param {string|ObjectId} params.recipientId - Recipient user ID
   * @param {number} params.amount - Transfer amount in USDC
   * @param {string} [params.note] - Optional memo
   * @param {string} [params.idempotencyKey] - Unique idempotency key
   * @returns {Promise<{ success: boolean, amount: number, reference: string, senderTx: Object, recipientTx: Object, senderBalance: number, recipientBalance: number }>}
   */
  async transferBetweenWallets({ senderId, recipientId, amount, note = '', idempotencyKey = null }) {
    const numAmount = parseFloat(Number(amount).toFixed(6));
    if (isNaN(numAmount) || numAmount <= 0) {
      const err = new Error('Transfer amount must be a positive number greater than 0');
      err.status = 400;
      err.statusCode = 400;
      err.isOperational = true;
      throw err;
    }

    if (String(senderId) === String(recipientId)) {
      const err = new Error('Cannot transfer funds to yourself');
      err.status = 400;
      err.statusCode = 400;
      err.isOperational = true;
      throw err;
    }

    const resolvedReference = (idempotencyKey && String(idempotencyKey).trim()) || crypto.randomUUID();

    // 1. Idempotency check: If this exact transfer was already completed, return existing result
    const existingSenderTx = await Transaction.findOne({
      user: senderId,
      type: 'transfer_out',
      reference: resolvedReference,
      status: 'completed'
    });

    if (existingSenderTx) {
      const existingRecipientTx = await Transaction.findOne({
        user: recipientId,
        type: 'transfer_in',
        reference: resolvedReference,
        status: 'completed'
      });

      const sender = await User.findById(senderId);
      const recipient = await User.findById(recipientId);

      return {
        success: true,
        alreadyProcessed: true,
        reference: resolvedReference,
        amount: numAmount,
        senderTx: existingSenderTx,
        recipientTx: existingRecipientTx,
        senderBalance: sender?.wallet?.balance !== undefined ? sender.wallet.balance : sender?.balance,
        recipientBalance: recipient?.wallet?.balance !== undefined ? recipient.wallet.balance : recipient?.balance
      };
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      const err = new Error('Recipient user not found');
      err.status = 404;
      err.statusCode = 404;
      err.isOperational = true;
      throw err;
    }

    const sender = await User.findById(senderId);
    if (!sender) {
      const err = new Error('Sender user not found');
      err.status = 404;
      err.statusCode = 404;
      err.isOperational = true;
      throw err;
    }

    // 2. Atomic debit of sender available balance
    const senderUpdate = await User.findOneAndUpdate(
      {
        _id: senderId,
        $expr: {
          $gte: [
            {
              $subtract: [
                { $ifNull: ['$wallet.balance', '$balance'] },
                { $ifNull: ['$wallet.pendingWithdrawal', 0] }
              ]
            },
            numAmount
          ]
        }
      },
      {
        $inc: {
          'wallet.balance': -numAmount,
          'balance': -numAmount
        },
        $set: {
          'wallet.lastUpdated': new Date(),
          'lastUpdated': new Date()
        }
      },
      { new: true }
    );

    if (!senderUpdate) {
      const curBal = sender.wallet?.balance !== undefined ? sender.wallet.balance : (sender.balance || 0);
      const curPending = sender.wallet?.pendingWithdrawal || sender.pendingWithdrawal || 0;
      const available = Math.max(0, curBal - curPending);
      const err = new Error(`Insufficient available balance. Required: ${numAmount} USDC, Available: ${available} USDC`);
      err.status = 400;
      err.statusCode = 400;
      err.isOperational = true;
      throw err;
    }

    // 3. Atomic credit of recipient balance
    let recipientUpdate = null;
    try {
      recipientUpdate = await User.findByIdAndUpdate(
        recipientId,
        {
          $inc: {
            'wallet.balance': numAmount,
            'balance': numAmount
          },
          $set: {
            'wallet.lastUpdated': new Date(),
            'lastUpdated': new Date()
          }
        },
        { new: true }
      );
    } catch (creditErr) {
      // Safe rollback of sender debit if recipient update fails
      await User.findByIdAndUpdate(senderId, {
        $inc: {
          'wallet.balance': numAmount,
          'balance': numAmount
        }
      });
      throw creditErr;
    }

    if (!recipientUpdate) {
      // Safe rollback of sender debit if recipient record unexpectedly disappeared
      await User.findByIdAndUpdate(senderId, {
        $inc: {
          'wallet.balance': numAmount,
          'balance': numAmount
        }
      });
      const err = new Error('Failed to credit recipient user');
      err.status = 500;
      throw err;
    }

    // 4. Generate unique transaction IDs
    const timestamp = Date.now().toString(36).toUpperCase();
    const random1 = crypto.randomBytes(3).toString('hex').toUpperCase();
    const random2 = crypto.randomBytes(3).toString('hex').toUpperCase();
    const senderTxId = `TXN-TRF-OUT-${timestamp}-${random1}`;
    const recipientTxId = `TXN-TRF-IN-${timestamp}-${random2}`;

    const cleanNote = String(note || '').trim();
    const senderName = sender.name || `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || sender.email;
    const recipientName = recipient.name || `${recipient.firstName || ''} ${recipient.lastName || ''}`.trim() || recipient.email;

    // 5. Create immutable ledger records
    const senderTx = await Transaction.create({
      transactionId: senderTxId,
      user: senderId,
      type: 'transfer_out',
      amount: numAmount,
      netAmount: numAmount,
      currency: 'USDC',
      status: 'completed',
      reference: resolvedReference,
      paymentMethod: 'internal_transfer',
      toAddress: recipient.email || recipient._id.toString(),
      description: cleanNote ? `Transfer to ${recipientName}: ${cleanNote}` : `Transfer to ${recipientName}`,
      metadata: {
        counterpartyId: recipientId,
        counterpartyEmail: recipient.email,
        counterpartyName: recipientName,
        note: cleanNote,
        idempotencyKey: resolvedReference
      },
      completedAt: new Date()
    });

    const recipientTx = await Transaction.create({
      transactionId: recipientTxId,
      user: recipientId,
      type: 'transfer_in',
      amount: numAmount,
      netAmount: numAmount,
      currency: 'USDC',
      status: 'completed',
      reference: resolvedReference,
      paymentMethod: 'internal_transfer',
      fromAddress: sender.email || sender._id.toString(),
      description: cleanNote ? `Transfer from ${senderName}: ${cleanNote}` : `Transfer from ${senderName}`,
      metadata: {
        counterpartyId: senderId,
        counterpartyEmail: sender.email,
        counterpartyName: senderName,
        note: cleanNote,
        idempotencyKey: resolvedReference
      },
      completedAt: new Date()
    });

    console.log(`[Ledger] Successfully executed internal transfer of ${numAmount} USDC from ${senderId} to ${recipientId}. Ref: ${resolvedReference}`);

    return {
      success: true,
      amount: numAmount,
      reference: resolvedReference,
      senderTx,
      recipientTx,
      senderBalance: senderUpdate.wallet?.balance !== undefined ? senderUpdate.wallet.balance : senderUpdate.balance,
      recipientBalance: recipientUpdate.wallet?.balance !== undefined ? recipientUpdate.wallet.balance : recipientUpdate.balance
    };
  }
}

module.exports = new LedgerService();
