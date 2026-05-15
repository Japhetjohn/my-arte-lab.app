/**
 * Platform Fee Accumulator Service
 * 
 * ARCHITECTURE:
 * 1. Primary: Direct Solana SPL Token transfers (no minimum, instant)
 * 2. Fallback: HostFi withdrawals (1 USDC minimum, batched)
 * 
 * When a booking completes:
 * - Creator gets 90% via HostFi withdrawal (their preferred method)
 * - Platform fee (10%) is sent DIRECTLY to platform wallet via Solana SPL Token transfer
 *   (bypasses HostFi's 1 USDC minimum entirely)
 */

const Transaction = require('../models/Transaction');
const User = require('../models/User');
const hostfiService = require('./hostfiService');
const solanaTransferService = require('./solanaTransferService');

const PLATFORM_WALLET_ADDRESS = process.env.PLATFORM_WALLET_ADDRESS || '5JV7n8AyDDdgrxhk5Q1wrEdfounkxYchEMSKStLfo48h';
const HOSTFI_MINIMUM_WITHDRAWAL = 1; // HostFi requires minimum 1 USDC

class PlatformFeeAccumulator {
  constructor() {
    this.accumulatedFees = new Map();
    // Initialize Solana transfer service on startup
    solanaTransferService.init();
  }

  /**
   * Add platform fee — uses DIRECT Solana transfer (no minimum!)
   * Falls back to HostFi accumulation if Solana transfer fails
   * 
   * @param {string} userId - Client user ID (who paid the fee)
   * @param {string} bookingId - Booking/Project ID
   * @param {number} amount - Fee amount (can be ANY amount, e.g., $0.10)
   * @param {string} currency - Currency (USDC)
   * @param {string} clientAssetId - HostFi asset ID (for fallback only)
   * @returns {Promise<Object>} Result of fee collection
   */
  async addFee(userId, bookingId, amount, currency = 'USDC', clientAssetId) {
    try {
      console.log(`[PlatformFeeAccumulator] Adding fee: ${amount} ${currency} for booking ${bookingId}`);

      // ─── PRIMARY: Direct Solana SPL Token Transfer ───
      // This bypasses HostFi's 1 USDC minimum entirely!
      if (solanaTransferService.isReady()) {
        try {
          console.log(`[PlatformFeeAccumulator] Using DIRECT Solana transfer for ${amount} USDC`);
          
          const transferResult = await solanaTransferService.transferUSDC(
            PLATFORM_WALLET_ADDRESS,
            amount,
            `Platform fee: ${bookingId}`
          );

          // Create completed transaction record
          const feeTx = await Transaction.create({
            transactionId: `PLATFORM-FEE-SOLANA-${Date.now()}`,
            user: userId,
            booking: bookingId,
            type: 'platform_fee',
            amount: amount,
            currency: currency,
            status: 'completed',
            description: `Platform fee via Solana direct transfer`,
            transactionHash: transferResult.signature,
            metadata: {
              transferMethod: 'solana_direct',
              solanaSignature: transferResult.signature,
              explorerUrl: transferResult.explorerUrl,
              platformWallet: PLATFORM_WALLET_ADDRESS
            }
          });

          console.log(`[PlatformFeeAccumulator] ✓ Direct Solana transfer complete: ${transferResult.signature}`);

          // Notify admins
          this._notifyAdminFeeCollected(userId, amount, 'solana_direct', transferResult.signature);

          return {
            success: true,
            method: 'solana_direct',
            amount: amount,
            signature: transferResult.signature,
            explorerUrl: transferResult.explorerUrl,
            transaction: feeTx,
            accumulated: 0, // Fee was sent immediately, not accumulated
            withdrawn: true
          };

        } catch (solanaError) {
          console.error(`[PlatformFeeAccumulator] Solana transfer failed, falling back to HostFi:`, solanaError.message);
          // Fall through to HostFi accumulation
        }
      }

      // ─── FALLBACK: HostFi Accumulation ───
      console.log(`[PlatformFeeAccumulator] Using HostFi accumulation fallback for ${amount} USDC`);
      return await this._accumulateViaHostFi(userId, bookingId, amount, currency, clientAssetId);

    } catch (error) {
      console.error(`[PlatformFeeAccumulator] Error adding fee:`, error.message);
      throw error;
    }
  }

  /**
   * HostFi accumulation fallback (original behavior)
   */
  async _accumulateViaHostFi(userId, bookingId, amount, currency, clientAssetId) {
    // Create transaction record for the fee
    const feeTx = await Transaction.create({
      transactionId: `PLATFORM-FEE-${Date.now()}`,
      user: userId,
      booking: bookingId,
      type: 'platform_fee',
      amount: amount,
      currency: currency,
      status: 'pending_accumulation',
      description: `Platform fee (accumulating until ${HOSTFI_MINIMUM_WITHDRAWAL} ${currency})`,
      metadata: {
        accumulated: true,
        clientAssetId: clientAssetId,
        batchReady: false,
        transferMethod: 'hostfi_accumulation'
      }
    });

    // Check current accumulated amount for this user
    const currentAccumulated = await this.getAccumulatedAmount(userId, currency);
    const newTotal = currentAccumulated + amount;

    console.log(`[PlatformFeeAccumulator] Current accumulated: ${currentAccumulated}, New total: ${newTotal}`);

    // Notify admins about accumulated fee
    this._notifyAdminFeeAccumulated(userId, amount, newTotal);

    // Check if we have enough to withdraw via HostFi
    if (newTotal >= HOSTFI_MINIMUM_WITHDRAWAL) {
      console.log(`[PlatformFeeAccumulator] HostFi threshold reached! Withdrawing ${newTotal} ${currency}`);
      
      const withdrawalResult = await this.withdrawAccumulatedFees(userId, currency, clientAssetId);
      
      return {
        accumulated: newTotal,
        withdrawn: true,
        withdrawalResult: withdrawalResult,
        transaction: feeTx,
        method: 'hostfi_batch'
      };
    }

    // Not enough yet, just accumulate
    return {
      accumulated: newTotal,
      withdrawn: false,
      remainingToThreshold: HOSTFI_MINIMUM_WITHDRAWAL - newTotal,
      transaction: feeTx,
      method: 'hostfi_accumulation'
    };
  }

  /**
   * Get total accumulated fees for a user (HostFi only)
   */
  async getAccumulatedAmount(userId, currency = 'USDC') {
    const result = await Transaction.aggregate([
      {
        $match: {
          user: require('mongoose').Types.ObjectId(userId),
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
   * Withdraw accumulated fees to platform wallet via HostFi
   */
  async withdrawAccumulatedFees(userId, currency = 'USDC', clientAssetId) {
    try {
      const amount = await this.getAccumulatedAmount(userId, currency);
      
      if (amount < HOSTFI_MINIMUM_WITHDRAWAL) {
        return {
          skipped: true,
          reason: `Amount ${amount} below minimum ${HOSTFI_MINIMUM_WITHDRAWAL}`,
          accumulated: amount
        };
      }

      console.log(`[PlatformFeeAccumulator] Withdrawing ${amount} ${currency} to platform wallet via HostFi`);

      // Execute withdrawal via HostFi
      const withdrawal = await hostfiService.initiateWithdrawal({
        walletAssetId: clientAssetId,
        amount: amount,
        currency: currency,
        methodId: 'CRYPTO',
        recipient: {
          type: 'CRYPTO',
          method: 'CRYPTO',
          currency: currency,
          address: PLATFORM_WALLET_ADDRESS,
          network: 'SOL',
          country: 'NG'
        },
        clientReference: `PLATFORM-FEE-BATCH-${userId.slice(-8)}-${Date.now()}`,
        memo: `Accumulated platform fees batch`
      });

      console.log(`[PlatformFeeAccumulator] HostFi withdrawal successful: ${withdrawal.reference || withdrawal.id}`);

      // Update all pending fee transactions for this user
      const updateResult = await Transaction.updateMany(
        {
          user: userId,
          type: 'platform_fee',
          currency: currency,
          status: 'pending_accumulation'
        },
        {
          $set: {
            status: 'completed',
            transactionHash: withdrawal.reference || withdrawal.id,
            'metadata.batchWithdrawn': true,
            'metadata.batchReference': withdrawal.reference || withdrawal.id,
            'metadata.batchAmount': amount,
            updatedAt: new Date()
          }
        }
      );

      console.log(`[PlatformFeeAccumulator] Updated ${updateResult.modifiedCount} fee transactions`);

      // Notify admins
      this._notifyAdminFeeWithdrawn(userId, amount, withdrawal.reference || withdrawal.id);

      return {
        success: true,
        reference: withdrawal.reference || withdrawal.id,
        amount: amount,
        transactionsUpdated: updateResult.modifiedCount
      };

    } catch (error) {
      console.error(`[PlatformFeeAccumulator] Withdrawal failed:`, error.message);
      throw error;
    }
  }

  /**
   * Force withdrawal of all accumulated fees (for admin use)
   */
  async forceWithdrawAll(userId = null) {
    try {
      const matchStage = userId 
        ? { user: require('mongoose').Types.ObjectId(userId) }
        : {};

      // Get all users with accumulated fees
      const usersWithFees = await Transaction.aggregate([
        {
          $match: {
            ...matchStage,
            type: 'platform_fee',
            status: 'pending_accumulation'
          }
        },
        {
          $group: {
            _id: '$user',
            totalAmount: { $sum: '$amount' },
            currency: { $first: '$currency' }
          }
        }
      ]);

      const results = [];

      for (const userFee of usersWithFees) {
        if (userFee.totalAmount >= HOSTFI_MINIMUM_WITHDRAWAL) {
          const user = await User.findById(userFee._id);
          const usdcAsset = user?.wallet?.hostfiWalletAssets?.find(a => a.currency === 'USDC');
          
          if (usdcAsset?.assetId) {
            try {
              const result = await this.withdrawAccumulatedFees(
                userFee._id.toString(),
                userFee.currency,
                usdcAsset.assetId
              );
              results.push({ userId: userFee._id, ...result });
            } catch (err) {
              results.push({ 
                userId: userFee._id, 
                error: err.message,
                amount: userFee.totalAmount 
              });
            }
          }
        }
      }

      return results;

    } catch (error) {
      console.error(`[PlatformFeeAccumulator] Force withdraw failed:`, error.message);
      throw error;
    }
  }

  // ─── Admin Notifications ───

  async _notifyAdminFeeCollected(userId, amount, method, signature) {
    try {
      const adminNotificationService = require('./adminNotificationService');
      const user = await User.findById(userId);
      if (user) {
        await adminNotificationService.notifyPlatformFeeCollected(user, amount, method, signature);
      }
    } catch (e) {
      console.error('[PlatformFeeAccumulator] Admin notification failed:', e.message);
    }
  }

  async _notifyAdminFeeAccumulated(userId, amount, newTotal) {
    try {
      const adminNotificationService = require('./adminNotificationService');
      const user = await User.findById(userId);
      if (user) {
        await adminNotificationService.notifyAccumulatedFees(user, amount, newTotal);
      }
    } catch (e) {
      console.error('[PlatformFeeAccumulator] Admin notification failed:', e.message);
    }
  }

  async _notifyAdminFeeWithdrawn(userId, amount, reference) {
    try {
      const adminNotificationService = require('./adminNotificationService');
      const user = await User.findById(userId);
      if (user) {
        await adminNotificationService.notifyFeeWithdrawn(user, amount, reference);
      }
    } catch (e) {
      console.error('[PlatformFeeAccumulator] Admin notification failed:', e.message);
    }
  }
}

module.exports = new PlatformFeeAccumulator();
