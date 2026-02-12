const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true
  },

  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  type: {
    type: String,
    enum: [
      'deposit',
      'payment',
      'earning',
      'withdrawal',
      'refund',
      'platform_fee',
      'bonus',
      'reversal',
      'onramp',
      'offramp'
    ],
    required: true
  },

  amount: {
    type: Number,
    required: true
  },

  currency: {
    type: String,
    required: true,
    enum: ['USDT', 'USDC', 'DAI', 'NGN'],
    default: 'USDT'
  },

  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },

  fromAddress: String,
  toAddress: String,
  transactionHash: String,
  blockchainNetwork: String,
  confirmations: {
    type: Number,
    default: 0
  },

  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },

  description: String,

  gasFee: {
    type: Number,
    default: 0
  },

  platformFee: {
    type: Number,
    default: 0
  },

  netAmount: Number,

  // HostFi-specific fields
  reference: String,                 // Unique reference for the transaction
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'mobile_money', 'crypto', 'card', ''],
    default: ''
  },
  paymentDetails: {
    accountNumber: String,
    accountName: String,
    bankName: String,
    bankCode: String,

    beneficiaryAccountNumber: String,
    beneficiaryAccountName: String,
    beneficiaryBankName: String,
    beneficiaryBankCode: String,

    targetCurrency: String,
    targetAmount: Number,
    exchangeRate: Number,
    network: String,
    walletAddress: String,
    paymentInstructions: mongoose.Schema.Types.Mixed,
    depositAddress: String,
    depositInstructions: mongoose.Schema.Types.Mixed,

    reference: String,
    expiresAt: Date
  },

  metadata: {
    ipAddress: String,
    userAgent: String,
    notes: String,
    hostfiReference: String,
    provider: {
      type: String,
      default: 'hostfi'
    },
    country: String,
    recordType: String,
    collectionChannelId: String
  },

  processedAt: Date,
  completedAt: Date,
  failedAt: Date,

  errorMessage: String,
  errorCode: String

}, {
  timestamps: true
});

transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ booking: 1 });
transactionSchema.index({ transactionHash: 1 });
transactionSchema.index({ reference: 1 });
transactionSchema.index({ user: 1, reference: 1 });
transactionSchema.index({ 'metadata.hostfiReference': 1 });
transactionSchema.index({ 'metadata.provider': 1 });

transactionSchema.pre('save', async function (next) {
  if (!this.transactionId) {
    this.transactionId = generateTransactionId();
  }

  if (!this.netAmount) {
    this.netAmount = this.amount - (this.gasFee || 0) - (this.platformFee || 0);
  }

  next();
});

transactionSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update.$set && !update.$set.transactionId) {
    update.$set.transactionId = generateTransactionId();
  } else if (!update.transactionId && !update.$set) {
    update.transactionId = generateTransactionId();
  }
  next();
});

function generateTransactionId() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `TXN-${timestamp}-${random}`;
}

transactionSchema.methods.markCompleted = async function (transactionHash) {
  this.status = 'completed';
  this.completedAt = new Date();
  if (transactionHash) {
    this.transactionHash = transactionHash;
  }
  return await this.save();
};

transactionSchema.methods.markFailed = async function (errorMessage, errorCode) {
  this.status = 'failed';
  this.failedAt = new Date();
  this.errorMessage = errorMessage;
  this.errorCode = errorCode;
  return await this.save();
};

transactionSchema.methods.markProcessing = async function () {
  this.status = 'processing';
  this.processedAt = new Date();
  return await this.save();
};

transactionSchema.statics.getUserTransactions = async function (userId, limit = 20, skip = 0) {
  return await this.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('booking', 'bookingId serviceTitle')
    .lean();
};

transactionSchema.statics.getUserBalanceSummary = async function (userId) {
  const result = await this.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        status: 'completed'
      }
    },
    {
      $group: {
        _id: '$currency',
        totalDeposits: {
          $sum: {
            $cond: [{ $in: ['$type', ['deposit', 'earning', 'bonus', 'onramp']] }, '$netAmount', 0]
          }
        },
        totalWithdrawals: {
          $sum: {
            $cond: [{ $in: ['$type', ['withdrawal', 'payment', 'offramp']] }, '$netAmount', 0]
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

transactionSchema.statics.getPlatformEarnings = async function (startDate, endDate) {
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
