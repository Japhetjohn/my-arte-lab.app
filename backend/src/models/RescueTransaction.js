const mongoose = require('mongoose');

/**
 * RescueTransaction Model
 * 
 * Records all requests to recover unsupported tokens sent to a user's Switch wallet deposit address.
 * Official OnSwitch specification: POST /wallet/rescue
 * Supported blockchains: BASE, ETHEREUM, SOLANA, POLYGON, BSC, ARBITRUM, OPTIMISM, AVALANCHE, MONAD, GNOSIS, PLASMA
 */
const rescueTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  walletId: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  blockchain: {
    type: String,
    required: true,
    uppercase: true,
    enum: [
      'BASE',
      'ETHEREUM',
      'SOLANA',
      'POLYGON',
      'BSC',
      'ARBITRUM',
      'OPTIMISM',
      'AVALANCHE',
      'MONAD',
      'GNOSIS',
      'PLASMA'
    ]
  },
  tokenAddress: {
    type: String,
    required: true,
    trim: true
  },
  recipient: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  providerResponse: {
    type: mongoose.Schema.Types.Mixed
  },
  transactionHash: {
    type: String,
    trim: true
  },
  errorMessage: {
    type: String
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true
});

rescueTransactionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('RescueTransaction', rescueTransactionSchema);
