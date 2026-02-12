const mongoose = require('mongoose');
const { BOOKING_LIMITS } = require('../utils/constants');

const bookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    required: true,
    unique: true
  },

  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },

  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  serviceTitle: {
    type: String,
    required: true
  },

  serviceDescription: {
    type: String,
    required: true
  },

  category: {
    type: String,
    required: true
  },

  amount: {
    type: Number,
    required: true,
    min: BOOKING_LIMITS.MIN_AMOUNT,
    max: BOOKING_LIMITS.MAX_AMOUNT
  },

  currency: {
    type: String,
    required: true,
    enum: ['USDC', 'DAI'],
    default: 'USDC'
  },

  platformCommission: {
    type: Number,
    required: true,
    default: 10
  },

  platformFee: {
    type: Number,
    required: true
  },

  creatorAmount: {
    type: Number,
    required: true
  },

  escrowWallet: {
    address: {
      type: String,
      required: true,
      unique: true
    },
    escrowId: {
      type: String
    },
    balance: {
      type: Number,
      default: 0
    },
    isPaid: {
      type: Boolean,
      default: false
    },
    paidAt: Date,
    txHash: String,
    network: {
      type: String,
      default: 'Solana'
    }
  },

  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'released', 'refunded', 'failed'],
    default: 'pending'
  },

  status: {
    type: String,
    enum: ['pending', 'awaiting_payment', 'confirmed', 'in_progress', 'delivered', 'completed', 'cancelled', 'disputed'],
    default: 'pending'
  },

  startDate: {
    type: Date,
    required: true
  },

  endDate: {
    type: Date,
    required: true
  },

  completedAt: Date,
  cancelledAt: Date,

  attachments: [{
    type: String
  }],

  deliverables: [{
    title: String,
    description: String,
    fileUrl: String,
    uploadedAt: Date
  }],

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
  }],

  counterProposal: {
    amount: Number,
    creatorAmount: Number,
    platformFee: Number,
    proposedAt: Date,
    applied: {
      type: Boolean,
      default: false
    }
  },

  review: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    createdAt: Date
  },

  cancellationReason: String,
  disputeReason: String,
  disputeResolution: String,

  fundsReleased: {
    type: Boolean,
    default: false
  },

  fundsReleasedAt: Date,

  platformFeePaid: {
    type: Boolean,
    default: false
  },

  platformFeePaidAt: Date,
  platformFeeTransactionHash: String,

  lastSubmissionDate: Date,

  metadata: {
    clientIP: String,
    userAgent: String,
    notes: String
  }

}, {
  timestamps: true
});

bookingSchema.index({ client: 1, status: 1 });
bookingSchema.index({ creator: 1, status: 1 });
bookingSchema.index({ paymentStatus: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ createdAt: -1 });
bookingSchema.index({ _id: 1, status: 1, __v: 1 });

bookingSchema.pre('save', async function (next) {
  if (!this.bookingId) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.bookingId = `BKG-${timestamp}-${random}`;
  }

  if (!this.platformFee) {
    this.platformFee = (this.amount * this.platformCommission) / 100;
    this.creatorAmount = this.amount - this.platformFee;
  }

  next();
});

bookingSchema.methods.canBeCancelled = function () {
  return ['pending', 'confirmed'].includes(this.status);
};

bookingSchema.methods.canReleaseFunds = function () {
  return (
    this.status === 'completed' &&
    this.paymentStatus === 'paid' &&
    !this.fundsReleased
  );
};

bookingSchema.methods.markCompleted = async function () {
  this.status = 'completed';
  this.completedAt = new Date();
  return await this.save();
};

bookingSchema.methods.releaseFunds = async function () {
  if (!this.canReleaseFunds()) {
    throw new Error('Funds cannot be released for this booking');
  }

  this.fundsReleased = true;
  this.fundsReleasedAt = new Date();
  this.paymentStatus = 'released';

  return await this.save();
};

bookingSchema.methods.addMessage = async function (senderId, message) {
  this.messages.push({
    sender: senderId,
    message,
    timestamp: new Date()
  });
  return await this.save();
};

bookingSchema.methods.addDeliverable = async function (deliverable) {
  this.deliverables.push({
    ...deliverable,
    uploadedAt: new Date()
  });
  return await this.save();
};

module.exports = mongoose.model('Booking', bookingSchema);
