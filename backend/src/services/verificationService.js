const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { ErrorHandler } = require('../utils/errorHandler');
const {
  FOUNDER_IDS,
  FOUNDER_EMAILS,
  isFounder,
  isUserVerified,
  getVerificationDetails,
  addOneCalendarMonth
} = require('../utils/verificationHelper');

const VERIFICATION_PRICE = 1.00; // 1 USDC per month
const VERIFICATION_CURRENCY = 'USDC';

function generateTransactionId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `TXN-VER-${timestamp}-${random}`;
}

class VerificationService {
  /**
   * Subscribe or renew user verification badge ($1 USDC/month)
   * Deducts $1 from wallet, creates completed transaction, updates subscription expiration.
   */
  async subscribe(userId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const user = await User.findById(userId).session(session);
      if (!user) {
        throw new ErrorHandler('User not found', 404);
      }

      // Founders have permanent lifetime verification; no payment required
      if (isFounder(user)) {
        throw new ErrorHandler('As a platform founder, you have permanent lifetime verification access', 400);
      }

      const now = new Date();
      const currentExpiry = user.verificationSubscription?.expiresAt ? new Date(user.verificationSubscription.expiresAt) : null;
      const isCurrentlyActive = user.verificationSubscription?.active && currentExpiry && currentExpiry > now;

      // Prevent spamming renewals if already extended for more than 35 days
      if (isCurrentlyActive && currentExpiry.getTime() > now.getTime() + 35 * 24 * 60 * 60 * 1000) {
        throw new ErrorHandler('Your verification subscription is already extended', 400);
      }

      // Calculate new expiration date (exact 1 calendar month later)
      let newExpiresAt;
      if (isCurrentlyActive) {
        // Extend from the existing expiration timestamp
        newExpiresAt = addOneCalendarMonth(currentExpiry);
      } else {
        // Fresh subscription or renewing after expiration
        newExpiresAt = addOneCalendarMonth(now);
      }

      // Calculate live balance from completed transactions (accounting ledger)
      const userTransactions = await Transaction.find({
        user: userId,
        status: 'completed'
      }).session(session);

      let calculatedBalance = 0;
      for (const tx of userTransactions) {
        const amt = parseFloat(tx.amount) || 0;
        if ((tx.currency || 'USDC').toUpperCase() !== 'USDC') continue;
        if (['deposit', 'earning', 'bonus', 'onramp', 'refund', 'transfer_in'].includes(tx.type)) calculatedBalance += amt;
        if (['withdrawal', 'payment', 'escrow', 'verification', 'offramp', 'platform_fee', 'transfer_out'].includes(tx.type)) calculatedBalance -= amt;
      }

      // Subtract active escrow & pending withdrawal reservations
      const Booking = require('../models/Booking');
      const activeEscrow = await Booking.find({
        client: userId,
        status: { $in: ['confirmed', 'in_progress', 'delivered'] },
        paymentStatus: 'paid'
      }).session(session);
      const escrowTotal = activeEscrow.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);
      const pendingWithdrawal = user.wallet?.pendingWithdrawal || user.pendingWithdrawal || 0;
      const liveBalance = Math.max(0, calculatedBalance - escrowTotal - pendingWithdrawal);

      if (liveBalance < VERIFICATION_PRICE) {
        throw new ErrorHandler(
          `Insufficient balance. Verification costs ${VERIFICATION_PRICE.toFixed(2)} USDC. Your available balance: ${liveBalance.toFixed(2)} USDC`,
          400
        );
      }

      // Atomic balance update: decrement both wallet.balance and balance
      const userUpdate = await User.findOneAndUpdate(
        { _id: userId, 'wallet.balance': { $gte: VERIFICATION_PRICE } },
        {
          $inc: {
            'wallet.balance': -VERIFICATION_PRICE,
            'balance': -VERIFICATION_PRICE
          },
          $set: {
            'wallet.lastUpdated': now,
            'lastUpdated': now,
            isVerified: true,
            'verificationSubscription.active': true,
            'verificationSubscription.subscribedAt': user.verificationSubscription?.subscribedAt || now,
            'verificationSubscription.expiresAt': newExpiresAt,
            'verificationSubscription.lastRenewalAt': now,
            'verificationSubscription.autoRenew': true
          }
        },
        { session, new: true }
      );

      if (!userUpdate) {
        throw new ErrorHandler('Insufficient balance for verification subscription', 400);
      }

      // Create authoritative completed verification transaction
      await Transaction.create([{
        transactionId: generateTransactionId(),
        user: userId,
        type: 'verification',
        amount: VERIFICATION_PRICE,
        currency: VERIFICATION_CURRENCY,
        status: 'completed',
        description: 'Verification badge subscription (1 month)',
        completedAt: now,
        metadata: {
          plan: 'monthly',
          expiresAt: newExpiresAt.toISOString(),
          notes: 'Platform verification subscription'
        }
      }], { session });

      await session.commitTransaction();

      return {
        success: true,
        message: 'Verification subscription activated successfully',
        expiresAt: userUpdate.verificationSubscription.expiresAt,
        balance: userUpdate.wallet.balance
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Cancel verification subscription
   */
  async cancel(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ErrorHandler('User not found', 404);
    }

    if (isFounder(user)) {
      throw new ErrorHandler('Founder lifetime verification cannot be cancelled', 400);
    }

    if (!user.verificationSubscription?.active) {
      throw new ErrorHandler('No active verification subscription found', 400);
    }

    user.verificationSubscription.active = false;
    user.verificationSubscription.autoRenew = false;
    user.isVerified = false;
    await user.save({ validateBeforeSave: false });

    return {
      success: true,
      message: 'Verification subscription cancelled. Your badge has been removed.'
    };
  }

  /**
   * Get verification status - computed authoritatively on-the-fly
   */
  async getStatus(userId) {
    const user = await User.findById(userId).select('name email isVerified isFounder verificationSubscription wallet.balance');
    if (!user) {
      throw new ErrorHandler('User not found', 404);
    }

    const details = getVerificationDetails(user);

    return {
      isVerified: details.isVerified,
      isFounder: details.isFounder,
      subscription: {
        active: details.active,
        subscribedAt: user.verificationSubscription?.subscribedAt,
        expiresAt: details.expiresAt,
        lifetime: details.isFounder,
        autoRenew: details.autoRenew || false
      },
      price: VERIFICATION_PRICE,
      currency: VERIFICATION_CURRENCY
    };
  }

  /**
   * Proactively synchronize expired subscriptions in database
   * Sets isVerified=false and verificationSubscription.active=false for users whose expiresAt <= now.
   * Explicitly excludes founders.
   */
  async syncExpiredSubscriptions() {
    const now = new Date();
    const founderObjectIds = Array.from(FOUNDER_IDS).map(id => new mongoose.Types.ObjectId(id));
    const founderEmails = Array.from(FOUNDER_EMAILS);

    const result = await User.updateMany(
      {
        _id: { $nin: founderObjectIds },
        email: { $nin: founderEmails },
        $or: [
          { 'verificationSubscription.expiresAt': { $lte: now }, isVerified: true },
          { 'verificationSubscription.expiresAt': { $lte: now }, 'verificationSubscription.active': true },
          { 'verificationSubscription.active': false, isVerified: true }
        ]
      },
      {
        $set: {
          isVerified: false,
          'verificationSubscription.active': false
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`[Verification] Synced ${result.modifiedCount} expired subscriber(s) to unverified in database`);
    }
    return result.modifiedCount;
  }

  /**
   * Auto-renew subscriptions that are about to expire within 24 hours
   */
  async processAutoRenewals() {
    const now = new Date();
    const renewalWindow = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Within 24 hours of expiry
    const founderObjectIds = Array.from(FOUNDER_IDS).map(id => new mongoose.Types.ObjectId(id));
    const founderEmails = Array.from(FOUNDER_EMAILS);

    const usersToRenew = await User.find({
      _id: { $nin: founderObjectIds },
      email: { $nin: founderEmails },
      'verificationSubscription.active': true,
      'verificationSubscription.autoRenew': true,
      'verificationSubscription.expiresAt': { $lte: renewalWindow, $gt: now }
    });

    let renewedCount = 0;
    for (const user of usersToRenew) {
      try {
        const userTransactions = await Transaction.find({ user: user._id, status: 'completed' });
        let calculatedBalance = 0;
        for (const tx of userTransactions) {
          const amt = parseFloat(tx.amount) || 0;
          if ((tx.currency || 'USDC').toUpperCase() !== 'USDC') continue;
          if (['deposit', 'earning', 'bonus', 'onramp', 'refund', 'transfer_in'].includes(tx.type)) calculatedBalance += amt;
          if (['withdrawal', 'payment', 'escrow', 'verification', 'offramp', 'platform_fee', 'transfer_out'].includes(tx.type)) calculatedBalance -= amt;
        }

        const pendingWithdrawal = user.wallet?.pendingWithdrawal || user.pendingWithdrawal || 0;
        const availableBalance = Math.max(0, calculatedBalance - pendingWithdrawal);

        if (availableBalance >= VERIFICATION_PRICE) {
          await this.subscribe(user._id);
          renewedCount++;
        } else {
          user.verificationSubscription.autoRenew = false;
          await user.save({ validateBeforeSave: false });
          console.log(`[VerificationRenewal] Insufficient balance for user ${user._id}, auto-renew disabled`);
        }
      } catch (error) {
        console.error(`[VerificationRenewal] Failed for user ${user._id}:`, error.message);
      }
    }

    if (renewedCount > 0) {
      console.log(`[VerificationRenewal] Auto-renewed ${renewedCount} subscription(s)`);
    }

    return renewedCount;
  }
}

module.exports = new VerificationService();
