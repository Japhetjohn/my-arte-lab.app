const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const notificationService = require('./notificationService');
const hostfiService = require('./hostfiService');
const { ErrorHandler } = require('../utils/errorHandler');
const { BOOKING_LIMITS, PLATFORM_CONFIG } = require('../utils/constants');
const { getPlatformFeeDestination } = require('../utils/platformWallet');

class BookingService {
  async acceptBookingWithTransaction(bookingId, creatorId, idempotencyKey = null) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      if (idempotencyKey) {
        const existingBooking = await Booking.findOne({ idempotencyKey }).session(session);
        if (existingBooking && existingBooking.status !== 'pending') {
          await session.commitTransaction();
          const client = await User.findById(existingBooking.client).session(session);
          return {
            booking: existingBooking,
            client,
            alreadyProcessed: true
          };
        }
      }

      const booking = await Booking.findOne({
        _id: bookingId,
        creator: creatorId,
        status: 'pending'
      }).session(session);

      if (!booking) {
        throw new ErrorHandler('Booking not found or cannot be accepted', 404);
      }

      booking.status = 'awaiting_payment';
      if (idempotencyKey) {
        booking.idempotencyKey = idempotencyKey;
      }
      await booking.save({ session });

      // Get client data for return
      const client = await User.findById(booking.client).session(session);

      // Notify client that booking was accepted
      await notificationService.createNotification({
        recipient: booking.client,
        type: 'booking_accepted',
        title: 'Booking Accepted',
        message: `Creator has accepted your booking request for "${booking.serviceTitle}". Please proceed to payment to start the project.`,
        booking: booking._id,
        link: `/#/bookings`
      });

      await session.commitTransaction();

      return {
        booking,
        client,
        alreadyProcessed: false
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async processBookingPayment(bookingId, clientId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const booking = await Booking.findOne({
        _id: bookingId,
        client: clientId,
        status: 'awaiting_payment'
      }).session(session);

      if (!booking) {
        throw new ErrorHandler('Booking not found or not in awaiting payment status', 404);
      }

      const client = await User.findById(clientId).session(session);
      if (!client) {
        throw new ErrorHandler('Client not found', 404);
      }

      // Check if there is a counter-proposal that hasn't been applied yet
      if (booking.counterProposal && booking.counterProposal.amount && !booking.counterProposal.applied) {
        console.log(`[BookingService] Applying counter-proposal for booking ${bookingId}. Original: ${booking.amount}, Counter: ${booking.counterProposal.amount}`);

        booking.amount = booking.counterProposal.amount;
        booking.platformFee = booking.counterProposal.platformFee;
        booking.creatorAmount = booking.counterProposal.creatorAmount;
        booking.counterProposal.applied = true;
        // The booking will be saved later in this function
      }

      if (client.wallet.balance < booking.amount) {
        throw new ErrorHandler(
          `Insufficient balance. Required: ${booking.amount} ${booking.currency}, Available: ${client.wallet.balance} ${booking.currency}`,
          400
        );
      }

      const clientUpdate = await User.findOneAndUpdate(
        {
          _id: client._id,
          'wallet.balance': { $gte: booking.amount },
          __v: client.__v
        },
        {
          $inc: {
            'wallet.balance': -booking.amount,
            'wallet.pendingBalance': booking.amount,
            __v: 1
          },
          $set: {
            'wallet.lastUpdated': new Date()
          }
        },
        {
          session,
          new: true
        }
      );

      if (!clientUpdate) {
        throw new ErrorHandler('Concurrent modification detected or insufficient balance', 409);
      }

      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 10).toUpperCase();
      const transactionId = `TXN-${timestamp}-${random}`;

      await Transaction.create(
        [
          {
            transactionId,
            user: client._id,
            type: 'payment',
            amount: booking.amount,
            currency: booking.currency,
            status: 'completed',
            booking: booking._id,
            description: `Escrow payment for ${booking.serviceTitle}`,
            completedAt: new Date()
          }
        ],
        { session }
      );

      booking.status = 'confirmed';
      booking.paymentStatus = 'paid';
      booking.paidAt = new Date();
      booking.escrowWallet.balance = booking.amount;
      await booking.save({ session });

      // Notify creator that payment was received
      await notificationService.createNotification({
        recipient: booking.creator,
        type: 'payment_received',
        title: 'Payment Received',
        message: `Client has paid for "${booking.serviceTitle}". Funds are held in escrow. You can now start working!`,
        booking: booking._id,
        link: `/#/bookings`
      });

      await session.commitTransaction();

      return {
        booking,
        client: clientUpdate
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async submitBookingDeliverable(bookingId, creatorId, deliverableData) {
    const booking = await Booking.findOne({
      _id: bookingId,
      creator: creatorId
    });

    if (!booking) {
      throw new ErrorHandler('Booking not found', 404);
    }

    // Check if booking is in the right state
    if (!['confirmed', 'in_progress'].includes(booking.status)) {
      throw new ErrorHandler(
        `Cannot submit deliverables. Booking status is '${booking.status}'. ` +
        `Must be 'confirmed' or 'in_progress'. Current status: ${booking.status}`,
        400
      );
    }

    booking.deliverables.push({
      ...deliverableData,
      uploadedAt: new Date()
    });

    booking.status = 'delivered';
    booking.lastSubmissionDate = new Date();
    await booking.save();

    // Notify client that work was delivered
    await notificationService.createNotification({
      recipient: booking.client,
      type: 'work_delivered',
      title: 'Work Delivered',
      message: `Creator has submitted deliverables for "${booking.serviceTitle}". Please review and approve to release funds.`,
      booking: booking._id,
      link: `/#/bookings`
    });

    return booking;
  }

  async releaseFundsWithTransaction(bookingId, clientId, reviewData = null) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const booking = await Booking.findOne({
        _id: bookingId,
        client: clientId
      })
        .populate('creator', 'wallet.address firstName lastName name email')
        .populate('client', 'firstName lastName name email wallet.hostfiWalletAssets')
        .session(session);

      if (!booking) {
        throw new ErrorHandler('Booking not found', 404);
      }

      if (booking.status !== 'delivered' && booking.status !== 'completed') {
        throw new ErrorHandler('Deliverables must be submitted before funds can be released', 400);
      }

      if (booking.escrowWallet.balance < booking.amount) {
        throw new ErrorHandler('Insufficient funds in escrow', 400);
      }

      const creator = await User.findById(booking.creator._id).session(session);

      const creatorUpdate = await User.findOneAndUpdate(
        {
          _id: creator._id,
          __v: creator.__v
        },
        {
          $inc: {
            'wallet.balance': booking.creatorAmount,
            'wallet.totalEarnings': booking.creatorAmount,
            completedBookings: 1,
            __v: 1
          },
          $set: {
            'wallet.lastUpdated': new Date()
          }
        },
        {
          session,
          new: true
        }
      );

      if (!creatorUpdate) {
        throw new ErrorHandler('Concurrent modification detected', 409);
      }

      const client = await User.findById(clientId).session(session);

      await User.findByIdAndUpdate(
        clientId,
        {
          $inc: {
            'wallet.pendingBalance': -booking.amount
          }
        },
        { session }
      );

      // Get platform fee destination (temp wallet)
      const platformWalletInfo = getPlatformFeeDestination(booking._id.toString());

      // Generate transaction IDs
      const timestamp = Date.now().toString(36).toUpperCase();
      const random1 = Math.random().toString(36).substring(2, 10).toUpperCase();
      const random2 = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      await Transaction.create(
        [
          {
            transactionId: `TXN-EARN-${timestamp}-${random1}`,
            user: creator._id,
            type: 'earning',
            amount: booking.creatorAmount,
            currency: booking.currency,
            status: 'completed',
            booking: booking._id,
            toAddress: creator.wallet.address,
            description: `Payment received for ${booking.serviceTitle}`,
            completedAt: new Date()
          },
          {
            transactionId: `TXN-FEE-${timestamp}-${random2}`,
            user: creator._id,
            type: 'platform_fee',
            amount: booking.platformFee,
            currency: booking.currency,
            status: 'completed',
            booking: booking._id,
            toAddress: platformWalletInfo.address,
            description: `Platform fee for ${booking.bookingId}`,
            metadata: {
              isTempWallet: platformWalletInfo.isTemp,
              mainPlatformWallet: platformWalletInfo.mainWallet,
              tempWallet: platformWalletInfo.isTemp ? platformWalletInfo.address : null
            },
            completedAt: new Date()
          }
        ],
        { session, ordered: true }
      );

      booking.fundsReleased = true;
      booking.fundsReleasedAt = new Date();
      booking.paymentStatus = 'released';
      booking.platformFeePaid = true;
      booking.platformFeePaidAt = new Date();
      booking.escrowWallet.balance = 0;
      booking.status = 'completed'; // Set status to completed when funds are released
      booking.completedAt = new Date();
      
      // Store review data if provided
      if (reviewData && reviewData.rating) {
        booking.review = {
          rating: reviewData.rating,
          comment: reviewData.comment || '',
          createdAt: new Date()
        };
      }
      
      await booking.save({ session });

      // Notify both parties
      await Promise.all([
        notificationService.createNotification({
          recipient: creator._id,
          type: 'booking_completed',
          title: 'Funds Released',
          message: `Funds have been released for "${booking.serviceTitle}". The project is now complete!`,
          booking: booking._id,
          link: `/#/wallet`
        }),
        notificationService.createNotification({
          recipient: clientId,
          type: 'booking_completed',
          title: 'Project Completed',
          message: `You have approved the work for "${booking.serviceTitle}". The project is now completed.`,
          booking: booking._id,
          link: `/#/bookings`
        })
      ]);

      await session.commitTransaction();
      
      // Create review record if review data was provided (outside transaction)
      if (reviewData && reviewData.rating) {
        try {
          const Review = require('../models/Review');
          await Review.create({
            booking: booking._id,
            reviewer: clientId,
            creator: creator._id,
            rating: reviewData.rating,
            comment: reviewData.comment || '',
            isPublished: true
          });
          
          // Update creator's average rating
          const creatorReviews = await Review.find({ creator: creator._id, isPublished: true });
          const avgRating = creatorReviews.reduce((sum, r) => sum + r.rating, 0) / creatorReviews.length;
          await User.findByIdAndUpdate(creator._id, { 
            rating: Math.round(avgRating * 10) / 10,
            reviewCount: creatorReviews.length
          });
          
          console.log(`[BookingService] Review created for booking ${bookingId}, creator rating updated to ${avgRating}`);
        } catch (reviewError) {
          console.error('[BookingService] Failed to create review:', reviewError.message);
          // Don't fail the whole operation if review creation fails
        }
      }

      // Transfer funds via HostFi (outside DB transaction)
      try {
        console.log(`[BookingService] Starting HostFi transfers for booking ${bookingId}`);
        console.log(`[BookingService] Client wallet assets:`, JSON.stringify(client.wallet.hostfiWalletAssets?.map(a => ({ currency: a.currency, assetId: a.assetId }))));
        
        // Get client's USDC wallet asset ID for the transfer
        const clientUsdcAsset = client.wallet.hostfiWalletAssets?.find(
          a => a.currency === booking.currency || a.currency === 'USDC'
        );
        
        console.log(`[BookingService] Found USDC asset:`, JSON.stringify(clientUsdcAsset));
        
        if (!clientUsdcAsset?.assetId) {
          console.error('[BookingService] No client USDC asset found for HostFi transfer');
          throw new Error('Client wallet not properly configured for payout');
        }
        
        // 1. Transfer creator's 90% to their wallet
        console.log(`[BookingService] Initiating creator payout: ${booking.creatorAmount} ${booking.currency} to ${creator.wallet.address}`);
        const creatorPayout = await hostfiService.initiateWithdrawal({
          walletAssetId: clientUsdcAsset.assetId,
          amount: booking.creatorAmount,
          currency: booking.currency,
          methodId: 'CRYPTO',
          recipient: {
            type: 'CRYPTO',
            method: 'CRYPTO',
            currency: booking.currency,
            address: creator.wallet.address,
            network: 'SOL',
            country: 'NG'
          },
          clientReference: `CREATOR-PAYOUT-${booking.bookingId}-${Date.now()}`,
          memo: `Payment for ${booking.serviceTitle}`
        });

        if (creatorPayout.reference || creatorPayout.id) {
          // Update earning transaction with payout reference
          await Transaction.updateOne(
            { booking: booking._id, type: 'earning' },
            { 
              transactionHash: creatorPayout.reference || creatorPayout.id,
              status: 'completed',
              metadata: {
                payoutReference: creatorPayout.reference || creatorPayout.id,
                toAddress: creator.wallet.address,
                network: 'SOL'
              }
            }
          );
          console.log(`[BookingService] Creator payout initiated: ${creatorPayout.reference || creatorPayout.id}`);
        }
        
        // 2. Transfer platform fee 10% to platform wallet
        const platformFeeTransfer = await hostfiService.transferPlatformFee({
          clientAssetId: clientUsdcAsset.assetId,
          amount: booking.platformFee,
          currency: booking.currency,
          reference: booking.bookingId
        });

        if (platformFeeTransfer.reference || platformFeeTransfer.id) {
          // Update booking with platform fee transaction hash
          booking.platformFeeTransactionHash = platformFeeTransfer.reference || platformFeeTransfer.id;
          await booking.save();
          
          // Update transaction record with the blockchain reference
          await Transaction.updateOne(
            { booking: booking._id, type: 'platform_fee' },
            { 
              transactionHash: platformFeeTransfer.reference || platformFeeTransfer.id,
              status: 'completed'
            }
          );
          
          console.log(`[BookingService] Platform fee transferred: ${platformFeeTransfer.reference || platformFeeTransfer.id}`);
        }
      } catch (transferError) {
        console.error('[BookingService] Failed to transfer funds:', transferError.message);
        // Don't throw - the booking is already completed, just log for manual reconciliation
      }

      return {
        booking,
        creator: creatorUpdate,
        client
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async refundBookingWithTransaction(bookingId, clientId, reason = 'Creator did not deliver') {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const booking = await Booking.findOne({
        _id: bookingId,
        client: clientId
      })
        .populate('creator', 'wallet.address firstName lastName name email')
        .populate('client', 'firstName lastName name email wallet')
        .session(session);

      if (!booking) {
        throw new ErrorHandler('Booking not found', 404);
      }

      // Can only refund paid bookings that haven't been completed
      if (booking.paymentStatus !== 'paid') {
        throw new ErrorHandler('No funds to refund - booking not paid', 400);
      }

      if (booking.status === 'completed' || booking.fundsReleased) {
        throw new ErrorHandler('Cannot refund - funds already released', 400);
      }

      // Only allow refund for bookings in these statuses
      const refundableStatuses = ['confirmed', 'in_progress', 'delivered', 'cancelled'];
      if (!refundableStatuses.includes(booking.status)) {
        throw new ErrorHandler(`Cannot refund booking with status '${booking.status}'`, 400);
      }

      const client = await User.findById(clientId).session(session);

      // Return full amount to client's wallet
      await User.findOneAndUpdate(
        { _id: client._id, __v: client.__v },
        {
          $inc: {
            'wallet.balance': booking.amount,
            'wallet.pendingBalance': -booking.amount,
            __v: 1
          },
          $set: {
            'wallet.lastUpdated': new Date()
          }
        },
        { session, new: true }
      );

      // Create refund transaction record
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 10).toUpperCase();
      const transactionId = `TXN-REFUND-${timestamp}-${random}`;

      await Transaction.create(
        [{
          transactionId,
          user: client._id,
          type: 'refund',
          amount: booking.amount,
          currency: booking.currency,
          status: 'completed',
          booking: booking._id,
          description: `Refund for ${booking.serviceTitle} - ${reason}`,
          completedAt: new Date()
        }],
        { session }
      );

      // Update booking status
      booking.paymentStatus = 'refunded';
      booking.status = 'cancelled';
      booking.cancellationReason = reason;
      booking.cancelledAt = new Date();
      booking.escrowWallet.balance = 0;
      await booking.save({ session });

      // Notify both parties
      await Promise.all([
        notificationService.createNotification({
          recipient: client._id,
          type: 'booking_refunded',
          title: 'Booking Refunded',
          message: `You have been refunded ${booking.amount} ${booking.currency} for "${booking.serviceTitle}". Reason: ${reason}`,
          booking: booking._id,
          link: `/#/wallet`
        }),
        notificationService.createNotification({
          recipient: booking.creator._id,
          type: 'booking_refunded',
          title: 'Booking Refunded to Client',
          message: `The booking "${booking.serviceTitle}" has been refunded to the client. Reason: ${reason}`,
          booking: booking._id,
          link: `/#/bookings`
        })
      ]);

      await session.commitTransaction();

      return {
        booking,
        client: await User.findById(clientId)
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async createBookingWithValidation(bookingData, clientId, idempotencyKey = null) {
    const { creatorId, amount, serviceTitle, serviceDescription, category, currency, startDate, endDate } = bookingData;

    if (amount < BOOKING_LIMITS.MIN_AMOUNT) {
      throw new ErrorHandler(`Minimum booking amount is ${BOOKING_LIMITS.MIN_AMOUNT} USDC`, 400);
    }

    if (amount > BOOKING_LIMITS.MAX_AMOUNT) {
      throw new ErrorHandler(`Maximum booking amount is ${BOOKING_LIMITS.MAX_AMOUNT} USDC`, 400);
    }

    if (idempotencyKey) {
      const existing = await Booking.findOne({ idempotencyKey });
      if (existing) {
        return { booking: existing, alreadyExists: true };
      }
    }

    const creator = await User.findById(creatorId);
    if (!creator || creator.role !== 'creator') {
      throw new ErrorHandler('Creator not found', 404);
    }

    // No balance check at booking creation - payment happens after creator accepts
    const platformCommission = PLATFORM_CONFIG.COMMISSION_RATE;
    const platformFee = (amount * platformCommission) / 100;
    const creatorAmount = amount - platformFee;

    const { v4: uuidv4 } = require('uuid');
    const bookingId = `BKG-${uuidv4().substring(0, 8).toUpperCase()}`;

    const newBookingPayload = {
      bookingId,
      client: clientId,
      creator: creatorId,
      serviceTitle,
      serviceDescription,
      category,
      amount,
      currency: currency || 'USDC',
      platformCommission,
      platformFee,
      creatorAmount,
      startDate,
      endDate,
      escrowWallet: {
        address: `escrow-${bookingId}`,
        balance: 0 // Balance is 0 until payment is processed
      }
    };

    // Only include idempotencyKey if it has a value to avoid null duplicate key errors
    if (idempotencyKey) {
      newBookingPayload.idempotencyKey = idempotencyKey;
    }

    const booking = await Booking.create(newBookingPayload);

    // CRITICAL: Double-charging fix. We no longer deduct balance during creation.
    // The client only pays after the creator accepts and the client explicitly calls /pay.
    console.log(`[BookingService] Booking ${bookingId} created. No funds deducted yet.`);

    return { booking, alreadyExists: false };
  }
}

module.exports = new BookingService();
