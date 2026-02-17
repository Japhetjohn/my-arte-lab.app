const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },

  description: {
    type: String,
    required: true,
    maxlength: 5000
  },

  category: {
    type: String,
    required: true,
    enum: ['photography', 'videography', 'design', 'illustration', 'content', 'other'],
    lowercase: true
  },

  budget: {
    min: {
      type: Number,
      required: true,
      min: 0
    },
    max: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'USDC'
    },
    negotiable: {
      type: Boolean,
      default: true
    }
  },

  timeline: {
    type: String,
    required: true,
    enum: ['urgent', '1-week', '2-weeks', '1-month', '2-months', '3-months', 'flexible']
  },

  deadline: {
    type: Date,
    required: false
  },

  skillsRequired: [{
    type: String,
    trim: true
  }],

  deliverables: [{
    type: String,
    trim: true
  }],

  coverImage: {
    type: String,
    default: null
  },

  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  status: {
    type: String,
    enum: ['open', 'in_review', 'awaiting_payment', 'in_progress', 'delivered', 'completed', 'cancelled'],
    default: 'open',
    index: true
  },

  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'released', 'refunded', 'failed'],
    default: 'pending'
  },

  paidAt: Date,
  lastSubmissionDate: Date,

  platformCommission: {
    type: Number,
    required: true,
    default: 10
  },

  platformFee: {
    type: Number,
    required: false
  },

  creatorAmount: {
    type: Number,
    required: false
  },

  selectedCreatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  applicationsCount: {
    type: Number,
    default: 0
  },

  acceptedAmount: {
    type: Number,
    default: 0
  },

  viewsCount: {
    type: Number,
    default: 0
  },

  projectType: {
    type: String,
    enum: ['one-time', 'ongoing', 'bounty'],
    default: 'one-time'
  },

  attachments: [{
    url: String,
    filename: String,
    uploadedAt: Date
  }],

  visibility: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  messages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    read: {
      type: Boolean,
      default: false
    }
  }]
}, {
  timestamps: true
});

// Indexes for efficient queries
projectSchema.index({ status: 1, createdAt: -1 });
projectSchema.index({ category: 1, status: 1 });
projectSchema.index({ clientId: 1, status: 1 });
projectSchema.index({ 'budget.min': 1, 'budget.max': 1 });

projectSchema.pre('save', async function (next) {
  // If budget max is set and platform fee isn't calculated, do it
  // For projects, we use the agreed amount (budget.max usually represents the cap or agreed amount in applications)
  // However, the actual agreed amount comes from the Application.
  // We'll calculate this when the creator is selected or payment is processed.
  if (this.isModified('budget.max') || (this.budget.max && !this.platformFee)) {
    this.platformFee = (this.budget.max * this.platformCommission) / 100;
    this.creatorAmount = this.budget.max - this.platformFee;
  }
  next();
});

// Virtual for applications
projectSchema.virtual('applications', {
  ref: 'Application',
  localField: '_id',
  foreignField: 'projectId'
});

// Methods
projectSchema.methods.incrementViews = function () {
  this.viewsCount += 1;
  return this.save();
};

projectSchema.methods.incrementApplications = function () {
  this.applicationsCount += 1;
  return this.save();
};

projectSchema.methods.selectCreator = function (creatorId) {
  this.selectedCreatorId = creatorId;
  this.status = 'in_progress';
  return this.save();
};

projectSchema.methods.addMessage = async function (senderId, message) {
  this.messages.push({
    sender: senderId,
    message,
    timestamp: new Date()
  });
  return await this.save();
};

// Statics
projectSchema.statics.findOpenProjects = function (filters = {}) {
  const query = { status: 'open', visibility: 'public', ...filters };
  return this.find(query).populate('clientId', 'firstName lastName avatar email isEmailVerified').sort({ createdAt: -1 });
};

projectSchema.statics.findByCategory = function (category) {
  return this.find({ category, status: 'open', visibility: 'public' })
    .populate('clientId', 'firstName lastName avatar email isEmailVerified')
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('Project', projectSchema);
