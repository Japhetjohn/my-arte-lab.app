const Booking = require('../models/Booking');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const { successResponse } = require('../utils/apiResponse');
const { ErrorHandler, catchAsync } = require('../utils/errorHandler');
const emailConfig = require('../config/email');
const adminNotificationService = require('../services/adminNotificationService');
const { escapeHtml } = require('../utils/sanitize');
const { v4: uuidv4 } = require('uuid');

// Platform configuration
const PLATFORM_COMMISSION = parseFloat(process.env.PLATFORM_COMMISSION) || 10;

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

  // Check if client has sufficient balance
  const client = await User.findById(req.user._id);
  if (client.wallet.balance < amount) {
    return next(new ErrorHandler('Insufficient balance to create booking', 400));
  }

  const platformCommission = PLATFORM_COMMISSION;
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
      address: `escrow-${bookingId}`,  // Database-only escrow identifier
      balance: amount  // Track escrow balance in database
    }
  });

  // Deduct funds from client's wallet (hold in escrow)
  client.wallet.balance -= amount;
  client.wallet.pendingBalance += amount;
  await client.save({ validateBeforeSave: false });

  // Create escrow transaction record
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

  // Create notification for creator
  await Notification.createNotification({
    recipient: creator._id,
    sender: req.user._id,
    type: 'booking_request',
    title: 'New Booking Request',
    message: `${req.user.name} has sent you a booking request for ${serviceTitle}`,
    link: `/bookings`,
    booking: booking._id,
    metadata: {
      amount: booking.amount,
      currency: booking.currency,
      bookingId: booking.bookingId
    }
  });

  successResponse(res, 201, 'Booking created successfully', {
    booking,
    paymentInstructions: {
      message: 'Creator will review your request first. Payment will be auto-deducted from your wallet once approved.',
      amount: booking.amount,
      currency: booking.currency,
      note: 'Please ensure you have sufficient balance in your wallet'
    }
  });
});

exports.getMyBookings = catchAsync(async (req, res, next) => {
  const { status, type, page = 1, limit = 20 } = req.query;

  // Parse pagination params
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

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

  // Get total count for pagination
  const totalBookings = await Booking.countDocuments(query);

  const bookings = await Booking.find(query)
    .select('-messages') // Exclude messages array to prevent N+1 queries and reduce payload
    .populate('client', 'name avatar email')
    .populate('creator', 'name avatar email category')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  successResponse(res, 200, 'Bookings retrieved successfully', {
    bookings,
    pagination: {
      total: totalBookings,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalBookings / limitNum)
    }
  });
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

  // Create notification for client
  await Notification.createNotification({
    recipient: client._id,
    sender: req.user._id,
    type: 'booking_completed',
    title: 'Work Completed',
    message: `${req.user.name} has marked your booking "${booking.serviceTitle}" as completed. Please review the work and release payment if satisfied.`,
    link: `/bookings`,
    booking: booking._id,
    metadata: {
      bookingId: booking.bookingId,
      amount: booking.amount,
      currency: booking.currency
    }
  });

  emailConfig.sendEmail({
    to: client.email,
    subject: 'Booking Completed',
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
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return next(new ErrorHandler('Booking not found', 404));
  }

  // Check authorization before populating (client is ObjectId at this point)
  if (booking.client.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler('Only the client can release funds', 403));
  }

  // Now populate the needed fields
  await booking.populate('creator', 'wallet.address name email');
  await booking.populate('client', 'name');

  if (!booking.canReleaseFunds()) {
    return next(new ErrorHandler('Funds cannot be released for this booking', 400));
  }

  try {
    // Verify escrow wallet has sufficient balance before releasing funds
    if (booking.escrowWallet.balance < booking.amount) {
      return next(new ErrorHandler('Insufficient funds in escrow', 400));
    }

    // Release funds from escrow
    await booking.releaseFunds();
    booking.platformFeePaid = true;
    booking.platformFeePaidAt = new Date();
    booking.escrowWallet.balance = 0;  // Clear escrow balance
    await booking.save();

    // Create transaction records
    await Transaction.create([
      {
        user: booking.creator._id,
        type: 'earning',
        amount: booking.creatorAmount,
        currency: booking.currency,
        status: 'completed',
        booking: booking._id,
        toAddress: booking.creator.wallet.address,
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
        description: `Platform fee for ${booking.bookingId}`,
        completedAt: new Date()
      }
    ]);

    // Update client's pending balance (release from escrow)
    const client = await User.findById(booking.client._id);
    client.wallet.pendingBalance -= booking.amount;
    await client.save({ validateBeforeSave: false });

    // Update creator balance and stats (do all updates in memory, then save once)
    const creator = await User.findById(booking.creator._id);
    creator.wallet.balance += booking.creatorAmount;
    creator.wallet.totalEarnings += booking.creatorAmount;
    creator.wallet.lastUpdated = Date.now();
    creator.completedBookings += 1;
    await creator.save();

    emailConfig.sendEmail({
      to: booking.creator.email,
      subject: 'Payment Received! ',
      html: `
        <h1>Payment Received!</h1>
        <p>Hi ${escapeHtml(booking.creator.name)},</p>
        <p>Payment for "${escapeHtml(booking.serviceTitle)}" has been released!</p>
        <p><strong>Amount Received:</strong> ${escapeHtml(String(booking.creatorAmount))} ${escapeHtml(booking.currency)}</p>
        <p><strong>Platform Fee:</strong> ${escapeHtml(String(booking.platformFee))} ${escapeHtml(booking.currency)}</p>
        <p>The funds are now available in your wallet.</p>
      `
    }).catch(err => console.error('Email failed:', err));

    adminNotificationService.notifyPaymentReceived(booking, { amount: booking.creatorAmount })
      .catch(err => console.error('Admin notification failed:', err));

    // Create notification for creator about payment
    await Notification.createNotification({
      recipient: booking.creator._id,
      sender: booking.client._id,
      type: 'payment_received',
      title: 'Payment Received',
      message: `Payment of ${booking.creatorAmount} ${booking.currency} for "${booking.serviceTitle}" has been released to your wallet`,
      link: `/wallet`,
      booking: booking._id,
      metadata: {
        amount: booking.creatorAmount,
        currency: booking.currency,
        bookingId: booking.bookingId
      }
    });

    // Create notification for client to leave a review
    await Notification.createNotification({
      recipient: booking.client._id,
      sender: booking.creator._id,
      type: 'system',
      title: 'Leave a Review',
      message: `Payment has been released for "${booking.serviceTitle}". How was your experience working with ${booking.creator.name}? Leave a review to help other clients.`,
      link: `/bookings`,
      booking: booking._id,
      metadata: {
        bookingId: booking.bookingId,
        creatorId: booking.creator._id
      }
    });

    successResponse(res, 200, 'Funds released successfully', {
      booking,
      transactions: releaseResult
    });

  } catch (error) {
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

  // Get client's wallet balance
  const client = await User.findById(booking.client._id);

  if (!client.wallet || client.wallet.balance < booking.amount) {
    // Create notification for client about insufficient balance
    await Notification.createNotification({
      recipient: client._id,
      sender: booking.creator._id,
      type: 'insufficient_balance',
      title: 'Insufficient Wallet Balance',
      message: `Your booking request for "${booking.serviceTitle}" was accepted, but you have insufficient balance. Please fund your wallet with at least ${booking.amount} ${booking.currency}`,
      link: `/wallet`,
      booking: booking._id,
      metadata: {
        required: booking.amount,
        current: client.wallet?.balance || 0,
        currency: booking.currency
      }
    });

    // Also notify creator about the issue
    await Notification.createNotification({
      recipient: booking.creator._id,
      sender: client._id,
      type: 'system',
      title: 'Client Wallet Balance Insufficient',
      message: `${client.name} has insufficient wallet balance for booking "${booking.serviceTitle}". They need to fund their wallet before payment can be processed. You will be notified once they fund their wallet.`,
      link: `/bookings`,
      booking: booking._id
    });

    return next(new ErrorHandler(`Cannot accept booking: ${client.name}'s wallet balance is insufficient. Required: ${booking.amount} ${booking.currency}, Available: ${client.wallet?.balance || 0} ${booking.currency}. The client has been notified to fund their wallet. You will be notified once they have sufficient funds.`, 400));
  }

  // Deduct payment from client's wallet automatically
  try {
    await client.updateWalletBalance(booking.amount, 'subtract');
    await client.save();

    // Create transaction record for deduction
    await Transaction.create({
      user: client._id,
      type: 'payment',
      amount: booking.amount,
      currency: booking.currency,
      status: 'completed',
      booking: booking._id,
      description: `Payment for ${booking.serviceTitle}`,
      completedAt: new Date()
    });

    // Update booking status and payment status
    booking.status = 'confirmed';
    booking.paymentStatus = 'paid';
    booking.paidAt = new Date();
    await booking.save();

    // Create notification for client
    await Notification.createNotification({
      recipient: client._id,
      sender: booking.creator._id,
      type: 'booking_accepted',
      title: 'Booking Accepted',
      message: `${booking.creator.name} has accepted your booking for "${booking.serviceTitle}". Payment of ${booking.amount} ${booking.currency} has been deducted from your wallet and held in escrow.`,
      link: `/bookings`,
      booking: booking._id,
      metadata: {
        amount: booking.amount,
        currency: booking.currency,
        bookingId: booking.bookingId
      }
    });

    // Create notification for payment deduction
    await Notification.createNotification({
      recipient: client._id,
      type: 'payment_deducted',
      title: 'Payment Deducted',
      message: `${booking.amount} ${booking.currency} has been deducted from your wallet for booking ${booking.bookingId}`,
      link: `/wallet`,
      booking: booking._id,
      metadata: {
        amount: booking.amount,
        currency: booking.currency,
        newBalance: client.wallet.balance
      }
    });

    // Send email notification to client
    emailConfig.sendEmail({
      to: booking.client.email,
      subject: 'Booking Accepted and Payment Processed',
      html: `
        <h1>Booking Accepted!</h1>
        <p>Hi ${booking.client.name},</p>
        <p>${booking.creator.name} has accepted your booking request for "${booking.serviceTitle}".</p>
        <p><strong>Amount:</strong> ${booking.amount} ${booking.currency}</p>
        <p><strong>Payment Status:</strong> Payment has been automatically deducted from your wallet and is being held in escrow.</p>
        <p>The funds will be released to the creator once the job is completed and you approve.</p>
        <p>Best regards,<br/>MyArteLab Team</p>
      `
    }).catch(err => console.error('Email failed:', err));

    successResponse(res, 200, 'Booking accepted and payment processed successfully', { booking });
  } catch (error) {
    return next(new ErrorHandler('Failed to process payment. Please try again.', 500));
  }
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

  // Create notification for client
  await Notification.createNotification({
    recipient: booking.client._id,
    sender: booking.creator._id,
    type: 'booking_rejected',
    title: 'Booking Request Declined',
    message: `${booking.creator.name} has declined your booking request for "${booking.serviceTitle}"${reason ? `. Reason: ${reason}` : ''}`,
    link: `/bookings`,
    booking: booking._id,
    metadata: {
      reason,
      bookingId: booking.bookingId
    }
  });

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

  const platformCommission = PLATFORM_COMMISSION;
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

  // Create notification for client
  await Notification.createNotification({
    recipient: booking.client._id,
    sender: booking.creator._id,
    type: 'counter_proposal',
    title: 'Counter Proposal Received',
    message: `${booking.creator.name} has made a counter proposal of ${booking.currency} ${amount.toFixed(2)} for "${booking.serviceTitle}"`,
    link: `/bookings`,
    booking: booking._id,
    metadata: {
      originalAmount: booking.amount,
      counterAmount: amount,
      currency: booking.currency,
      bookingId: booking.bookingId
    }
  });

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
