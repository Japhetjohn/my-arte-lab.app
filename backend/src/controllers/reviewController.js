const Review = require('../models/Review');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { successResponse } = require('../utils/apiResponse');
const { ErrorHandler, catchAsync } = require('../utils/errorHandler');
const emailConfig = require('../config/email');

exports.createReview = catchAsync(async (req, res, next) => {
  const { bookingId, rating, comment, ratings } = req.body;

  const booking = await Booking.findById(bookingId).populate('creator', 'name email');

  if (!booking) {
    return next(new ErrorHandler('Booking not found', 404));
  }

  if (booking.client.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler('Only the client can review this booking', 403));
  }

  if (booking.status !== 'completed') {
    return next(new ErrorHandler('You can only review completed bookings', 400));
  }

  const existingReview = await Review.findOne({ booking: bookingId });
  if (existingReview) {
    return next(new ErrorHandler('You have already reviewed this booking', 400));
  }

  const review = await Review.create({
    booking: bookingId,
    reviewer: req.user._id,
    creator: booking.creator._id,
    rating,
    comment,
    ratings
  });

  booking.review = {
    rating,
    comment,
    createdAt: review.createdAt
  };
  await booking.save();

  emailConfig.sendEmail({
    to: booking.creator.email,
    subject: 'New Review Received! ',
    html: `
      <h1>New Review!</h1>
      <p>Hi ${booking.creator.name},</p>
      <p>You received a ${rating}-star review from ${req.user.name}.</p>
      ${comment ? `<p><em>"${comment}"</em></p>` : ''}
      <p>Login to your account to view details.</p>
    `
  }).catch(err => console.error('Email failed:', err));

  successResponse(res, 201, 'Review submitted successfully', { review });
});

exports.getCreatorReviews = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const reviews = await Review.find({
    creator: req.params.creatorId,
    isPublished: true
  })
    .populate('reviewer', 'name avatar')
    .populate('booking', 'serviceTitle createdAt')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(skip)
    .lean();

  const total = await Review.countDocuments({
    creator: req.params.creatorId,
    isPublished: true
  });

  const ratingStats = await Review.getCreatorAverageRating(req.params.creatorId);

  successResponse(res, 200, 'Reviews retrieved successfully', {
    reviews,
    stats: ratingStats,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
});

exports.respondToReview = catchAsync(async (req, res, next) => {
  const { message } = req.body;

  const review = await Review.findById(req.params.id);

  if (!review) {
    return next(new ErrorHandler('Review not found', 404));
  }

  if (review.creator.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler('You can only respond to your own reviews', 403));
  }

  review.response = {
    message,
    respondedAt: new Date()
  };
  await review.save();

  successResponse(res, 200, 'Response added successfully', { review });
});

exports.markHelpful = catchAsync(async (req, res, next) => {
  const { helpful } = req.body;

  const review = await Review.findById(req.params.id);

  if (!review) {
    return next(new ErrorHandler('Review not found', 404));
  }

  if (helpful) {
    review.helpfulVotes += 1;
  } else {
    review.unhelpfulVotes += 1;
  }

  await review.save();

  successResponse(res, 200, 'Vote recorded successfully', { review });
});
