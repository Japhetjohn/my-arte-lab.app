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
    city: String,
    country: String
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
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Service title cannot exceed 100 characters']
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    images: [{
      type: String,
      validate: {
        validator: function(v) {
          return this.images.length <= 5;
        },
        message: 'Maximum 5 images allowed per service'
      }
    }],
    directLink: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'Please provide a valid URL']
    },
    // Service Packages (Basic/Standard/Premium)
    packages: [{
      name: {
        type: String,
        required: true,
        enum: ['Basic', 'Standard', 'Premium']
      },
      description: String,
      suggestedPrice: {
        type: Number,
        min: 0
      },
      deliveryDays: {
        type: Number,
        min: 1
      },
      revisions: {
        type: String,
        default: '2'
      },
      features: [String],
      popular: {
        type: Boolean,
        default: false
      }
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
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
      enum: ['USDC', 'DAI'],
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

  isPhoneVerified: {
    type: Boolean,
    default: false
  },

  isIdVerified: {
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
  lastActive: Date,

  completedBookings: {
    type: Number,
    default: 0
  },

  responseTime: {
    type: Number,
    default: null
  },

  // Performance Metrics
  metrics: {
    responseRate: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    },
    onTimeDeliveryRate: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    },
    repeatClientRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    totalEarnings: {
      type: Number,
      default: 0
    },
    averageOrderValue: {
      type: Number,
      default: 0
    }
  },

  // Badges & Achievements
  badges: [{
    type: {
      type: String,
      enum: ['top_rated', 'power_seller', 'rising_talent', 'fast_responder', 'reliable', 'new_seller']
    },
    earnedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Profile Completion
  profileCompletion: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  // Favorites/Bookmarks
  favoriteCreators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // SEO fields
  seoSlug: {
    type: String,
    unique: true,
    sparse: true
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
