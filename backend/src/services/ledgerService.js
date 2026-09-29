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

    // 2. Create authoritative completed transaction in the ledger
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    const transactionId = `TXN-DEP-${timestamp}-${random}`;

    const ledgerTx = await Transaction.create({
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

    console.log(`[Ledger] Successfully credited ${creditAmount} USDC to user ${lockedFundingTx.user}. New balance: ${userUpdate?.wallet?.balance || userUpdate?.balance} USDC. LedgerTx: ${transactionId}`);

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
      throw new Error('Valid positive withdrawal amount is required for balance reservation');
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
      throw new Error(`Insufficient available balance. Required: ${withdrawalAmount} USDC, Available: ${available} USDC`);
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

      if (['deposit', 'earning', 'bonus', 'onramp', 'refund'].includes(tx.type)) {
        totalCredits += amt;
      } else if (['withdrawal', 'payment', 'escrow', 'verification', 'offramp', 'platform_fee'].includes(tx.type)) {
        totalDebits += amt;
      }
    }

    const calculatedBalance = Math.max(0, parseFloat((totalCredits - totalDebits).toFixed(6)));

    return {
      calculatedBalance,
      totalCredits: parseFloat(totalCredits.toFixed(6)),
      totalDebits: parseFloat(totalDebits.toFixed(6))
    };
  }

  /**
   * Reconcile and synchronize user's dual balance fields with the authoritative ledger.
   * Ensures wallet.balance and balance are identical and match completed transactions.
   * 
   * @param {string|ObjectId} userId
   * @returns {Promise<{ synced: boolean, previousBalance: number, newBalance: number }>}
   */
  async syncUserBalance(userId) {
    const { calculatedBalance } = await this.calculateAuthoritativeBalance(userId);
    const user = await User.findById(userId);
    if (!user) return { synced: false, error: 'User not found' };

    const previousBalance = user.wallet?.balance || user.balance || 0;

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
      newBalance: calculatedBalance
    };
  }
}

module.exports = new LedgerService();
