/**
 * HostFi Reconciliation Service
 * 
 * HYBRID APPROACH:
 * 1. HostFi holds all funds in a shared B2B pool
 * 2. We track per-user balances in our DB
 * 3. This service reconciles DB records with HostFi API
 * 
 * FLOW:
 * - Deposits: HostFi webhook → verify via API → create DB Transaction
 * - Balance: Calculate from DB transactions (fast), verify with HostFi (accurate)
 * - Withdrawals: Check DB balance → call HostFi → record in DB
 */

const hostfiService = require('./hostfiService');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

class HostFiReconciliationService {
  /**
   * Verify a deposit by checking HostFi API
   * @param {string} hostfiReference - HostFi transaction reference
   * @param {string} userId - Our user ID (customId)
   * @returns {Promise<Object>} Verified deposit details or null
   */
  async verifyDeposit(hostfiReference, userId) {
    try {
      console.log(`[Reconcile] Verifying deposit ${hostfiReference} for user ${userId}`);

      // Try to find the transaction in HostFi
      const tx = await hostfiService.getTransactionByReference(hostfiReference);
      
      if (!tx) {
        console.warn(`[Reconcile] Deposit ${hostfiReference} not found in HostFi`);
        return null;
      }

      // Verify it belongs to this user
      const txCustomId = tx.customId || tx.metadata?.customId || tx.userId;
      if (txCustomId && txCustomId !== userId) {
        console.warn(`[Reconcile] Deposit ${hostfiReference} belongs to ${txCustomId}, not ${userId}`);
        return null;
      }

      const verified = {
        reference: hostfiReference,
        amount: parseFloat(tx.amount?.value || tx.amount || 0),
        currency: (tx.currency?.code || tx.currency || 'USDC').toUpperCase(),
        status: tx.status,
        userId: userId,
        verified: true
      };

      console.log(`[Reconcile] ✓ Deposit verified: ${verified.amount} ${verified.currency}`);
      return verified;

    } catch (error) {
      console.error(`[Reconcile] Verification failed:`, error.message);
      return null;
    }
  }

  /**
   * Get user's real balance from HostFi
   * For B2B: This fetches collection transactions and calculates
   * @param {string} userId - User ID
   * @returns {Promise<Object>} { usdcBalance, ngnBalance, totalDeposits, totalWithdrawals }
   */
  async getHostFiBalanceForUser(userId) {
    try {
      console.log(`[Reconcile] Fetching HostFi balance for user ${userId}`);

      // Get user's collection addresses
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      // Fetch collection transactions for this user
      const collections = await hostfiService.getCollectionTransactions({
        pageSize: 1000,
        status: 'SUCCESS'
      }).catch(() => ({ transactions: [] }));

      const txs = collections.transactions || collections.data?.transactions || [];
      
      // Filter to this user's transactions
      const userTxs = txs.filter(tx => {
        const txCustomId = tx.customId || tx.metadata?.customId;
        return txCustomId === userId;
      });

      let totalDeposited = 0;
      let totalWithdrawn = 0;

      for (const tx of userTxs) {
        const amount = parseFloat(tx.amount?.value || tx.amount || 0);
        const direction = tx.direction || tx.type;
        
        if (direction === 'CREDIT' || direction === 'DEPOSIT') {
          totalDeposited += amount;
        } else if (direction === 'DEBIT' || direction === 'WITHDRAWAL') {
          totalWithdrawn += amount;
        }
      }

      const netBalance = totalDeposited - totalWithdrawn;

      console.log(`[Reconcile] HostFi balance for ${userId}: deposited=${totalDeposited}, withdrawn=${totalWithdrawn}, net=${netBalance}`);

      return {
        usdcBalance: Math.max(0, netBalance),
        totalDeposits: totalDeposited,
        totalWithdrawals: totalWithdrawn,
        transactionCount: userTxs.length
      };

    } catch (error) {
      console.error(`[Reconcile] Failed to get HostFi balance:`, error.message);
      return { usdcBalance: 0, totalDeposits: 0, totalWithdrawals: 0, transactionCount: 0 };
    }
  }

  /**
   * Reconcile DB balance with HostFi
   * If they don't match, log warning (don't auto-correct without admin review)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Reconciliation result
   */
  async reconcileUser(userId) {
    try {
      console.log(`[Reconcile] Starting reconciliation for user ${userId}`);

      // Get DB balance
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      const dbBalance = parseFloat(user.wallet.balance) || 0;

      // Get HostFi balance
      const hostfiData = await this.getHostFiBalanceForUser(userId);
      const hostfiBalance = hostfiData.usdcBalance;

      // Compare
      const diff = Math.abs(dbBalance - hostfiBalance);
      const matched = diff < 0.01;

      const result = {
        userId,
        dbBalance,
        hostfiBalance,
        difference: diff,
        matched,
        hostfiDeposits: hostfiData.totalDeposits,
        hostfiWithdrawals: hostfiData.totalWithdrawals,
        timestamp: new Date().toISOString()
      };

      if (matched) {
        console.log(`[Reconcile] ✓ Balances match for ${userId}: ${dbBalance} USDC`);
      } else {
        console.warn(`[Reconcile] ⚠ BALANCE MISMATCH for ${userId}: DB=${dbBalance}, HostFi=${hostfiBalance}, Diff=${diff}`);
      }

      return result;

    } catch (error) {
      console.error(`[Reconcile] Reconciliation failed:`, error.message);
      throw error;
    }
  }

  /**
   * Full reconciliation for all users
   * Run this daily or weekly
   */
  async reconcileAll() {
    console.log('[Reconcile] Starting full reconciliation...');
    
    const users = await User.find({}, '_id email firstName');
    const results = [];

    for (const user of users) {
      try {
        const result = await this.reconcileUser(user._id);
        results.push(result);
      } catch (error) {
        results.push({
          userId: user._id,
          error: error.message,
          matched: false
        });
      }
    }

    const matched = results.filter(r => r.matched).length;
    const mismatched = results.filter(r => !r.matched && !r.error).length;
    const errors = results.filter(r => r.error).length;

    console.log(`[Reconcile] Complete: ${matched} matched, ${mismatched} mismatched, ${errors} errors`);

    return { results, summary: { total: results.length, matched, mismatched, errors } };
  }
}

module.exports = new HostFiReconciliationService();
