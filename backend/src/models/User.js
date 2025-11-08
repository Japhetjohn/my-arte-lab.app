const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Please provide your name'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },

  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },

  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false // Don't return password in queries by default
  },

  // User Type
  role: {
    type: String,
    enum: ['client', 'creator', 'admin'],
    default: 'client'
  },

  // Profile
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },

  avatar: {
    type: String,
    default: null
  },

  coverImage: {
    type: String,
    default: null
  },

  location: {
    city: String,
    country: String
  },

  // Creator-specific fields
  category: {
    type: String,
    enum: ['photographer', 'designer', 'videographer', 'illustrator', 'other'],
    required: function() { return this.role === 'creator'; }
  },

  skills: [{
    type: String
  }],

  portfolio: [{
    title: String,
    image: String,
    description: String,
    createdAt: { type: Date, default: Date.now }
  }],

  services: [{
    title: String,
    description: String,
    price: Number,
    currency: { type: String, default: 'USDT' },
    deliveryTime: Number // in days
  }],

  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },

  // Tsara Solana Stablecoin Wallet
  wallet: {
    address: {
      type: String,
      required: true,
      unique: true
    },
    balance: {
      type: Number,
      default: 0,
      min: 0
    },
    pendingBalance: {
      type: Number,
      default: 0,
      min: 0
    },
    totalEarnings: {
      type: Number,
      default: 0,
      min: 0
    },
    currency: {
      type: String,
      enum: ['USDT', 'USDC', 'DAI'],
      default: 'USDT'
    },
    network: {
      type: String,
      default: 'Solana'
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },

  // Account Status
  isEmailVerified: {
    type: Boolean,
    default: false
  },

  isActive: {
    type: Boolean,
    default: true
  },

  isVerified: {
    type: Boolean,
    default: false // For creator verification
  },

  // Security
  emailVerificationToken: String,
  emailVerificationExpire: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date,

  // Metadata
  lastLogin: Date,

  completedBookings: {
    type: Number,
    default: 0
  },

  responseTime: {
    type: Number, // in hours
    default: null
  }

}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Indexes for performance (email and wallet.address already indexed via unique: true)
userSchema.index({ role: 1 });
userSchema.index({ category: 1 });
userSchema.index({ 'rating.average': -1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Check if account is locked
userSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Increment login attempts
userSchema.methods.incLoginAttempts = async function() {
  // Reset attempts if lock has expired
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return await this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };
  const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;

  // Lock account after max attempts
  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked()) {
    const lockoutDuration = parseInt(process.env.LOCKOUT_DURATION) || 15; // minutes
    updates.$set = { lockUntil: Date.now() + (lockoutDuration * 60 * 1000) };
  }

  return await this.updateOne(updates);
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = async function() {
  return await this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

// Update wallet balance
userSchema.methods.updateWalletBalance = async function(amount, type = 'add') {
  const update = type === 'add'
    ? { $inc: { 'wallet.balance': amount } }
    : { $inc: { 'wallet.balance': -amount } };

  update.$set = { 'wallet.lastUpdated': Date.now() };

  return await this.updateOne(update);
};

// Get public profile (exclude sensitive fields)
userSchema.methods.getPublicProfile = function() {
  const obj = this.toObject();

  delete obj.password;
  delete obj.emailVerificationToken;
  delete obj.emailVerificationExpire;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpire;
  delete obj.loginAttempts;
  delete obj.lockUntil;

  return obj;
};

module.exports = mongoose.model('User', userSchema);
