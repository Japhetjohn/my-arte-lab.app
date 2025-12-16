const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const { ErrorHandler } = require('../utils/errorHandler');
const { BOOKING_LIMITS, PLATFORM_CONFIG } = require('../utils/constants');

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

      const client = await User.findById(booking.client).session(session);
      if (!client) {
        throw new ErrorHandler('Client not found', 404);
      }

      if (client.wallet.balance < booking.amount) {
        await session.abortTransaction();
        throw new ErrorHandler(
          `Insufficient balance. Required: ${booking.amount} USDC, Available: ${client.wallet.balance} USDC`,
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
        await session.abortTransaction();
        throw new ErrorHandler('Concurrent modification detected or insufficient balance', 409);
      }

      await Transaction.create(
        [
          {
            user: client._id,
            type: 'payment',
            amount: booking.amount,
            currency: booking.currency,
            status: 'completed',
            booking: booking._id,
            description: `Payment for ${booking.serviceTitle}`,
            completedAt: new Date()
          }
        ],
        { session }
      );

      booking.status = 'confirmed';
      booking.paymentStatus = 'paid';
      booking.paidAt = new Date();
      if (idempotencyKey) {
        booking.idempotencyKey = idempotencyKey;
      }
      await booking.save({ session });

      await session.commitTransaction();

      return {
        booking,
        client: clientUpdate,
        alreadyProcessed: false
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
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

      if (!booking.canReleaseFunds()) {
        throw new ErrorHandler('Funds cannot be released for this booking', 400);
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
            description: `Platform fee for ${booking.bookingId}`,
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
        balance: amount
      }
    });

    client.wallet.balance -= amount;
    client.wallet.pendingBalance += amount;
    await client.save({ validateBeforeSave: false });

    await Transaction.create({
      user: client._id,
      type: 'escrow',
      amount,
      currency: currency || 'USDC',
      status: 'completed',
      booking: booking._id,
      description: `Funds held in escrow for ${serviceTitle}`,
      completedAt: new Date()
    });

    return { booking, alreadyExists: false };
  }
}

module.exports = new BookingService();
