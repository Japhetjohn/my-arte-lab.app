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
