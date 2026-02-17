const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const notificationService = require('./notificationService');
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
          return {
            booking: existingBooking,
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
      creator: creatorId,
      status: { $in: ['confirmed', 'in_progress'] }
    });

    if (!booking) {
      throw new ErrorHandler('Booking not found or not in a state to submit work', 404);
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

  async releaseFundsWithTransaction(bookingId, clientId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const booking = await Booking.findOne({
        _id: bookingId,
        client: clientId
      })
        .populate('creator', 'wallet.address name email')
        .populate('client', 'name')
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

      await Transaction.create(
        [
          {
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
        { session }
      );

      booking.fundsReleased = true;
      booking.fundsReleasedAt = new Date();
      booking.paymentStatus = 'released';
      booking.platformFeePaid = true;
      booking.platformFeePaidAt = new Date();
      booking.escrowWallet.balance = 0;
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

    const client = await User.findById(clientId);
    if (client.wallet.balance < amount) {
      throw new ErrorHandler('Insufficient balance to create booking', 400);
    }

    const platformCommission = PLATFORM_CONFIG.COMMISSION_RATE;
    const platformFee = (amount * platformCommission) / 100;
    const creatorAmount = amount - platformFee;

    const { v4: uuidv4 } = require('uuid');
    const bookingId = `BKG-${uuidv4().substring(0, 8).toUpperCase()}`;

    const booking = await Booking.create({
      bookingId,
      idempotencyKey,
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
    });

    // CRITICAL: Double-charging fix. We no longer deduct balance during creation.
    // The client only pays after the creator accepts and the client explicitly calls /pay.
    console.log(`[BookingService] Booking ${bookingId} created. No funds deducted yet.`);

    return { booking, alreadyExists: false };
  }
}

module.exports = new BookingService();
