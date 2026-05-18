const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { ErrorHandler } = require('../utils/errorHandler');

const VERIFICATION_PRICE = 1.00; // 1 USDC per month
const VERIFICATION_CURRENCY = 'USDC';
const VERIFICATION_DURATION_DAYS = 30;
const GRACE_PERIOD_HOURS = 48; // 2 days grace period after expiry

function generateTransactionId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `TXN-VER-${timestamp}-${random}`;
}

/**
 * Check if a subscription is currently valid (within duration + grace period)
 */
function isSubscriptionValid(subscription) {
  if (!subscription || !subscription.expiresAt) return false;
  const gracePeriodEnd = new Date(subscription.expiresAt.getTime() + GRACE_PERIOD_HOURS * 60 * 60 * 1000);
  return gracePeriodEnd > new Date();
}

class VerificationService {
  /**
   * Subscribe user to verification badge
   * Deducts $1 from wallet, creates transaction, sets isVerified=true
   */
  async subscribe(userId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const user = await User.findById(userId).session(session);
      if (!user) {
        throw new ErrorHandler('User not found', 404);
      }

      // Check if already actively subscribed (within grace period)
      if (isSubscriptionValid(user.verificationSubscription)) {
        throw new ErrorHandler('You already have an active verification subscription', 400);
      }

      // Calculate live balance from transactions (same pattern as booking/project payment)
      const userTransactions = await Transaction.find({
        user: userId,
        status: 'completed'
      }).session(session);

      let calculatedBalance = 0;
      for (const tx of userTransactions) {
        const amt = parseFloat(tx.amount) || 0;
        if ((tx.currency || 'USDC').toUpperCase() !== 'USDC') continue;
        if (['deposit', 'earning', 'refund'].includes(tx.type)) calculatedBalance += amt;
        if (['withdrawal', 'payment', 'escrow', 'verification'].includes(tx.type)) calculatedBalance -= amt;
      }

      // Subtract active escrow
      const Booking = require('../models/Booking');
      const activeEscrow = await Booking.find({
        client: userId,
        status: { $in: ['confirmed', 'in_progress', 'delivered'] },
        paymentStatus: 'paid'
      }).session(session);
      const escrowTotal = activeEscrow.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);
      const liveBalance = Math.max(0, calculatedBalance - escrowTotal);

      if (liveBalance < VERIFICATION_PRICE) {
        throw new ErrorHandler(
          `Insufficient balance. Verification costs $${VERIFICATION_PRICE} USDC. Your available balance: ${liveBalance.toFixed(2)} USDC`,
          400
        );
      }

      // Atomic balance update
      const userUpdate = await User.findOneAndUpdate(
        { _id: userId, 'wallet.balance': { $gte: VERIFICATION_PRICE } },
        {
          $inc: { 'wallet.balance': -VERIFICATION_PRICE },
          $set: {
            isVerified: true,
            'verificationSubscription.active': true,
            'verificationSubscription.subscribedAt': new Date(),
            'verificationSubscription.expiresAt': new Date(Date.now() + VERIFICATION_DURATION_DAYS * 24 * 60 * 60 * 1000),
            'verificationSubscription.lastRenewalAt': new Date(),
            'verificationSubscription.autoRenew': true
          }
        },
        { session, new: true }
      );

      if (!userUpdate) {
        throw new ErrorHandler('Insufficient balance for verification subscription', 400);
      }

      // Create verification transaction
      await Transaction.create([{
        transactionId: generateTransactionId(),
        user: userId,
        type: 'verification',
        amount: VERIFICATION_PRICE,
        currency: VERIFICATION_CURRENCY,
        status: 'completed',
        description: 'Verification badge subscription (1 month)',
        completedAt: new Date(),
        metadata: {
          plan: 'monthly',
          durationDays: VERIFICATION_DURATION_DAYS,
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
   * Get verification status - computed on-the-fly, no cron needed
   */
  async getStatus(userId) {
    const user = await User.findById(userId).select('isVerified verificationSubscription wallet.balance');
    if (!user) {
      throw new ErrorHandler('User not found', 404);
    }

    const subscription = user.verificationSubscription;
    const isValid = isSubscriptionValid(subscription);
    const now = new Date();
    const expiresAt = subscription?.expiresAt;
    const gracePeriodEnd = expiresAt ? new Date(expiresAt.getTime() + GRACE_PERIOD_HOURS * 60 * 60 * 1000) : null;
    const inGracePeriod = expiresAt && expiresAt < now && gracePeriodEnd && gracePeriodEnd > now;

    return {
      isVerified: isValid,
      subscription: {
        active: subscription?.active && isValid,
        subscribedAt: subscription?.subscribedAt,
        expiresAt: expiresAt,
        gracePeriodEndsAt: gracePeriodEnd,
        inGracePeriod: inGracePeriod,
        autoRenew: subscription?.autoRenew || false
      },
      price: VERIFICATION_PRICE,
      currency: VERIFICATION_CURRENCY
    };
  }

  /**
   * Auto-renew subscriptions that are about to expire
   * Called by a lightweight cron or on-demand
   */
  async processAutoRenewals() {
    const now = new Date();
    const renewalWindow = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Within 24 hours of expiry

    const usersToRenew = await User.find({
      'verificationSubscription.active': true,
      'verificationSubscription.autoRenew': true,
      'verificationSubscription.expiresAt': { $lte: renewalWindow, $gt: now }
    });

    let renewedCount = 0;
    for (const user of usersToRenew) {
      try {
        // Check balance
        const userTransactions = await Transaction.find({ user: user._id, status: 'completed' });
        let calculatedBalance = 0;
        for (const tx of userTransactions) {
          const amt = parseFloat(tx.amount) || 0;
          if ((tx.currency || 'USDC').toUpperCase() !== 'USDC') continue;
          if (['deposit', 'earning', 'refund'].includes(tx.type)) calculatedBalance += amt;
          if (['withdrawal', 'payment', 'escrow', 'verification'].includes(tx.type)) calculatedBalance -= amt;
        }

        if (calculatedBalance >= VERIFICATION_PRICE) {
          await this.subscribe(user._id);
          renewedCount++;
        } else {
          // Insufficient balance - turn off auto-renew
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
