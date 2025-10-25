const Review = require('../models/Review');
const Booking = require('../models/Booking');
const User = require('../models/User');

// @desc    Create review for a booking
// @route   POST /api/reviews
// @access  Private (Client only)
const createReview = async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;

    if (req.user.role !== 'client') {
      return res.status(403).json({ message: 'Only clients can create reviews' });
    }

    // Check if booking exists and is completed
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only review your own bookings' });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({ message: 'Can only review completed bookings' });
    }

    // Check if review already exists
    if (booking.review) {
      return res.status(400).json({ message: 'Booking already has a review' });
    }

    // Create review
    const review = await Review.create({
      booking: bookingId,
      creator: booking.creator,
      client: req.user._id,
      rating,
      comment
    });

    // Update booking with review
    booking.review = review._id;
    await booking.save();

    // Add review to creator's reviews
    const creator = await User.findById(booking.creator);
    creator.reviews.push(review._id);
    await creator.save();

    const populatedReview = await Review.findById(review._id)
      .populate('client', 'email profile')
      .populate('creator', 'email profile')
      .populate('booking');

    res.status(201).json(populatedReview);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get reviews for a creator
// @route   GET /api/reviews/creator/:creatorId
// @access  Public
const getCreatorReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ creator: req.params.creatorId })
      .populate('client', 'profile.name')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get review by ID
// @route   GET /api/reviews/:id
// @access  Public
const getReviewById = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate('client', 'email profile')
      .populate('creator', 'email profile')
      .populate('booking');

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    res.json(review);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Creator responds to review
// @route   PUT /api/reviews/:id/response
// @access  Private (Creator only)
const respondToReview = async (req, res) => {
  try {
    const { responseText } = req.body;
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    if (review.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only respond to your own reviews' });
    }

    review.response = {
      text: responseText,
      respondedAt: new Date()
    };

    await review.save();

    const updatedReview = await Review.findById(review._id)
      .populate('client', 'profile.name')
      .populate('creator', 'email profile');

    res.json(updatedReview);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createReview,
  getCreatorReviews,
  getReviewById,
  respondToReview
};
