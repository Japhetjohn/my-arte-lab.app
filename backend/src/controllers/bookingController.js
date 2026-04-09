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
const bookingService = require('../services/bookingService');
const metricsService = require('../services/metricsService');
const { isValidBookingAmount } = require('../utils/validators');
const { PLATFORM_CONFIG } = require('../utils/constants');

const PLATFORM_COMMISSION = parseFloat(process.env.PLATFORM_COMMISSION) || PLATFORM_CONFIG.COMMISSION_RATE;

exports.createBooking = catchAsync(async (req, res, next) => {
  const {
    creatorId,
    serviceTitle,
    serviceDescription,
    category,
    amount,
    currency,
    startDate,
    endDate,
    attachments
  } = req.body;

  const validation = isValidBookingAmount(amount);
  if (!validation.valid) {
    return next(new ErrorHandler(validation.error, 400));
  }

  const idempotencyKey = req.headers['idempotency-key'];

  try {
    console.log('[BookingController] Step 1: Creating booking with data:', { creatorId, amount, serviceTitle, category });
    const result = await bookingService.createBookingWithValidation(
      {
        creatorId,
        serviceTitle,
        serviceDescription,
        category,
        amount,
        currency,
        startDate,
        endDate,
        attachments
      },
      req.user._id,
      idempotencyKey
    );
    console.log('[BookingController] Step 2: Booking created, ID:', result.booking?._id);

    if (result.alreadyExists) {
      return successResponse(res, 200, 'Booking already exists', {
        booking: result.booking
      });
    }

    const { booking } = result;

    console.log('[BookingController] Step 3: Populating creator...');
    await booking.populate('creator', 'firstName lastName name email');
    console.log('[BookingController] Step 4: Creator populated, email:', booking.creator?.email);

    console.log('[BookingController] Step 5: Sending email...');
    emailConfig.sendEmail({
      to: booking.creator.email,
      subject: 'New Booking Request! ',
      html: `
        <h1>New Booking!</h1>
        <p>Hi ${booking.creator.name},</p>
        <p>You have received a new booking request from ${req.user.name}.</p>
        <p><strong>Service:</strong> ${serviceTitle}</p>
        <p><strong>Amount:</strong> ${amount} ${currency || 'USDC'}</p>
        <p><strong>Your Earnings:</strong> ${booking.creatorAmount} ${booking.currency} (after ${booking.platformCommission}% platform fee)</p>
        <p>Login to your account to view details.</p>
      `
    }).catch(err => console.error('Email failed:', err));

    adminNotificationService.notifyNewBooking(booking, req.user, booking.creator)
      .catch(err => console.error('Admin notification failed:', err));

    await Notification.createNotification({
      recipient: booking.creator._id,
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
  } catch (error) {
    console.error('[BookingController] Create booking error:', error.message, error.stack);
    if (error.statusCode === 404 && error.message.includes('Creator')) {
      return next(new ErrorHandler('Creator not found', 404));
    }
    if (error.statusCode === 400) {
      return next(error);
    }
    return next(new ErrorHandler(`Failed to create booking: ${error.message}`, 500));
  }
});

exports.getMyBookings = catchAsync(async (req, res, next) => {
  const { status, type, page = 1, limit = 20 } = req.query;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  let query = {};

  if (type === 'client') {
    query.client = req.user._id;
  } else if (type === 'creator') {
    query.creator = req.user._id;
  } else {
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

  const totalBookings = await Booking.countDocuments(query);

  const bookings = await Booking.find(query)
    .select('-messages') // Exclude messages array to prevent N+1 queries and reduce payload
    .populate('client', 'firstName lastName name avatar email')
    .populate('creator', 'firstName lastName name avatar email category')
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
    .populate('client', 'firstName lastName name avatar email')
    .populate('creator', 'firstName lastName name avatar email category wallet.address');

  if (!booking) {
    return next(new ErrorHandler('Booking not found', 404));
  }

  const isAuthorized =
    booking.client._id.toString() === req.user._id.toString() ||
    booking.creator._id.toString() === req.user._id.toString();

  if (!isAuthorized) {
    return next(new ErrorHandler('Not authorized to view this booking', 403));
  }

  // Determine available actions based on role and status
  const isCreator = booking.creator._id.toString() === req.user._id.toString();
  const isClient = booking.client._id.toString() === req.user._id.toString();
  const availableActions = [];

  if (isCreator) {
    // Creator actions
    if (booking.status === 'pending') {
      availableActions.push('accept', 'reject', 'counter-proposal');
    }
    if (['confirmed', 'in_progress'].includes(booking.status)) {
      availableActions.push('submit-deliverable');
    }
    if (booking.status === 'delivered') {
      availableActions.push('add-message');
    }
  }

  if (isClient) {
    // Client actions
    if (booking.status === 'awaiting_payment') {
      availableActions.push('pay');
    }
    if (booking.status === 'delivered') {
      availableActions.push('release-funds', 'dispute');
    }
    if (booking.status === 'completed' && !booking.review?.rating) {
      availableActions.push('leave-review');
    }
    if (['pending', 'awaiting_payment'].includes(booking.status)) {
      availableActions.push('cancel');
    }
  }

  // Both can add messages
  availableActions.push('add-message');

  successResponse(res, 200, 'Booking retrieved successfully', { 
    booking,
    availableActions
  });
});

exports.completeBooking = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return next(new ErrorHandler('Booking not found', 404));
  }

  if (booking.creator.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler('Only the creator can mark the booking as completed', 403));
  }

  // DEPRECATED: Use submitDeliverable instead
  // This endpoint now just redirects to submitDeliverable for backwards compatibility
  if (booking.status !== 'confirmed' && booking.status !== 'in_progress') {
    return next(new ErrorHandler(
      `Booking status is '${booking.status}'. ` +
      `Use /submit to submit deliverables first, then client releases funds.`, 
      400
    ));
  }

  // Auto-create a default deliverable and mark as delivered
  await bookingService.submitBookingDeliverable(
    req.params.id,
    req.user._id,
    {
      title: 'Work Completed',
      description: 'Creator marked this booking as completed',
      fileUrl: '',
      links: []
    }
  );

  // Re-fetch booking with updated status
  const updatedBooking = await Booking.findById(req.params.id);
  const client = await User.findById(booking.client);

  // Update creator metrics asynchronously (don't wait for it)
  metricsService.updateCreatorMetrics(booking.creator.toString())
    .catch(err => console.error('Failed to update creator metrics:', err));

  await Notification.createNotification({
    recipient: client._id,
    sender: req.user._id,
    type: 'booking_delivered',
    title: 'Work Submitted',
    message: `${req.user.name} has submitted work for your booking "${booking.serviceTitle}". Please review and release payment if satisfied.`,
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
    subject: 'Work Submitted for Review',
    html: `
      <h1>Work Submitted!</h1>
      <p>Hi ${client.name},</p>
      <p>${req.user.name} has submitted work for your booking.</p>
      <p><strong>Service:</strong> ${booking.serviceTitle}</p>
      <p>Please review the deliverables and release payment if satisfied.</p>
    `
  }).catch(err => console.error('Email failed:', err));

  successResponse(res, 200, 'Work submitted successfully', { booking: updatedBooking });
});

exports.releaseFunds = catchAsync(async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    
    // Validate rating if provided
    if (rating && (rating < 1 || rating > 5)) {
      return next(new ErrorHandler('Rating must be between 1 and 5', 400));
    }
    
    const result = await bookingService.releaseFundsWithTransaction(
      req.params.id,
      req.user._id,
      { rating, comment } // Pass review data
    );

    const { booking, creator, client } = result;

    emailConfig.sendEmail({
      to: creator.email,
      subject: 'Payment Received! ',
      html: `
        <h1>Payment Received!</h1>
        <p>Hi ${escapeHtml(creator.name)},</p>
        <p>Payment for "${escapeHtml(booking.serviceTitle)}" has been released!</p>
        <p><strong>Amount Received:</strong> ${escapeHtml(String(booking.creatorAmount))} ${escapeHtml(booking.currency)}</p>
        <p><strong>Platform Fee:</strong> ${escapeHtml(String(booking.platformFee))} ${escapeHtml(booking.currency)}</p>
        <p>The funds are now available in your wallet.</p>
      `
    }).catch(err => console.error('Email failed:', err));

    adminNotificationService.notifyPaymentReceived(booking, { amount: booking.creatorAmount })
      .catch(err => console.error('Admin notification failed:', err));

    await Notification.createNotification({
      recipient: creator._id,
      sender: client._id,
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

    await Notification.createNotification({
      recipient: client._id,
      sender: creator._id,
      type: 'system',
      title: 'Leave a Review',
      message: `Payment has been released for "${booking.serviceTitle}". How was your experience working with ${creator.name}? Leave a review to help other clients.`,
      link: `/bookings`,
      booking: booking._id,
      metadata: {
        bookingId: booking.bookingId,
        creatorId: creator._id
      }
    });

    successResponse(res, 200, 'Funds released successfully', {
      booking
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return next(new ErrorHandler('Booking not found', 404));
    }
    if (error.statusCode === 400) {
      return next(error);
    }
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
    const reason = booking.paymentStatus === 'paid' 
      ? 'Payment has already been made for this booking'
      : `Booking status is '${booking.status}'`;
    return next(new ErrorHandler(`This booking cannot be cancelled. ${reason}`, 400));
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
  const idempotencyKey = req.headers['idempotency-key'] || `accept-${req.params.id}-${req.user._id}-${Date.now()}`;

  // Check if booking exists and is in correct status first
  const existingBooking = await Booking.findById(req.params.id);
  if (!existingBooking) {
    return next(new ErrorHandler('Booking not found', 404));
  }
  
  if (existingBooking.creator.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler('Only the creator can accept this booking', 403));
  }
  
  // If already accepted, return success immediately (prevents double-click errors)
  if (existingBooking.status === 'awaiting_payment') {
    await existingBooking.populate('creator', 'firstName lastName name email');
    await existingBooking.populate('client', 'firstName lastName name email');
    return successResponse(res, 200, 'Booking already accepted', {
      booking: existingBooking
    });
  }
  
  if (existingBooking.status !== 'pending') {
    return next(new ErrorHandler(`Booking cannot be accepted (current status: ${existingBooking.status})`, 400));
  }

  try {
    const result = await bookingService.acceptBookingWithTransaction(
      req.params.id,
      req.user._id,
      idempotencyKey
    );

    if (result.alreadyProcessed) {
      return successResponse(res, 200, 'Booking already processed', {
        booking: result.booking
      });
    }

    const { booking, client } = result;

    await booking.populate('creator', 'firstName lastName name email');
    await booking.populate('client', 'firstName lastName name email');

    await Notification.createNotification({
      recipient: client._id,
      sender: booking.creator._id,
      type: 'booking_accepted',
      title: 'Booking Accepted',
      message: `${booking.creator.name} has accepted your booking for "${booking.serviceTitle}". Please proceed to payment to start the job.`,
      link: `/bookings`,
      booking: booking._id,
      metadata: {
        amount: booking.amount,
        currency: booking.currency,
        bookingId: booking.bookingId
      }
    });

    emailConfig.sendEmail({
      to: booking.client.email,
      subject: 'Booking Accepted - Payment Required',
      html: `
        <h1>Booking Accepted!</h1>
        <p>Hi ${booking.client.name},</p>
        <p>${booking.creator.name} has accepted your booking request for "${booking.serviceTitle}".</p>
        <p><strong>Amount:</strong> ${booking.amount} ${booking.currency}</p>
        <p>Please log in to your account and proceed to payment to start the job.</p>
        <p>Best regards,<br/>MyArteLab Team</p>
      `
    }).catch(err => console.error('Email failed:', err));

    successResponse(res, 200, 'Booking accepted successfully. Waiting for client payment.', {
      booking
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return next(new ErrorHandler('Booking not found or cannot be accepted', 404));
    }
    if (error.statusCode === 400 && error.message.includes('Insufficient balance')) {
      const booking = await Booking.findById(req.params.id).populate('client creator');
      if (booking) {
        await Notification.createNotification({
          recipient: booking.client._id,
          sender: booking.creator._id,
          type: 'insufficient_balance',
          title: 'Insufficient Wallet Balance',
          message: `Your booking request for "${booking.serviceTitle}" was accepted, but you have insufficient balance. Please fund your wallet with at least ${booking.amount} ${booking.currency}`,
          link: `/wallet`,
          booking: booking._id,
          metadata: {
            required: booking.amount,
            currency: booking.currency
          }
        });

        await Notification.createNotification({
          recipient: booking.creator._id,
          sender: booking.client._id,
          type: 'system',
          title: 'Client Wallet Balance Insufficient',
          message: `${booking.client.name} has insufficient wallet balance for booking "${booking.serviceTitle}". They need to fund their wallet before payment can be processed.`,
          link: `/bookings`,
          booking: booking._id
        });
      }
    }
    return next(error);
  }
});

exports.rejectBooking = catchAsync(async (req, res, next) => {
  const { reason } = req.body;
  const booking = await Booking.findById(req.params.id).populate('client creator');

  if (!booking) {
    return next(new ErrorHandler('Booking not found', 404));
  }

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

  booking.counterProposal = {
    amount,
    creatorAmount,
    platformFee,
    proposedAt: new Date(),
    applied: false
  };

  await booking.addMessage(req.user._id, `Counter proposal: ${booking.currency} ${amount.toFixed(2)}`);
  await booking.save();

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
exports.payBooking = catchAsync(async (req, res, next) => {
  const result = await bookingService.processBookingPayment(req.params.id, req.user._id);
  const { booking, client } = result;

  await booking.populate('creator', 'firstName lastName name email');

  await Notification.createNotification({
    recipient: booking.creator._id,
    sender: client._id,
    type: 'payment_received',
    title: 'Payment Received (Escrow)',
    message: `${client.name} has paid ${booking.amount} ${booking.currency} for "${booking.serviceTitle}". You can now start the work.`,
    link: `/bookings`,
    booking: booking._id,
    metadata: {
      amount: booking.amount,
      currency: booking.currency,
      bookingId: booking.bookingId
    }
  });

  successResponse(res, 200, 'Payment successful. Funds held in escrow.', { booking });
});

exports.submitDeliverable = catchAsync(async (req, res, next) => {
  const { title, description, fileUrl, links } = req.body;

  if (!fileUrl && !links) {
    return next(new ErrorHandler('Deliverable URL/file or links are required', 400));
  }

  const booking = await bookingService.submitBookingDeliverable(
    req.params.id,
    req.user._id,
    { 
      title: title || 'Deliverable Submitted',
      description: description || '',
      fileUrl: fileUrl || '',
      links: links || []
    }
  );

  await booking.populate('client', 'firstName lastName name email');

  await Notification.createNotification({
    recipient: booking.client._id,
    sender: req.user._id,
    type: 'booking_delivered',
    title: 'Work Delivered',
    message: `${req.user.name} has submitted work for your booking "${booking.serviceTitle}". Please review it.`,
    link: `/bookings`,
    booking: booking._id,
    metadata: {
      bookingId: booking.bookingId
    }
  });

  successResponse(res, 200, 'Deliverable submitted successfully', { booking });
});
