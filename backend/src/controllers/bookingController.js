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
    .populate('client', 'name email wallet')
    .populate('creator', 'name email wallet');

  if (!booking) {
    return next(new ErrorHandler('Booking not found', 404));
  }

  if (booking.creator._id.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler('Only the creator can accept this booking', 403));
  }

  if (booking.status !== 'pending') {
    return next(new ErrorHandler('Only pending bookings can be accepted', 400));
  }

  // Check if client has sufficient balance
  if (booking.client.wallet.balance < booking.amount) {
    return next(new ErrorHandler('Client has insufficient balance. Client needs to fund their wallet first.', 400));
  }

  // Deduct money from client's wallet
  const client = await User.findById(booking.client._id);
  await client.updateWalletBalance(booking.amount, 'subtract');
  await client.save();

  // Add to creator's pending balance (escrow)
  const creator = await User.findById(booking.creator._id);
  creator.wallet.pendingBalance = (creator.wallet.pendingBalance || 0) + booking.creatorAmount;
  await creator.save();

  // Update booking status
  booking.status = 'confirmed';
  booking.paymentStatus = 'paid';
  booking.escrowWallet.isPaid = true;
  booking.escrowWallet.paidAt = new Date();
  await booking.save();

  // Create transaction records
  await Transaction.create([
    {
      user: booking.client._id,
      type: 'payment',
      amount: booking.amount,
      currency: booking.currency,
      status: 'completed',
      booking: booking._id,
      description: `Payment for ${booking.serviceTitle}`,
      completedAt: new Date()
    },
    {
      user: booking.creator._id,
      type: 'earning',
      amount: booking.creatorAmount,
      currency: booking.currency,
      status: 'pending',
      booking: booking._id,
      description: `Pending payment for ${booking.serviceTitle}`
    }
  ]);

  // Notify client
  emailConfig.sendEmail({
    to: booking.client.email,
    subject: 'Booking Confirmed! ',
    html: `
      <h1>Booking Confirmed!</h1>
      <p>Hi ${booking.client.name},</p>
      <p>${creator.name} has accepted your booking request.</p>
      <p><strong>Service:</strong> ${booking.serviceTitle}</p>
      <p><strong>Amount:</strong> ${booking.amount} ${booking.currency} (deducted from your wallet)</p>
      <p><strong>Work starts:</strong> ${new Date(booking.startDate).toLocaleDateString()}</p>
      <p><strong>Expected completion:</strong> ${new Date(booking.endDate).toLocaleDateString()}</p>
      <p>Funds will be automatically released to the creator after the work is completed.</p>
    `
  }).catch(err => console.error('Email failed:', err));

  // Notify creator
  emailConfig.sendEmail({
    to: booking.creator.email,
    subject: 'Booking Payment Received! ',
    html: `
      <h1>Payment Secured!</h1>
      <p>Hi ${creator.name},</p>
      <p>The client has been charged ${booking.amount} ${booking.currency} for the booking.</p>
      <p><strong>Your earnings:</strong> ${booking.creatorAmount} ${booking.currency} (after ${booking.platformCommission}% platform fee)</p>
      <p>The funds are currently in escrow and will be automatically released to your wallet after ${new Date(booking.endDate).toLocaleDateString()}.</p>
    `
  }).catch(err => console.error('Email failed:', err));

  successResponse(res, 200, 'Booking accepted and payment secured', { booking });
});

// Automatic completion and fund release (called by cron job or after end date)
exports.autoCompletBooking = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id)
    .populate('creator', 'wallet name email')
    .populate('client', 'name email');

  if (!booking) {
    return next(new ErrorHandler('Booking not found', 404));
  }

  // Check if booking has reached end date
  if (new Date() < new Date(booking.endDate)) {
    return next(new ErrorHandler('Booking end date has not been reached yet', 400));
  }

  if (booking.status !== 'confirmed') {
    return next(new ErrorHandler('Only confirmed bookings can be auto-completed', 400));
  }

  if (booking.fundsReleased) {
    return next(new ErrorHandler('Funds have already been released', 400));
  }

  // Mark as completed
  booking.status = 'completed';
  booking.completedAt = new Date();
  booking.fundsReleased = true;
  booking.fundsReleasedAt = new Date();
  booking.paymentStatus = 'released';
  await booking.save();

  // Move money from pending to available balance
  const creator = await User.findById(booking.creator._id);
  creator.wallet.pendingBalance = Math.max(0, (creator.wallet.pendingBalance || 0) - booking.creatorAmount);
  await creator.updateWalletBalance(booking.creatorAmount, 'add');
  creator.wallet.totalEarnings = (creator.wallet.totalEarnings || 0) + booking.creatorAmount;
  creator.completedBookings += 1;
  await creator.save();

  // Update transaction status
  await Transaction.findOneAndUpdate(
    { booking: booking._id, type: 'earning', status: 'pending' },
    { status: 'completed', completedAt: new Date() }
  );

  // Create platform fee transaction
  await Transaction.create({
    user: creator._id,
    type: 'platform_fee',
    amount: booking.platformFee,
    currency: booking.currency,
    status: 'completed',
    booking: booking._id,
    description: `Platform fee for ${booking.bookingId}`,
    completedAt: new Date()
  });

  // Notify creator
  emailConfig.sendEmail({
    to: booking.creator.email,
    subject: 'Payment Released! ',
    html: `
      <h1>Payment Released!</h1>
      <p>Hi ${booking.creator.name},</p>
      <p>The booking for "${booking.serviceTitle}" has been completed!</p>
      <p><strong>Amount Received:</strong> ${booking.creatorAmount} ${booking.currency}</p>
      <p>The funds are now available in your wallet for withdrawal.</p>
    `
  }).catch(err => console.error('Email failed:', err));

  // Notify client to leave review
  emailConfig.sendEmail({
    to: booking.client.email,
    subject: 'Please Rate Your Experience! ',
    html: `
      <h1>How was your experience?</h1>
      <p>Hi ${booking.client.name},</p>
      <p>Your booking for "${booking.serviceTitle}" with ${booking.creator.name} has been completed!</p>
      <p>We'd love to hear about your experience. Please take a moment to rate and review the service.</p>
      <p>Your feedback helps other clients and improves our platform!</p>
    `
  }).catch(err => console.error('Email failed:', err));

  adminNotificationService.notifyBookingCompleted(booking)
    .catch(err => console.error('Admin notification failed:', err));

  successResponse(res, 200, 'Booking completed and funds released automatically', { booking });
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
