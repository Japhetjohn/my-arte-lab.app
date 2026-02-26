const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { SECURITY, USER_ROLES, CREATOR_CATEGORIES } = require('../utils/constants');
const { formatLocation } = require('../utils/formatters');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Please provide your first name'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },

  lastName: {
    type: String,
    required: [true, 'Please provide your last name'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
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
    required: false,
    validate: {
      validator: function (value) {
        if (!value || value === 'OAUTH_USER_NO_PASSWORD') {
          return true;
        }
        if (value.length < SECURITY.PASSWORD_MIN_LENGTH) {
          return false;
        }
        return SECURITY.PASSWORD_REGEX.test(value);
      },
      message: 'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character (@$!%*?&_-#)'
    },
    select: false
  },

  googleId: {
    type: String,
    unique: true,
    sparse: true
  },

  role: {
    type: String,
    enum: Object.values(USER_ROLES),
    default: USER_ROLES.CLIENT
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
    localArea: {
      type: String,
      trim: true,
      default: null
    },
    state: {
      type: String,
      trim: true,
      default: null
    },
    country: {
      type: String,
      trim: true,
      default: null
    }
  },

  phoneNumber: {
    type: String,
    trim: true,
    default: null
  },

  phoneNumberVisible: {
    type: Boolean,
    default: false
  },

  category: {
    type: String,
    enum: Object.values(CREATOR_CATEGORIES),
    required: function () { return this.role === USER_ROLES.CREATOR; }
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
        validator: function (v) {
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
    // Tsara Integration (Local Wallet Management)
    tsaraWalletId: String,    // Internal ID or reference
    tsaraAddress: String,     // Solana public address
    tsaraReference: String,   // Unique reference
    tsaraMnemonic: {          // Mnemonic phrase (stored encrypted)
      type: String,
      select: false
    },
    tsaraEncryptedPrivateKey: { // Secret key (stored encrypted)
      type: String,
      select: false
    },

    // HostFi Integration (Legacy)
    assetId: String,        // HostFi wallet asset ID
    currency: String,       // Currency code (NGN, USD, USDC, etc.)
    assetType: {
      type: String,
      enum: ['FIAT', 'CRYPTO']
    },
    balance: {
      type: Number,
      default: 0
    },
    colNetwork: String,     // Network for the collection address
    lastSynced: Date,
    hostfiWalletAssets: [{
      assetId: String,
      currency: String,
      assetType: String,
      balance: { type: Number, default: 0 },
      reservedBalance: { type: Number, default: 0 },
      lastSynced: { type: Date, default: Date.now }
    }]
  },

  // Legacy Solana wallet (deprecated - will be removed)
  address: {
    type: String,
    required: false, // No longer required
    sparse: true  // Removed unique: true to allow multiple null values
  },
  encryptedPrivateKey: {
    type: String,
    required: false, // No longer required
    select: false
  },

  // Balance tracking (synced from HostFi)
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
    enum: ['USDC', 'DAI', 'NGN', 'USD'],
    default: 'NGN'
  },
  network: {
    type: String,
    default: 'HostFi'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },

  // Beneficiaries for withdrawals
  beneficiaries: [{
    id: {
      type: String,
      default: function () { return require('uuid').v4(); }
    },
    type: {
      type: String,
      enum: ['bank_account', 'mobile_money'],
      required: true
    },
    accountNumber: String,
    accountName: String,
    bankCode: String,
    bankName: String,
    phoneNumber: String,
    provider: {
      type: String,
      enum: ['MTN', 'AIRTEL', 'GLO', '9MOBILE', '']
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],

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

  // Two-Factor Authentication
  twoFactorSecret: {
    type: String,
    select: false // Don't include in queries by default for security
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorBackupCodes: [{
    code: {
      type: String,
      required: true
    },
    used: {
      type: Boolean,
      default: false
    },
    usedAt: Date
  }],

  profileVisibility: {
    type: String,
    enum: ['public', 'private', 'clients'],
    default: 'public'
  },

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

  profileCompletion: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  favoriteCreators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  seoSlug: {
    type: String,
    unique: true,
    sparse: true
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

userSchema.index({ role: 1 });
userSchema.index({ category: 1 });
userSchema.index({ 'rating.average': -1 });
userSchema.index({ email: 1, googleId: 1 });
userSchema.index({ role: 1, category: 1, 'rating.average': -1 });

userSchema.virtual('name').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.virtual('formattedLocation').get(function () {
  return formatLocation(this.location);
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    let rounds = SECURITY.BCRYPT_ROUNDS;
    if (isNaN(rounds) || rounds < 10) {
      rounds = 12;
    }
    const salt = await bcrypt.genSalt(rounds);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

userSchema.methods.incLoginAttempts = async function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return await this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  if (this.loginAttempts + 1 >= SECURITY.MAX_LOGIN_ATTEMPTS && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + (SECURITY.LOCKOUT_DURATION_MINUTES * 60 * 1000) };
  }

  return await this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = async function () {
  return await this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

userSchema.methods.updateWalletBalance = async function (amount, type = 'add') {
  const amountChange = type === 'add' ? amount : -amount;

  const result = await this.constructor.findOneAndUpdate(
    { _id: this._id, __v: this.__v },
    {
      $inc: {
        'wallet.balance': amountChange,
        'wallet.pendingBalance': amountChange,
        __v: 1
      },
      $set: { 'wallet.lastUpdated': Date.now() }
    },
    { new: true }
  );

  if (!result) {
    const { ErrorHandler } = require('../utils/errorHandler');
    throw new ErrorHandler('Concurrent modification detected during wallet update', 409);
  }

  Object.assign(this, result.toObject());
  return result;
};

userSchema.methods.getPublicProfile = function () {
  const obj = this.toObject();

  obj.name = this.name;

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
