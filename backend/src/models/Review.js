const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },

  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  creator: {
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
    maxlength: [1000, 'Review cannot exceed 1000 characters']
  },

  ratings: {
    communication: { type: Number, min: 1, max: 5 },
    quality: { type: Number, min: 1, max: 5 },
    timeliness: { type: Number, min: 1, max: 5 },
    professionalism: { type: Number, min: 1, max: 5 }
  },

  isPublished: {
    type: Boolean,
    default: true
  },

  response: {
    message: String,
    respondedAt: Date
  },

  isFlagged: {
    type: Boolean,
    default: false
  },

  flagReason: String,

  helpfulVotes: {
    type: Number,
    default: 0
  },

  unhelpfulVotes: {
    type: Number,
    default: 0
  },

  votedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    voteType: {
      type: String,
      enum: ['helpful', 'unhelpful']
    },
    votedAt: {
      type: Date,
      default: Date.now
    }
  }]

}, {
  timestamps: true
});

reviewSchema.index({ booking: 1 }, { unique: true });
reviewSchema.index({ creator: 1, isPublished: 1 });
reviewSchema.index({ rating: -1 });
reviewSchema.index({ createdAt: -1 });

reviewSchema.statics.getCreatorAverageRating = async function(creatorId) {
  const result = await this.aggregate([
    {
      $match: {
        creator: new mongoose.Types.ObjectId(creatorId),
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

reviewSchema.post('save', async function() {
  const User = mongoose.model('User');
  const stats = await this.constructor.getCreatorAverageRating(this.creator);

  await User.findByIdAndUpdate(this.creator, {
    'rating.average': stats.averageRating ? Math.round(stats.averageRating * 10) / 10 : 0,
    'rating.count': stats.totalReviews || 0
  });
});

reviewSchema.post('remove', async function() {
  const User = mongoose.model('User');
  const stats = await this.constructor.getCreatorAverageRating(this.creator);

  await User.findByIdAndUpdate(this.creator, {
    'rating.average': stats.averageRating ? Math.round(stats.averageRating * 10) / 10 : 0,
    'rating.count': stats.totalReviews || 0
  });
});

module.exports = mongoose.model('Review', reviewSchema);
