const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
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
  amount: {
    type: Number,
    required: true
  },
  platformFee: {
    type: Number,
    required: true,
    default: function() {
      return this.amount * 0.08; // 8% commission
    }
  },
  creatorPayout: {
    type: Number,
    required: true,
    default: function() {
      return this.amount - (this.amount * 0.08); // Amount minus 8% commission
    }
  },
  currency: {
    type: String,
    enum: ['USD', 'NGN', 'USDC'],
    default: 'USD'
  },
  paymentMethod: {
    type: String,
    enum: ['fiat', 'crypto'],
    default: 'fiat'
  },
  status: {
    type: String,
    enum: ['pending', 'escrowed', 'completed', 'refunded', 'failed'],
    default: 'pending'
  },
  escrowedAt: Date,
  releasedAt: Date,
  refundedAt: Date,
  // Mock payment details (in production, would integrate with real payment gateway)
  paymentDetails: {
    mockTransactionId: String,
    mockWalletAddress: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
