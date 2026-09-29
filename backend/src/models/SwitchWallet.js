const mongoose = require('mongoose');

/**
 * SwitchWallet Model
 * 
 * Stores the association between a MyArteLab user and their Switch non-custodial wallet.
 * Enforces database-level uniqueness on both user and switchWalletId to prevent race conditions.
 */
const switchWalletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  switchWalletId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  name: {
    type: String,
    trim: true
  },
  solanaAddress: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  evmAddress: {
    type: String,
    trim: true
  },
  addresses: {
    type: Map,
    of: String,
    default: {}
  },
  encryptedPrivateKey: {
    type: String,
    select: false // Never exposed in queries or JSON serialization by default
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'archived'],
    default: 'active'
  }
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      delete ret.encryptedPrivateKey;
      return ret;
    }
  }
});

module.exports = mongoose.model('SwitchWallet', switchWalletSchema);
