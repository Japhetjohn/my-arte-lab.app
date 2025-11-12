const Booking = require('../models/Booking');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { successResponse } = require('../utils/apiResponse');
const { ErrorHandler, catchAsync } = require('../utils/errorHandler');
const tsaraService = require('../services/tsaraService');
const tsaraConfig = require('../config/tsara');
const emailConfig = require('../config/email');
const adminNotificationService = require('../services/adminNotificationService');

exports.createBooking = catchAsync(async (req, res, next) => {
  const {
    creatorId,
    serviceTitle,
    serviceDescription,
    category,
    amount,
    currency,
    startDate,
    endDate
  } = req.body;

  const creator = await User.findById(creatorId);
  if (!creator || creator.role !== 'creator') {
    return next(new ErrorHandler('Creator not found', 404));
  }

  const platformCommission = tsaraConfig.commission;
  const platformFee = (amount * platformCommission) / 100;
  const creatorAmount = amount - platformFee;

  const booking = await Booking.create({
    client: req.user._id,
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
      address: 'pending',
      balance: 0
    }
  });

  try {
    const escrowWallet = await tsaraService.generateEscrowWallet({
      bookingId: booking.bookingId,
      amount,
      currency: currency || 'USDC',
      clientEmail: req.user.email,
      creatorEmail: creator.email
    });

    booking.escrowWallet.address = escrowWallet.address;
    booking.escrowWallet.escrowId = escrowWallet.escrowId;
    await booking.save();

  } catch (error) {
    console.error('Escrow wallet generation failed:', error);
    await Booking.findByIdAndDelete(booking._id);
    return next(new ErrorHandler('Failed to create escrow wallet. Please try again', 500));
  }

  emailConfig.sendEmail({
    to: creator.email,
    subject: 'New Booking Request! ',
    html: `
      <h1>New Booking!</h1>
      <p>Hi ${creator.name},</p>
      <p>You have received a new booking request from ${req.user.name}.</p>
      <p><strong>Service:</strong> ${serviceTitle}</p>
      <p><strong>Amount:</strong> ${amount} ${currency}</p>
      <p><strong>Your Earnings:</strong> ${creatorAmount} ${currency} (after ${platformCommission}% platform fee)</p>
      <p>Login to your account to view details.</p>
    `
  }).catch(err => console.error('Email failed:', err));

  adminNotificationService.notifyNewBooking(booking, req.user, creator)
    .catch(err => console.error('Admin notification failed:', err));

  successResponse(res, 201, 'Booking created successfully', {
    booking,
    paymentInstructions: {
      message: 'Please send payment to the escrow address below',
      escrowAddress: booking.escrowWallet.address,
      amount: booking.amount,
      currency: booking.currency,
      note: 'Funds will be held in escrow until job completion'
    }
  });
});

exports.getMyBookings = catchAsync(async (req, res, next) => {
  const { status, type } = req.query;

  const query = {};

  if (type === 'client' || !type) {
    query.client = req.user._id;
  } else if (type === 'creator') {
    query.creator = req.user._id;
  }

  if (status) {
    query.status = status;
  }

  const bookings = await Booking.find(query)
    .populate('client', 'name avatar email')
    .populate('creator', 'name avatar email category')
    .sort({ createdAt: -1 });

  successResponse(res, 200, 'Bookings retrieved successfully', { bookings });
});

exports.getBooking = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id)
    .populate('client', 'name avatar email')
    .populate('creator', 'name avatar email category wallet.address');

  if (!booking) {
    return next(new ErrorHandler('Booking not found', 404));
  }

  const isAuthorized =
    booking.client._id.toString() === req.user._id.toString() ||
    booking.creator._id.toString() === req.user._id.toString();

  if (!isAuthorized) {
    return next(new ErrorHandler('Not authorized to view this booking', 403));
  }

  successResponse(res, 200, 'Booking retrieved successfully', { booking });
});

exports.acceptBooking = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id)
    .populate('client', 'name email');

  if (!booking) {
    return next(new ErrorHandler('Booking not found', 404));
  }

  if (booking.creator.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler('Only the creator can accept this booking', 403));
  }

  if (booking.status !== 'pending') {
    return next(new ErrorHandler('Only pending bookings can be accepted', 400));
  }

  booking.status = 'confirmed';
  await booking.save();

  // Notify client
  emailConfig.sendEmail({
    to: booking.client.email,
    subject: 'Booking Accepted! ',
    html: `
      <h1>Booking Accepted!</h1>
      <p>Hi ${booking.client.name},</p>
      <p>${req.user.name} has accepted your booking request.</p>
      <p><strong>Service:</strong> ${booking.serviceTitle}</p>
      <p><strong>Amount:</strong> ${booking.amount} ${booking.currency}</p>
      <p>Please send payment to the escrow address: ${booking.escrowWallet.address}</p>
      <p>The work will begin once payment is confirmed.</p>
    `
  }).catch(err => console.error('Email failed:', err));

  successResponse(res, 200, 'Booking accepted successfully', { booking });
});

exports.completeBooking = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return next(new ErrorHandler('Booking not found', 404));
  }

  if (booking.creator.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler('Only the creator can mark the booking as completed', 403));
  }

  if (booking.status !== 'in_progress' && booking.status !== 'confirmed') {
    return next(new ErrorHandler('Only in-progress or confirmed bookings can be marked as completed', 400));
  }

  await booking.markCompleted();

  const client = await User.findById(booking.client);
  emailConfig.sendEmail({
    to: client.email,
    subject: 'Booking Completed! ',
    html: `
      <h1>Work Completed!</h1>
      <p>Hi ${client.name},</p>
      <p>${req.user.name} has marked your booking as completed.</p>
      <p><strong>Service:</strong> ${booking.serviceTitle}</p>
      <p>Please review the deliverables and release payment if satisfied.</p>
    `
  }).catch(err => console.error('Email failed:', err));

  successResponse(res, 200, 'Booking marked as completed', { booking });
});

exports.releaseFunds = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id)
    .populate('creator', 'wallet.address name email')
    .populate('client', 'name');

  if (!booking) {
    return next(new ErrorHandler('Booking not found', 404));
  }

  if (booking.client._id.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler('Only the client can release funds', 403));
  }

  if (!booking.canReleaseFunds()) {
    return next(new ErrorHandler('Funds cannot be released for this booking', 400));
  }

  try {
    const releaseResult = await tsaraService.releaseEscrowFunds({
      escrowId: booking.escrowWallet.escrowId,
      escrowAddress: booking.escrowWallet.address,
      creatorAddress: booking.creator.wallet.address,
      platformAddress: tsaraConfig.platformWallet,
      creatorAmount: booking.creatorAmount,
      platformFee: booking.platformFee,
      currency: booking.currency,
      bookingId: booking.bookingId
    });

    await booking.releaseFunds();
    booking.platformFeePaid = true;
    booking.platformFeePaidAt = new Date();
    booking.platformFeeTransactionHash = releaseResult.platformTransaction?.hash;
    await booking.save();

    await Transaction.create([
      {
        user: booking.creator._id,
        type: 'earning',
        amount: booking.creatorAmount,
        currency: booking.currency,
        status: 'completed',
        booking: booking._id,
        toAddress: booking.creator.wallet.address,
        transactionHash: releaseResult.creatorTransaction?.hash,
        description: `Payment received for ${booking.serviceTitle}`,
        completedAt: new Date()
      },
      {
        user: booking.creator._id,
        type: 'platform_fee',
        amount: booking.platformFee,
        currency: booking.currency,
        status: 'completed',
        booking: booking._id,
        toAddress: tsaraConfig.platformWallet,
        transactionHash: releaseResult.platformTransaction?.hash,
        description: `Platform fee for ${booking.bookingId}`,
        completedAt: new Date()
      }
    ]);

    const creator = await User.findById(booking.creator._id);
    await creator.updateWalletBalance(booking.creatorAmount, 'add');
    creator.wallet.totalEarnings += booking.creatorAmount;
    creator.completedBookings += 1;
    await creator.save();

    emailConfig.sendEmail({
      to: booking.creator.email,
      subject: 'Payment Received! ',
      html: `
        <h1>Payment Received!</h1>
        <p>Hi ${booking.creator.name},</p>
        <p>Payment for "${booking.serviceTitle}" has been released!</p>
        <p><strong>Amount Received:</strong> ${booking.creatorAmount} ${booking.currency}</p>
        <p><strong>Platform Fee:</strong> ${booking.platformFee} ${booking.currency}</p>
        <p>The funds are now available in your wallet.</p>
      `
    }).catch(err => console.error('Email failed:', err));

    adminNotificationService.notifyPaymentReceived(booking, releaseResult.creatorTransaction)
      .catch(err => console.error('Admin notification failed:', err));

    successResponse(res, 200, 'Funds released successfully', {
      booking,
      transactions: releaseResult
    });

  } catch (error) {
    console.error('Fund release failed:', error);
    return next(new ErrorHandler('Failed to release funds. Please contact support', 500));
  }
});

exports.cancelBooking = catchAsync(async (req, res, next) => {
  const { reason } = req.body;
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return next(new ErrorHandler('Booking not found', 404));
  }

  const isAuthorized =
    booking.client.toString() === req.user._id.toString() ||
    booking.creator.toString() === req.user._id.toString();

  if (!isAuthorized) {
    return next(new ErrorHandler('Not authorized to cancel this booking', 403));
  }

  if (!booking.canBeCancelled()) {
    return next(new ErrorHandler('This booking cannot be cancelled', 400));
  }

  booking.status = 'cancelled';
  booking.cancelledAt = new Date();
  booking.cancellationReason = reason;
  await booking.save();

  successResponse(res, 200, 'Booking cancelled successfully', { booking });
});

exports.addMessage = catchAsync(async (req, res, next) => {
  const { message } = req.body;
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return next(new ErrorHandler('Booking not found', 404));
  }

  const isAuthorized =
    booking.client.toString() === req.user._id.toString() ||
    booking.creator.toString() === req.user._id.toString();

  if (!isAuthorized) {
    return next(new ErrorHandler('Not authorized to message in this booking', 403));
  }

  await booking.addMessage(req.user._id, message);

  successResponse(res, 200, 'Message added successfully', { booking });
});
