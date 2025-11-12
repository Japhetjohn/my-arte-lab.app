const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
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
    select: false
  },

  googleId: {
    type: String,
    unique: true,
    sparse: true
  },

  role: {
    type: String,
    enum: ['client', 'creator', 'admin'],
    default: 'client'
  },

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
    localArea: String,
    city: String,
    state: String,
    country: String,
    fullAddress: String
  },

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
    currency: { type: String, default: 'USDC' },
    deliveryTime: Number
  }],

  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },

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
      default: 'USDC'
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
    default: false
  },

  emailVerificationToken: String,
  emailVerificationExpire: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  loginAttempts: { type: Number, default: 0 },
  lockUntil: Date,

  lastLogin: Date,

  completedBookings: {
    type: Number,
    default: 0
  },

  responseTime: {
    type: Number,
    default: null
  }

}, {
  timestamps: true
});

userSchema.index({ role: 1 });
userSchema.index({ category: 1 });
userSchema.index({ 'rating.average': -1 });

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

userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

userSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

userSchema.methods.incLoginAttempts = async function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return await this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };
  const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;

  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked()) {
    const lockoutDuration = parseInt(process.env.LOCKOUT_DURATION) || 15;
    updates.$set = { lockUntil: Date.now() + (lockoutDuration * 60 * 1000) };
  }

  return await this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = async function() {
  return await this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

userSchema.methods.updateWalletBalance = async function(amount, type = 'add') {
  const update = type === 'add'
    ? { $inc: { 'wallet.balance': amount } }
    : { $inc: { 'wallet.balance': -amount } };

  update.$set = { 'wallet.lastUpdated': Date.now() };

  return await this.updateOne(update);
};

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
