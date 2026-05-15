/**
 * Platform Fee Accumulator Service
 * 
 * FLOW:
 * 1. Throughout the day: Each booking's 10% platform fee is recorded in DB
 *    (status: 'pending_accumulation')
 * 2. End of day (midnight): Cron job runs and batches ALL pending fees
 * 3. Single HostFi withdrawal from shared pool → platform wallet
 * 4. All fee records updated to 'completed'
 * 
 * No Solana. No immediate transfers. Just record + batch daily.
 */

const Transaction = require('../models/Transaction');
const User = require('../models/User');
const hostfiService = require('./hostfiService');

const PLATFORM_WALLET_ADDRESS = process.env.PLATFORM_WALLET_ADDRESS || '5JV7n8AyDDdgrxhk5Q1wrEdfounkxYchEMSKStLfo48h';
const HOSTFI_MINIMUM_WITHDRAWAL = 1; // HostFi requires minimum 1 USDC

class PlatformFeeAccumulator {
  constructor() {
    this.accumulatedFees = new Map();
  }

  /**
   * Add platform fee — just RECORD it in the database
   * The actual withdrawal happens at end-of-day via cron job
   * 
   * @param {string} userId - Client user ID (who paid the fee)
   * @param {string} bookingId - Booking ID
   * @param {number} amount - Fee amount (e.g., $1 from a $10 booking)
   * @param {string} currency - Currency (USDC)
   * @returns {Promise<Object>} Result
   */
  async addFee(userId, bookingId, amount, currency = 'USDC') {
    try {
      console.log(`[PlatformFeeAccumulator] Recording fee: ${amount} ${currency} for booking ${bookingId}`);

      // Create transaction record — just a ledger entry, no actual transfer yet
      const feeTx = await Transaction.create({
        transactionId: `PLATFORM-FEE-${Date.now()}`,
        user: userId,
        booking: bookingId,
        type: 'platform_fee',
        amount: amount,
        currency: currency,
        status: 'pending_accumulation',
        description: `Platform fee (10%) — queued for end-of-day batch withdrawal`,
        metadata: {
          accumulated: true,
          batchReady: false,
          recordedAt: new Date().toISOString()
        }
      });

      // Get total pending across ALL users
      const globalPending = await this.getGlobalPendingAmount(currency);

      console.log(`[PlatformFeeAccumulator] ✓ Fee recorded. Global pending: ${globalPending} ${currency}`);

      return {
        success: true,
        amount: amount,
        globalPending: globalPending,
        transaction: feeTx,
        message: `Fee recorded. Will be withdrawn at end of day if total >= $1`
      };

    } catch (error) {
      console.error(`[PlatformFeeAccumulator] Error recording fee:`, error.message);
      throw error;
    }
  }

  /**
   * Get total pending platform fees across ALL users
   */
  async getGlobalPendingAmount(currency = 'USDC') {
    const result = await Transaction.aggregate([
      {
        $match: {
          type: 'platform_fee',
          currency: currency,
          status: 'pending_accumulation'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    return result.length > 0 ? result[0].total : 0;
  }

  /**
   * Get all pending fee transactions
   */
  async getPendingFees(currency = 'USDC') {
    return await Transaction.find({
      type: 'platform_fee',
      currency: currency,
      status: 'pending_accumulation'
    }).sort({ createdAt: 1 }).lean();
  }

  /**
   * DAILY BATCH WITHDRAWAL — Called by cron job at midnight
   * 
   * 1. Sums ALL pending platform fees across ALL users
   * 2. If total >= $1: does single HostFi withdrawal to platform wallet
   * 3. Marks all fee records as 'completed'
   * 4. If total < $1: leaves them pending for tomorrow
   */
  async processDailyBatchWithdrawal() {
    console.log(`[PlatformFeeAccumulator] ═══════════════════════════════════════════════`);
    console.log(`[PlatformFeeAccumulator] DAILY BATCH WITHDRAWAL — ${new Date().toISOString()}`);
    console.log(`[PlatformFeeAccumulator] ═══════════════════════════════════════════════`);

    try {
      // Step 1: Get total pending fees
      const totalPending = await this.getGlobalPendingAmount('USDC');
      console.log(`[PlatformFeeAccumulator] Total pending fees: ${totalPending} USDC`);

      if (totalPending < HOSTFI_MINIMUM_WITHDRAWAL) {
        console.log(`[PlatformFeeAccumulator] Total ${totalPending} below minimum ${HOSTFI_MINIMUM_WITHDRAWAL}. Skipping.`);
        console.log(`[PlatformFeeAccumulator] Fees will accumulate and be withdrawn tomorrow.`);
        return {
          skipped: true,
          reason: `Total ${totalPending} USDC below minimum ${HOSTFI_MINIMUM_WITHDRAWAL} USDC`,
          totalPending,
          message: 'Fees will roll over to tomorrow'
        };
      }

      // Step 2: Find a user's USDC asset ID to use for the withdrawal
      // (All users share the same HostFi pool, so any user's asset works)
      const anyUser = await User.findOne({
        'wallet.hostfiWalletAssets': {
          $elemMatch: { currency: 'USDC', assetId: { $exists: true } }
        }
      });

      if (!anyUser) {
        throw new Error('No user found with USDC HostFi asset. Cannot withdraw.');
      }

      const usdcAsset = anyUser.wallet.hostfiWalletAssets.find(a => a.currency === 'USDC');
      if (!usdcAsset?.assetId) {
        throw new Error('No USDC asset ID found. Cannot withdraw.');
      }

      console.log(`[PlatformFeeAccumulator] Using asset: ${usdcAsset.assetId.slice(0, 12)}...`);
      console.log(`[PlatformFeeAccumulator] Withdrawing ${totalPending} USDC to platform wallet...`);

      // Step 3: Execute single HostFi withdrawal
      const withdrawal = await hostfiService.initiateWithdrawal({
        walletAssetId: usdcAsset.assetId,
        amount: totalPending,
        currency: 'USDC',
        methodId: 'CRYPTO',
        recipient: {
          type: 'CRYPTO',
          method: 'CRYPTO',
          currency: 'USDC',
          address: PLATFORM_WALLET_ADDRESS,
          network: 'SOL',
          country: 'NG'
        },
        clientReference: `PLATFORM-DAILY-BATCH-${Date.now()}`,
        memo: `Daily platform fees batch`
      });

      const reference = withdrawal.reference || withdrawal.id;
      console.log(`[PlatformFeeAccumulator] ✓ HostFi withdrawal: ${reference}`);

      // Step 4: Update ALL pending fee transactions to completed
      const pendingFees = await this.getPendingFees('USDC');
      const feeIds = pendingFees.map(tx => tx._id.toString());

      const updateResult = await Transaction.updateMany(
        {
          _id: { $in: feeIds }
        },
        {
          $set: {
            status: 'completed',
            transactionHash: reference,
            'metadata.batchWithdrawn': true,
            'metadata.batchReference': reference,
            'metadata.batchAmount': totalPending,
            'metadata.withdrawnAt': new Date().toISOString(),
            updatedAt: new Date()
          }
        }
      );

      console.log(`[PlatformFeeAccumulator] ✓ Updated ${updateResult.modifiedCount} fee records to completed`);

      // Notify admins
      this._notifyAdminDailyWithdrawn(totalPending, reference, updateResult.modifiedCount);

      console.log(`[PlatformFeeAccumulator] ═══════════════════════════════════════════════`);
      console.log(`[PlatformFeeAccumulator] DAILY BATCH COMPLETE`);
      console.log(`[PlatformFeeAccumulator] ═══════════════════════════════════════════════`);

      return {
        success: true,
        reference: reference,
        amount: totalPending,
        feesCount: updateResult.modifiedCount,
        message: `Successfully withdrawn ${totalPending} USDC platform fees`
      };

    } catch (error) {
      console.error(`[PlatformFeeAccumulator] Daily batch failed:`, error.message);
      throw error;
    }
  }

  /**
   * Force immediate withdrawal (for admin use)
   */
  async forceWithdrawNow() {
    console.log(`[PlatformFeeAccumulator] Admin triggered immediate withdrawal`);
    return await this.processDailyBatchWithdrawal();
  }

  // ─── Admin Notifications ───

  async _notifyAdminDailyWithdrawn(amount, reference, count) {
    try {
      const adminNotificationService = require('./adminNotificationService');
      // Find an admin user to use as sender context, or create a placeholder
      const adminUser = await User.findOne({ role: 'admin' }) || 
                        await User.findOne().sort({ createdAt: 1 });
      
      if (adminUser) {
        await adminNotificationService.notifyFeeWithdrawn(adminUser, amount, reference);
      }
    } catch (e) {
      console.error('[PlatformFeeAccumulator] Admin notification failed:', e.message);
    }
  }
}

module.exports = new PlatformFeeAccumulator();
