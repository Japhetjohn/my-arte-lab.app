const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },

  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  coverLetter: {
    type: String,
    required: true,
    maxlength: 2000
  },

  proposedBudget: {
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'USDC'
    }
  },

  proposedTimeline: {
    type: String,
    required: true,
    maxlength: 200
  },

  portfolioLinks: [{
    url: {
      type: String,
      trim: true
    },
    title: {
      type: String,
      trim: true
    }
  }],

  attachments: [{
    url: String,
    filename: String,
    uploadedAt: Date
  }],

  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'withdrawn'],
    default: 'pending',
    index: true
  },

  reviewedAt: {
    type: Date,
    default: null
  },

  reviewNotes: {
    type: String,
    maxlength: 1000
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate applications
applicationSchema.index({ projectId: 1, creatorId: 1 }, { unique: true });

// Indexes for efficient queries
applicationSchema.index({ status: 1, createdAt: -1 });
applicationSchema.index({ creatorId: 1, status: 1 });

// Methods
applicationSchema.methods.accept = function(reviewNotes = '') {
  this.status = 'accepted';
  this.reviewedAt = new Date();
  this.reviewNotes = reviewNotes;
  return this.save();
};

applicationSchema.methods.reject = function(reviewNotes = '') {
  this.status = 'rejected';
  this.reviewedAt = new Date();
  this.reviewNotes = reviewNotes;
  return this.save();
};

applicationSchema.methods.withdraw = function() {
  this.status = 'withdrawn';
  return this.save();
};

// Statics
applicationSchema.statics.findByProject = function(projectId) {
  return this.find({ projectId })
    .populate('creatorId', 'name avatar email category portfolio rating isEmailVerified')
    .sort({ createdAt: -1 });
};

applicationSchema.statics.findByCreator = function(creatorId) {
  return this.find({ creatorId })
    .populate('projectId')
    .sort({ createdAt: -1 });
};

applicationSchema.statics.checkExistingApplication = async function(projectId, creatorId) {
  const existing = await this.findOne({ projectId, creatorId });
  return !!existing;
};

module.exports = mongoose.model('Application', applicationSchema);
