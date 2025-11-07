const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  // Booking reference
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },

  // Reviewer (client)
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Reviewed creator
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Rating (1-5 stars)
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },

  // Review text
  comment: {
    type: String,
    maxlength: [1000, 'Review cannot exceed 1000 characters']
  },

  // Detailed ratings
  ratings: {
    communication: { type: Number, min: 1, max: 5 },
    quality: { type: Number, min: 1, max: 5 },
    timeliness: { type: Number, min: 1, max: 5 },
    professionalism: { type: Number, min: 1, max: 5 }
  },

  // Review status
  isPublished: {
    type: Boolean,
    default: true
  },

  // Creator response
  response: {
    message: String,
    respondedAt: Date
  },

  // Moderation
  isFlagged: {
    type: Boolean,
    default: false
  },

  flagReason: String,

  // Helpfulness
  helpfulVotes: {
    type: Number,
    default: 0
  },

  unhelpfulVotes: {
    type: Number,
    default: 0
  }

}, {
  timestamps: true
});

// Indexes
reviewSchema.index({ booking: 1 }, { unique: true }); // One review per booking
reviewSchema.index({ creator: 1, isPublished: 1 });
reviewSchema.index({ rating: -1 });
reviewSchema.index({ createdAt: -1 });

// Statics

// Get creator average rating
reviewSchema.statics.getCreatorAverageRating = async function(creatorId) {
  const result = await this.aggregate([
    {
      $match: {
        creator: mongoose.Types.ObjectId(creatorId),
        isPublished: true
      }
    },
    {
      $group: {
        _id: '$creator',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        avgCommunication: { $avg: '$ratings.communication' },
        avgQuality: { $avg: '$ratings.quality' },
        avgTimeliness: { $avg: '$ratings.timeliness' },
        avgProfessionalism: { $avg: '$ratings.professionalism' }
      }
    }
  ]);

  return result[0] || {
    averageRating: 0,
    totalReviews: 0
  };
};

// Update creator rating
reviewSchema.post('save', async function() {
  const User = mongoose.model('User');
  const stats = await this.constructor.getCreatorAverageRating(this.creator);

  await User.findByIdAndUpdate(this.creator, {
    'rating.average': Math.round(stats.averageRating * 10) / 10,
    'rating.count': stats.totalReviews
  });
});

// Update creator rating on delete
reviewSchema.post('remove', async function() {
  const User = mongoose.model('User');
  const stats = await this.constructor.getCreatorAverageRating(this.creator);

  await User.findByIdAndUpdate(this.creator, {
    'rating.average': Math.round(stats.averageRating * 10) / 10,
    'rating.count': stats.totalReviews
  });
});

module.exports = mongoose.model('Review', reviewSchema);
