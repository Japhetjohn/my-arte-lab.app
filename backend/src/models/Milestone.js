const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },

  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },

  description: {
    type: String,
    required: true,
    maxlength: 1000
  },

  amount: {
    type: Number,
    required: true,
    min: 0
  },

  currency: {
    type: String,
    default: 'USDC'
  },

  dueDate: {
    type: Date,
    required: false
  },

  status: {
    type: String,
    enum: ['pending', 'in_progress', 'submitted', 'approved', 'paid'],
    default: 'pending',
    index: true
  },

  submittedAt: {
    type: Date,
    default: null
  },

  approvedAt: {
    type: Date,
    default: null
  },

  paidAt: {
    type: Date,
    default: null
  },

  deliverables: [{
    url: String,
    filename: String,
    uploadedAt: Date
  }],

  feedback: {
    type: String,
    maxlength: 1000
  },

  transactionId: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Indexes
milestoneSchema.index({ projectId: 1, status: 1 });
milestoneSchema.index({ status: 1, dueDate: 1 });

// Methods
milestoneSchema.methods.submit = function(deliverables = []) {
  this.status = 'submitted';
  this.submittedAt = new Date();
  this.deliverables = deliverables;
  return this.save();
};

milestoneSchema.methods.approve = function(feedback = '') {
  this.status = 'approved';
  this.approvedAt = new Date();
  this.feedback = feedback;
  return this.save();
};

milestoneSchema.methods.markPaid = function(transactionId) {
  this.status = 'paid';
  this.paidAt = new Date();
  this.transactionId = transactionId;
  return this.save();
};

// Statics
milestoneSchema.statics.findByProject = function(projectId) {
  return this.find({ projectId }).sort({ createdAt: 1 });
};

milestoneSchema.statics.getPendingMilestones = function(projectId) {
  return this.find({ projectId, status: { $in: ['pending', 'in_progress', 'submitted'] } })
    .sort({ dueDate: 1 });
};

module.exports = mongoose.model('Milestone', milestoneSchema);
