const mongoose = require('mongoose');

/**
 * FundingTransaction Schema
 * 
 * Tracks on-ramp funding attempts from local fiat currency via Switch to USDC on Solana.
 * Maintains a strict state machine, idempotency, deposit instructions, and webhook event audit log.
 */
const fundingTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Idempotency key to prevent double initiation or duplicate submission
  idempotencyKey: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Unique UUID passed to Switch as transaction reference
  reference: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Fiat funding origin
  country: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  fiatCurrency: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  fiatAmount: {
    type: Number,
    required: true,
    min: 0.01
  },

  // Payment channel
  channel: {
    type: String,
    enum: ['BANK', 'MOBILEMONEY'],
    default: 'BANK',
    required: true
  },

  // Destination crypto asset strictly enforced
  destinationAsset: {
    type: String,
    default: 'solana:usdc'
  },
  destinationNetwork: {
    type: String,
    default: 'SOLANA'
  },
  destinationAddress: {
    type: String,
    required: true,
    trim: true
  },

  // Conversion quote details
  quoteRate: {
    type: Number,
    required: true
  },
  quotedUsdcAmount: {
    type: Number,
    required: true
  },
  quoteExpiry: {
    type: Date
  },

  // Raw Switch status from initiation and webhooks
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

  // Controlled MyArteLab lifecycle status
  status: {
    type: String,
    enum: [
      'pending',     // AWAITING_DEPOSIT: instructions displayed, waiting for user transfer
      'processing',  // PROCESSING: payment detected by Switch, settlement underway
      'completed',   // COMPLETED: on-chain settlement confirmed
      'failed',      // FAILED: deposit failed or rejected
      'expired',     // EXPIRED: payment window elapsed without deposit
      'reversed'     // REVERSED: payment reversed by provider
    ],
    default: 'pending',
    index: true
  },

  // Deposit instructions returned by Switch
  depositDetails: {
    accountNumber: String,
    accountName: String,
    bankName: String,
    bankCode: String,
    amount: Number,
    currency: String,
    expiresAt: Date,
    instructions: [String],
    payer: mongoose.Schema.Types.Mixed
  },

  switchReference: {
    type: String
  },

  // Settlement and accounting safeguard
  // Phase 4 establishes the pipeline; balance crediting is strictly deferred to Phase 5
  isCredited: {
    type: Boolean,
    default: false
  },
  creditedAt: {
    type: Date
  },

  // Complete audit trail of verified Switch webhook events for this transaction
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

fundingTransactionSchema.index({ user: 1, createdAt: -1 });
fundingTransactionSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('FundingTransaction', fundingTransactionSchema);
