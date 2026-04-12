/**
 * Platform Fee Accumulator Service
 * Accumulates small platform fees until they reach HostFi minimum (1 USDC)
 * Then batches them for withdrawal to platform wallet
 */

const Transaction = require('../models/Transaction');
const User = require('../models/User');
const hostfiService = require('./hostfiService');

const PLATFORM_WALLET_ADDRESS = process.env.PLATFORM_WALLET_ADDRESS || 'Bqc5Cf9UAr1rM27HgDDYERSHJAcgfzVH2MnBn7sSdkTg';
const HOSTFI_MINIMUM_WITHDRAWAL = 1; // HostFi requires minimum 1 USDC

class PlatformFeeAccumulator {
  constructor() {
    this.accumulatedFees = new Map(); // userId -> accumulated amount
  }

  /**
   * Add platform fee to accumulator for a user
   * @param {string} userId - Client user ID (who paid the fee)
   * @param {string} bookingId - Booking/Project ID
   * @param {number} amount - Fee amount
   * @param {string} currency - Currency (USDC)
   * @param {string} clientAssetId - HostFi asset ID for withdrawal
   * @returns {Promise<Object>} Result of accumulation
   */
  async addFee(userId, bookingId, amount, currency = 'USDC', clientAssetId) {
    try {
      console.log(`[PlatformFeeAccumulator] Adding fee: ${amount} ${currency} for booking ${bookingId}`);

      // Create transaction record for the fee
      const feeTx = await Transaction.create({
        transactionId: `PLATFORM-FEE-${Date.now()}`,
        user: userId,
        booking: bookingId,
        type: 'platform_fee',
        amount: amount,
        currency: currency,
        status: 'pending_accumulation', // Will be updated when withdrawn
        description: `Platform fee (accumulating until ${HOSTFI_MINIMUM_WITHDRAWAL} ${currency})`,
        metadata: {
          accumulated: true,
          clientAssetId: clientAssetId,
          batchReady: false
        }
      });

      // Check current accumulated amount for this user
      const currentAccumulated = await this.getAccumulatedAmount(userId, currency);
      const newTotal = currentAccumulated + amount;

      console.log(`[PlatformFeeAccumulator] Current accumulated: ${currentAccumulated}, New total: ${newTotal}`);

      // Check if we have enough to withdraw
      if (newTotal >= HOSTFI_MINIMUM_WITHDRAWAL) {
        console.log(`[PlatformFeeAccumulator] Threshold reached! Withdrawing ${newTotal} ${currency}`);
        
        // Execute withdrawal
        const withdrawalResult = await this.withdrawAccumulatedFees(userId, currency, clientAssetId);
        
        return {
          accumulated: newTotal,
          withdrawn: true,
          withdrawalResult: withdrawalResult,
          transaction: feeTx
        };
      }

      // Not enough yet, just accumulate
      return {
        accumulated: newTotal,
        withdrawn: false,
        remainingToThreshold: HOSTFI_MINIMUM_WITHDRAWAL - newTotal,
        transaction: feeTx
      };

    } catch (error) {
      console.error(`[PlatformFeeAccumulator] Error adding fee:`, error.message);
      throw error;
    }
  }

  /**
   * Get total accumulated fees for a user
   * @param {string} userId - User ID
   * @param {string} currency - Currency
   * @returns {Promise<number>} Accumulated amount
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
   * Withdraw accumulated fees to platform wallet
   * @param {string} userId - User ID whose fees to withdraw
   * @param {string} currency - Currency
   * @param {string} clientAssetId - HostFi asset ID
   * @returns {Promise<Object>} Withdrawal result
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

      console.log(`[PlatformFeeAccumulator] Withdrawing ${amount} ${currency} to platform wallet`);

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

      console.log(`[PlatformFeeAccumulator] Withdrawal successful: ${withdrawal.reference || withdrawal.id}`);

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
   * @param {string} userId - User ID (optional, if null withdraws all users)
   * @returns {Promise<Array>} Results for each withdrawal
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
          // Get user's asset ID
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
}

module.exports = new PlatformFeeAccumulator();
