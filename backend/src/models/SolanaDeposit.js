const mongoose = require('mongoose');

/**
 * SolanaDeposit Schema
 * 
 * Tracks direct external USDC transfers on Solana.
 * Enforces verified USDC mint address, on-chain finality, unique transaction signatures,
 * and exact-once atomic balance crediting.
 */
const solanaDepositSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Solana transaction signature (base58 hash, 87-88 characters)
  signature: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },

  // On-chain block slot number
  slot: {
    type: Number
  },

  // Block timestamp from Solana ledger
  blockTime: {
    type: Date
  },

  // Standardized USDC amount (decimal value, e.g. 50.000000)
  amountUsdc: {
    type: Number,
    required: true,
    min: 0.000001
  },

  // Raw token base units (e.g. 50,000,000 for 50 USDC with 6 decimals)
  rawAmount: {
    type: Number
  },

  // Strictly enforced Solana USDC token mint address
  mint: {
    type: String,
    required: true,
    trim: true
  },

  // Sender's Solana address or token account
  fromAddress: {
    type: String,
    trim: true
  },

  // Destination token account
  toTokenAccount: {
    type: String,
    trim: true
  },

  // Destination wallet owner address
  toAddress: {
    type: String,
    required: true,
    trim: true
  },

  // Network identifier
  network: {
    type: String,
    enum: ['mainnet-beta', 'devnet', 'testnet', 'sandbox'],
    default: 'mainnet-beta'
  },

  // Solana confirmation status
  confirmationStatus: {
    type: String,
    enum: ['processed', 'confirmed', 'finalized'],
    default: 'finalized'
  },

  // Deposit state machine
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'failed', 'credited'],
    default: 'pending',
    index: true
  },

  // Atomic exactly-once credit guard
  isCredited: {
    type: Boolean,
    default: false,
    index: true
  },

  creditedAt: {
    type: Date
  },

  // Associated ledger transaction record
  ledgerTransactionId: {
    type: String
  },

  // Verification metadata from Solana RPC
  verificationDetails: {
    type: mongoose.Schema.Types.Mixed
  },

  // Failure rationale if rejected
  errorReason: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SolanaDeposit', solanaDepositSchema);
