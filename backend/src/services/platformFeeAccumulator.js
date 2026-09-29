/**
 * Platform Fee Accumulator Service
 * Records platform fee ledger entries in DB for platform accounting.
 */

const Transaction = require('../models/Transaction');

class PlatformFeeAccumulator {
  /**
   * Add platform fee — record in the database ledger
   */
  async addFee(userId, bookingId, amount, currency = 'USDC') {
    try {
      console.log(`[PlatformFeeAccumulator] Recording fee: ${amount} ${currency} for booking ${bookingId}`);

      const feeTx = await Transaction.create({
        transactionId: `PLATFORM-FEE-${Date.now()}`,
        user: userId,
        booking: bookingId,
        type: 'platform_fee',
        amount: amount,
        currency: currency,
        status: 'completed',
        description: `Platform fee (10%)`,
        completedAt: new Date(),
        metadata: {
          recordedAt: new Date().toISOString()
        }
      });

      const globalPending = await this.getGlobalPendingAmount(currency);
      console.log(`[PlatformFeeAccumulator] ✓ Fee recorded. Total platform fees: ${globalPending} ${currency}`);

      return {
        success: true,
        amount: amount,
        transaction: feeTx
      };

    } catch (error) {
      console.error(`[PlatformFeeAccumulator] Error recording fee:`, error.message);
      throw error;
    }
  }

  /**
   * Get total platform fees recorded
   */
  async getGlobalPendingAmount(currency = 'USDC') {
    const result = await Transaction.aggregate([
      {
        $match: {
          type: 'platform_fee',
          currency: currency,
          status: 'completed'
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
}

module.exports = new PlatformFeeAccumulator();
