const mongoose = require('mongoose');

/**
 * WithdrawalTransaction Schema
 * 
 * Tracks off-ramp withdrawal attempts from user's USDC (on Solana) balance
 * to local fiat currency via Switch payment rails.
 * 
 * Manages the complete lifecycle: Quote -> Reservation -> Payout Initiation ->
 * Domestic Bank/Mobile Money Settlement / Reversal -> Audit Trail.
 */
const withdrawalTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Unique internal idempotency key to prevent double initiation or duplicate submission
  idempotencyKey: {
    type: String,
    sparse: true,
    index: true
  },

  // Unique UUID passed to Switch as transaction reference
  reference: {
    type: String,
    required: true,
    unique: true
  },

  // Source crypto asset details (authoritative source: USDC on Solana)
  sourceAsset: {
    type: String,
    default: 'solana:usdc'
  },
  sourceNetwork: {
    type: String,
    default: 'SOLANA'
  },
  amountUsdc: {
    type: Number,
    required: true,
    min: 0.01
  },

  // Destination fiat corridor
  destinationCountry: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  destinationCurrency: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  destinationAmount: {
    type: Number,
    required: true,
    min: 0.01
  },

  // Payout transfer rail
  payoutChannel: {
    type: String,
    enum: ['BANK', 'MOBILE_MONEY', 'MOBILEMONEY'],
    default: 'BANK',
    required: true
  },

  // Exchange rate and fee breakdown
  exchangeRate: {
    type: Number,
    required: true
  },
  fee: {
    total: { type: Number, default: 0 },
    platform: { type: Number, default: 0 },
    developer: { type: Number, default: 0 },
    currency: { type: String, default: 'USDC' }
  },

  // Quote snapshot captured from Switch
  quoteDetails: {
    quoteId: String,
    rate: Number,
    expiry: Date,
    settlementTime: String,
    rawQuote: mongoose.Schema.Types.Mixed
  },

  // Beneficiary details (Bank account or Mobile Money)
  beneficiary: {
    holderType: {
      type: String,
      enum: ['INDIVIDUAL', 'BUSINESS'],
      default: 'INDIVIDUAL'
    },
    holderName: {
      type: String,
      trim: true
    },
    accountName: {
      type: String,
      trim: true
    },
    accountNumber: {
      type: String,
      trim: true
    },
    bankCode: {
      type: String,
      trim: true
    },
    bankName: {
      type: String,
      trim: true
    },
    mobileNetwork: {
      type: String,
      trim: true
    },
    mobileNumber: {
      type: String,
      trim: true
    },
    routingCode: String,
    beneficiaryId: String,
    rawBeneficiary: mongoose.Schema.Types.Mixed
  },

  // Transfer memo and purpose code
  narration: {
    type: String,
    default: 'MyArteLab Payout',
    trim: true
  },
  reason: {
    type: String,
    default: 'SERVICE_CHARGES'
  },

  // Switch payout tracking identifier
  switchReference: {
    type: String
  },

  // Raw status reported by Switch
  switchStatus: {
    type: String,
    enum: [
      'INITIATED',
      'AWAITING_DEPOSIT',
      'PROCESSING',
      'COMPLETED',
      'FAILED',
      'REVERSED',
      'EXPIRED',
      'UNKNOWN'
    ],
    default: 'INITIATED'
  },

  // Controlled MyArteLab state machine
  status: {
    type: String,
    enum: [
      'draft',        // Quote requested, not yet confirmed/reserved
      'reserved',     // Funds locked in wallet.pendingWithdrawal
      'processing',   // Switch payout initiated and executing on payment rail
      'completed',    // Domestic settlement confirmed by bank/mobile money
      'failed',       // Payout rejected or failed
      'reversed',     // Payout reversed, funds refunded back to available balance
      'cancelled'     // User cancelled draft before confirmation
    ],
    default: 'draft',
    index: true
  },

  // Balance reservation tracking (safeguard against double spending)
  reservation: {
    isReserved: { type: Boolean, default: false },
    reservedAt: Date,
    releasedAt: Date,
    settledAt: Date
  },

  failureReason: {
    type: String
  },
  reversalDetails: {
    type: mongoose.Schema.Types.Mixed
  },
  completedAt: {
    type: Date
  },

  // Audit trail of Switch webhook deliveries
  webhookEvents: [
    {
      eventId: String,
      status: String,
      timestamp: {
        type: Date,
        default: Date.now
      },
      payload: mongoose.Schema.Types.Mixed
    }
  ],

  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

withdrawalTransactionSchema.index({ user: 1, createdAt: -1 });
withdrawalTransactionSchema.index({ status: 1, createdAt: -1 });
withdrawalTransactionSchema.index({ reference: 1 });

module.exports = mongoose.model('WithdrawalTransaction', withdrawalTransactionSchema);
