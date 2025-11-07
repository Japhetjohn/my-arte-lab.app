const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  // Transaction Reference
  transactionId: {
    type: String,
    required: true,
    unique: true
  },

  // User
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Transaction Type
  type: {
    type: String,
    enum: [
      'deposit',           // Client adds funds
      'payment',           // Payment for booking
      'earning',           // Creator receives payment
      'withdrawal',        // Creator withdraws funds
      'refund',           // Refund to client
      'platform_fee',     // Platform commission collection
      'bonus',            // Promotional bonus
      'reversal'          // Transaction reversal
    ],
    required: true
  },

  // Amount
  amount: {
    type: Number,
    required: true
  },

  currency: {
    type: String,
    required: true,
    enum: ['USDT', 'USDC', 'DAI'],
    default: 'USDT'
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },

  // Blockchain Details
  fromAddress: String,
  toAddress: String,
  transactionHash: String,
  blockchainNetwork: String,
  confirmations: {
    type: Number,
    default: 0
  },

  // Related Booking (if applicable)
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },

  // Description
  description: String,

  // Fees
  gasFee: {
    type: Number,
    default: 0
  },

  platformFee: {
    type: Number,
    default: 0
  },

  netAmount: Number, // Amount after fees

  // Tsara Payment Gateway Reference
  tsaraPaymentId: String,
  tsaraPaymentStatus: String,

  // Metadata
  metadata: {
    ipAddress: String,
    userAgent: String,
    notes: String
  },

  // Timestamps
  processedAt: Date,
  completedAt: Date,
  failedAt: Date,

  // Error tracking
  errorMessage: String,
  errorCode: String

}, {
  timestamps: true
});

// Indexes
transactionSchema.index({ transactionId: 1 });
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ booking: 1 });
transactionSchema.index({ transactionHash: 1 });
transactionSchema.index({ tsaraPaymentId: 1 });

// Generate unique transaction ID before saving
transactionSchema.pre('save', async function(next) {
  if (!this.transactionId) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 10).toUpperCase();
    this.transactionId = `TXN-${timestamp}-${random}`;
  }

  // Calculate net amount
  if (!this.netAmount) {
    this.netAmount = this.amount - (this.gasFee || 0) - (this.platformFee || 0);
  }

  next();
});

// Methods

// Mark as completed
transactionSchema.methods.markCompleted = async function(transactionHash) {
  this.status = 'completed';
  this.completedAt = new Date();
  if (transactionHash) {
    this.transactionHash = transactionHash;
  }
  return await this.save();
};

// Mark as failed
transactionSchema.methods.markFailed = async function(errorMessage, errorCode) {
  this.status = 'failed';
  this.failedAt = new Date();
  this.errorMessage = errorMessage;
  this.errorCode = errorCode;
  return await this.save();
};

// Mark as processing
transactionSchema.methods.markProcessing = async function() {
  this.status = 'processing';
  this.processedAt = new Date();
  return await this.save();
};

// Statics

// Get user transaction history
transactionSchema.statics.getUserTransactions = async function(userId, limit = 20, skip = 0) {
  return await this.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('booking', 'bookingId serviceTitle')
    .lean();
};

// Get user balance summary
transactionSchema.statics.getUserBalanceSummary = async function(userId) {
  const result = await this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        status: 'completed'
      }
    },
    {
      $group: {
        _id: '$currency',
        totalDeposits: {
          $sum: {
            $cond: [{ $in: ['$type', ['deposit', 'earning', 'bonus']] }, '$netAmount', 0]
          }
        },
        totalWithdrawals: {
          $sum: {
            $cond: [{ $in: ['$type', ['withdrawal', 'payment']] }, '$netAmount', 0]
          }
        },
        totalRefunds: {
          $sum: {
            $cond: [{ $eq: ['$type', 'refund'] }, '$netAmount', 0]
          }
        }
      }
    }
  ]);

  return result;
};

// Get platform earnings
transactionSchema.statics.getPlatformEarnings = async function(startDate, endDate) {
  const match = {
    type: 'platform_fee',
    status: 'completed'
  };

  if (startDate && endDate) {
    match.completedAt = { $gte: startDate, $lte: endDate };
  }

  const result = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$currency',
        totalEarnings: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);

  return result;
};

module.exports = mongoose.model('Transaction', transactionSchema);
