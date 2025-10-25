const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true
  },
  response: {
    text: String,
    respondedAt: Date
  }
}, { timestamps: true });

// Update creator's rating when a review is saved
reviewSchema.post('save', async function() {
  const User = require('./User');

  // Calculate average rating for the creator
  const reviews = await this.constructor.find({ creator: this.creator });
  const avgRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

  await User.findByIdAndUpdate(this.creator, {
    rating: avgRating,
    totalReviews: reviews.length
  });
});

module.exports = mongoose.model('Review', reviewSchema);
