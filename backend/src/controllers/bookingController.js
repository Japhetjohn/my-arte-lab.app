const Booking = require('../models/Booking');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { successResponse } = require('../utils/apiResponse');
const { ErrorHandler, catchAsync } = require('../utils/errorHandler');
const tsaraService = require('../services/tsaraService');
const tsaraConfig = require('../config/tsara');
const emailConfig = require('../config/email');
const adminNotificationService = require('../services/adminNotificationService');
const { v4: uuidv4 } = require('uuid');

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
  if (!creator || !creator.role || !creator.role.toLowerCase().includes('creator')) {
    return next(new ErrorHandler('Creator not found', 404));
  }

  const platformCommission = tsaraConfig.commission;
  const platformFee = (amount * platformCommission) / 100;
  const creatorAmount = amount - platformFee;

  // Generate unique booking ID
  const bookingId = `BKG-${uuidv4().substring(0, 8).toUpperCase()}`;

  const booking = await Booking.create({
    bookingId,
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
      currency: currency || 'USDT',
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

  let query = {};

  if (type === 'client') {
    query.client = req.user._id;
  } else if (type === 'creator') {
    query.creator = req.user._id;
  } else {
    // If no type specified, return all bookings where user is either client or creator
    query = {
      $or: [
        { client: req.user._id },
        { creator: req.user._id }
      ]
    };
  }

  if (status) {
    if (query.$or) {
      query = {
        $and: [
          { $or: query.$or },
          { status }
        ]
      };
    } else {
      query.status = status;
    }
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

exports.acceptBooking = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id).populate('client creator');

  if (!booking) {
    return next(new ErrorHandler('Booking not found', 404));
  }

  // Only creator can accept
  if (booking.creator._id.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler('Only the creator can accept this booking', 403));
  }

  if (booking.status !== 'pending') {
    return next(new ErrorHandler('Booking can only be accepted when pending', 400));
  }

  booking.status = 'confirmed';
  await booking.save();

  // Send email notification to client
  emailConfig.sendEmail({
    to: booking.client.email,
    subject: 'Booking Accepted!',
    html: `
      <h1>Booking Accepted!</h1>
      <p>Hi ${booking.client.name},</p>
      <p>${booking.creator.name} has accepted your booking request for "${booking.serviceTitle}".</p>
      <p><strong>Amount:</strong> ${booking.amount} ${booking.currency}</p>
      <p>Please send payment to the escrow address to proceed:</p>
      <p style="background: #f5f5f5; padding: 12px; border-radius: 8px; font-family: monospace;">${booking.escrowWallet.address}</p>
      <p>Best regards,<br/>MyArteLab Team</p>
    `
  }).catch(err => console.error('Email failed:', err));

  successResponse(res, 200, 'Booking accepted successfully', { booking });
});

exports.rejectBooking = catchAsync(async (req, res, next) => {
  const { reason } = req.body;
  const booking = await Booking.findById(req.params.id).populate('client creator');

  if (!booking) {
    return next(new ErrorHandler('Booking not found', 404));
  }

  // Only creator can reject
  if (booking.creator._id.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler('Only the creator can reject this booking', 403));
  }

  if (booking.status !== 'pending') {
    return next(new ErrorHandler('Booking can only be rejected when pending', 400));
  }

  booking.status = 'cancelled';
  booking.cancelledAt = new Date();
  booking.cancellationReason = reason || 'Rejected by creator';
  await booking.save();

  // Send email notification to client
  emailConfig.sendEmail({
    to: booking.client.email,
    subject: 'Booking Request Declined',
    html: `
      <h1>Booking Request Declined</h1>
      <p>Hi ${booking.client.name},</p>
      <p>Unfortunately, ${booking.creator.name} is unable to accept your booking request for "${booking.serviceTitle}".</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      <p>You can browse other creators or modify your request and try again.</p>
      <p>Best regards,<br/>MyArteLab Team</p>
    `
  }).catch(err => console.error('Email failed:', err));

  successResponse(res, 200, 'Booking rejected successfully', { booking });
});

exports.counterProposal = catchAsync(async (req, res, next) => {
  const { amount } = req.body;
  const booking = await Booking.findById(req.params.id).populate('client creator');

  if (!booking) {
    return next(new ErrorHandler('Booking not found', 404));
  }

  // Only creator can make counter proposal
  if (booking.creator._id.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler('Only the creator can make a counter proposal', 403));
  }

  if (booking.status !== 'pending') {
    return next(new ErrorHandler('Counter proposal can only be made when booking is pending', 400));
  }

  if (!amount || amount <= 0) {
    return next(new ErrorHandler('Please provide a valid counter proposal amount', 400));
  }

  const platformCommission = tsaraConfig.commission;
  const platformFee = (amount * platformCommission) / 100;
  const creatorAmount = amount - platformFee;

  // Store counter proposal in metadata or add a message
  booking.counterProposal = {
    amount,
    creatorAmount,
    platformFee,
    proposedAt: new Date()
  };

  await booking.addMessage(req.user._id, `Counter proposal: ${booking.currency} ${amount.toFixed(2)}`);
  await booking.save();

  // Send email notification to client
  emailConfig.sendEmail({
    to: booking.client.email,
    subject: 'Counter Proposal Received',
    html: `
      <h1>Counter Proposal</h1>
      <p>Hi ${booking.client.name},</p>
      <p>${booking.creator.name} has made a counter proposal for "${booking.serviceTitle}".</p>
      <p><strong>Your Proposed Amount:</strong> ${booking.currency} ${booking.amount.toFixed(2)}</p>
      <p><strong>Counter Proposal:</strong> ${booking.currency} ${amount.toFixed(2)}</p>
      <p>Login to your account to review and respond to this proposal.</p>
      <p>Best regards,<br/>MyArteLab Team</p>
    `
  }).catch(err => console.error('Email failed:', err));

  successResponse(res, 200, 'Counter proposal sent successfully', { booking });
});
