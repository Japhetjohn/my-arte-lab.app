const User = require('../models/User');
const { generateToken, generateRefreshToken } = require('../utils/jwtUtils');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { ErrorHandler, catchAsync } = require('../utils/errorHandler');
const emailConfig = require('../config/email');
const emailTemplates = require('../utils/emailTemplates');
const adminNotificationService = require('../services/adminNotificationService');
const crypto = require('crypto');
const { escapeHtml } = require('../utils/sanitize');

exports.register = catchAsync(async (req, res, next) => {
  const { firstName, lastName, email, password, role, category, localArea, state, country } = req.body;

  // Validate required fields
  if (!firstName || !lastName || !email || !password) {
    return next(new ErrorHandler('Please provide all required fields', 400));
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ErrorHandler('Email already registered', 400));
  }

  // HostFi wallets are initialized automatically when user first accesses wallet
  let user;
  try {
    user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role: role || 'client',
      category: role === 'creator' ? category : undefined,
      location: {
        localArea,
        state,
        country
      },
      wallet: {
        hostfiWalletAssets: [],
        currency: 'NGN',
        balance: 0,
        pendingBalance: 0,
        totalEarnings: 0,
        network: 'HostFi'
      }
    });
  } catch (error) {
    console.error('User creation error:', error);
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map(e => e.message).join(', ');
      return next(new ErrorHandler(message, 400));
    }
    return next(new ErrorHandler('Failed to create user account. Please try again.', 500));
  }

  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedCode = crypto.createHash('sha256').update(verificationCode).digest('hex');

  user.emailVerificationToken = hashedCode;
  user.emailVerificationExpire = Date.now() + 30 * 60 * 1000; // 30 minutes

  await user.save({ validateBeforeSave: false});

  // Initialize HostFi wallets and create Solana USDC address in background (non-blocking)
  setImmediate(async () => {
    try {
      const hostfiWalletService = require('../services/hostfiWalletService');
      const hostfiService = require('../services/hostfiService');

      console.log(`[Background] Initializing HostFi wallet for ${user.email}...`);

      // Initialize HostFi wallet assets - this fetches all available currencies
      await hostfiWalletService.initializeUserWallets(user._id);
      console.log(`[Background] HostFi wallet initialized for ${user.email}`);

      // Create Solana USDC collection address for deposits
      try {
        const assetId = await hostfiWalletService.getWalletAssetId(user._id, 'USDC');
        if (assetId) {
          const cryptoAddress = await hostfiService.createCryptoCollectionAddress({
            assetId,
            currency: 'USDC',
            network: 'SOL',
            customId: user._id.toString()
          });

          // Update user wallet with the address
          const updatedUser = await User.findById(user._id);
          if (updatedUser) {
            updatedUser.wallet.address = cryptoAddress.address;
            updatedUser.wallet.network = 'SOL';
            await updatedUser.save({ validateBeforeSave: false });
            console.log(`[Background] Solana USDC wallet created: ${cryptoAddress.address.substring(0, 10)}...`);
          }
        }
      } catch (addressError) {
        console.error(`[Background] Failed to create wallet address for ${user.email}:`, addressError.message);
      }
    } catch (walletError) {
      console.error(`[Background] Wallet initialization failed for ${user.email}:`, walletError.message);
      // Wallet will be automatically initialized on first wallet access
    }
  });

  // Send professional branded welcome email with verification code
  emailConfig.sendEmail({
    to: user.email,
    subject: 'Welcome to MyArteLab! Verify Your Email',
    html: emailTemplates.welcome(user.firstName, verificationCode)
  }).catch(err => console.error('Welcome email failed:', err));

  adminNotificationService.notifyNewUserRegistration(user)
    .catch(err => console.error('Admin notification failed:', err));

  successResponse(res, 201, 'Registration successful', {
    user: user.getPublicProfile(),
    token,
    refreshToken
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    return next(new ErrorHandler('Invalid email or password', 401));
  }

  if (user.isLocked()) {
    return next(new ErrorHandler('Account is locked due to multiple failed login attempts. Please try again later', 423));
  }

  const isPasswordCorrect = await user.comparePassword(password);

  if (!isPasswordCorrect) {
    await user.incLoginAttempts();
    return next(new ErrorHandler('Invalid email or password', 401));
  }

  if (user.loginAttempts > 0) {
    await user.resetLoginAttempts();
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  successResponse(res, 200, 'Login successful', {
    user: user.getPublicProfile(),
    token,
    refreshToken
  });
});

exports.getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return next(new ErrorHandler('User not found', 404));
  }

  successResponse(res, 200, 'User retrieved successfully', {
    user: user.getPublicProfile()
  });
});

exports.logout = catchAsync(async (req, res, next) => {

  successResponse(res, 200, 'Logout successful');
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return next(new ErrorHandler('Please provide current and new password', 400));
  }

  const user = await User.findById(req.user._id).select('+password');

  const isCorrect = await user.comparePassword(currentPassword);
  if (!isCorrect) {
    return next(new ErrorHandler('Current password is incorrect', 401));
  }

  user.password = newPassword;
  await user.save();

  const token = generateToken(user._id);

  successResponse(res, 200, 'Password updated successfully', { token });
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new ErrorHandler('Please provide your email', 400));
  }

  const user = await User.findOne({ email });

  if (!user) {
    return successResponse(res, 200, 'If an account with that email exists, a reset link has been sent');
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpire = Date.now() + 30 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  try {
    await emailConfig.sendEmail({
      to: user.email,
      subject: 'Reset Your MyArteLab Password',
      html: emailTemplates.passwordReset(resetUrl)
    });

    successResponse(res, 200, 'Password reset email sent');
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new ErrorHandler('Email could not be sent', 500));
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return next(new ErrorHandler('Please provide token and new password', 400));
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) {
    return next(new ErrorHandler('Invalid or expired reset token', 400));
  }

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  const jwtToken = generateToken(user._id);

  successResponse(res, 200, 'Password reset successful', { token: jwtToken });
});

exports.updateProfile = catchAsync(async (req, res, next) => {
  const allowedFields = ['firstName', 'lastName', 'bio', 'location', 'skills', 'avatar', 'coverImage', 'phoneNumber', 'phoneNumberVisible', 'category', 'portfolio', 'services', 'profileVisibility'];
  const updates = {};

  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  const user = await User.findByIdAndUpdate(
    req.user._id,
    updates,
    { new: true, runValidators: true }
  );

  successResponse(res, 200, 'Profile updated successfully', {
    user: user.getPublicProfile()
  });
});

exports.deleteAccount = catchAsync(async (req, res, next) => {
  const { password } = req.body;

  const user = await User.findById(req.user._id).select('+password +googleId');

  if (!user) {
    return next(new ErrorHandler('User not found', 404));
  }

  const isOAuthUser = !!user.googleId;

  if (!isOAuthUser) {
    if (!password) {
      return next(new ErrorHandler('Please provide your password to confirm account deletion', 400));
    }

    const isCorrect = await user.comparePassword(password);

    if (!isCorrect) {
      return next(new ErrorHandler('Incorrect password', 401));
    }
  }

  await User.findByIdAndDelete(req.user._id);

  successResponse(res, 200, 'Account permanently deleted successfully');
});

exports.verifyEmail = catchAsync(async (req, res, next) => {
  const { code } = req.body;

  if (!code) {
    return next(new ErrorHandler('Please provide verification code', 400));
  }

  const hashedCode = crypto.createHash('sha256').update(code.toString()).digest('hex');

  const user = await User.findOne({
    emailVerificationToken: hashedCode,
    emailVerificationExpire: { $gt: Date.now() }
  });

  if (!user) {
    return next(new ErrorHandler('Invalid or expired verification code', 400));
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;
  await user.save({ validateBeforeSave: false });

  emailConfig.sendEmail({
    to: user.email,
    subject: 'Email Verified Successfully!',
    html: `
      <h1>Email Verified!</h1>
      <p>Hi ${user.name},</p>
      <p>Your email has been verified successfully. You now have full access to all MyArteLab features!</p>
      <p>Best regards,<br/>MyArteLab Team</p>
    `
  }).catch(err => console.error('Verification confirmation email failed:', err));

  successResponse(res, 200, 'Email verified successfully', {
    user: user.getPublicProfile()
  });
});

exports.resendVerification = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return next(new ErrorHandler('User not found', 404));
  }

  if (user.isEmailVerified) {
    return next(new ErrorHandler('Email is already verified', 400));
  }

  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedCode = crypto.createHash('sha256').update(verificationCode).digest('hex');

  user.emailVerificationToken = hashedCode;
  user.emailVerificationExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
  await user.save({ validateBeforeSave: false });

  try {
    await emailConfig.sendEmail({
      to: user.email,
      subject: 'Verify Your Email - MyArteLab',
      html: emailTemplates.verificationCode(user.firstName, verificationCode)
    });

    successResponse(res, 200, 'Verification email sent successfully');
  } catch (error) {
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new ErrorHandler('Failed to send verification email', 500));
  }
});

// ====================================
// TWO-FACTOR AUTHENTICATION (2FA)
// ====================================

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

/**
 * Setup 2FA - Generate secret and QR code
 * @route   POST /api/auth/2fa/setup
 * @access  Private
 */
exports.setup2FA = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id).select('+twoFactorSecret');

  if (user.twoFactorEnabled) {
    return next(new ErrorHandler('Two-factor authentication is already enabled', 400));
  }

  // Generate secret
  const secret = speakeasy.generateSecret({
    name: `MyArteLab (${user.email})`,
    length: 32
  });

  // Generate QR code
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

  // Save secret temporarily (will be confirmed when user verifies)
  user.twoFactorSecret = secret.base32;
  await user.save({ validateBeforeSave: false });

  successResponse(res, 200, '2FA setup initiated', {
    secret: secret.base32,
    qrCode: qrCodeUrl,
    manualEntryKey: secret.base32
  });
});

/**
 * Enable 2FA - Verify code and activate 2FA
 * @route   POST /api/auth/2fa/enable
 * @access  Private
 */
exports.enable2FA = catchAsync(async (req, res, next) => {
  const { code } = req.body;

  if (!code || code.length !== 6) {
    return next(new ErrorHandler('Please provide a valid 6-digit code', 400));
  }

  const user = await User.findById(req.user._id).select('+twoFactorSecret');

  if (!user.twoFactorSecret) {
    return next(new ErrorHandler('Please setup 2FA first', 400));
  }

  if (user.twoFactorEnabled) {
    return next(new ErrorHandler('Two-factor authentication is already enabled', 400));
  }

  // Verify the code
  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token: code,
    window: 2 // Allow 2 time steps before/after for clock skew
  });

  if (!verified) {
    return next(new ErrorHandler('Invalid verification code', 400));
  }

  // Generate backup codes (8 codes)
  // CRITICAL: Generate plain codes first, then hash for storage
  const plainBackupCodes = [];
  const hashedBackupCodes = [];

  for (let i = 0; i < 8; i++) {
    const plainCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    plainBackupCodes.push(plainCode);

    // Hash the code for secure storage
    hashedBackupCodes.push({
      code: crypto.createHash('sha256').update(plainCode).digest('hex'),
      used: false
    });
  }

  // Enable 2FA and store hashed backup codes
  user.twoFactorEnabled = true;
  user.twoFactorBackupCodes = hashedBackupCodes;
  await user.save({ validateBeforeSave: false });

  // Return plain backup codes to user (only time they'll see them)
  successResponse(res, 200, 'Two-factor authentication enabled successfully', {
    backupCodes: plainBackupCodes
  });
});

/**
 * Disable 2FA
 * @route   POST /api/auth/2fa/disable
 * @access  Private
 */
exports.disable2FA = catchAsync(async (req, res, next) => {
  const { password } = req.body;

  if (!password) {
    return next(new ErrorHandler('Please provide your password', 400));
  }

  const user = await User.findById(req.user._id).select('+password +twoFactorSecret');

  if (!user.twoFactorEnabled) {
    return next(new ErrorHandler('Two-factor authentication is not enabled', 400));
  }

  // Verify password
  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) {
    return next(new ErrorHandler('Incorrect password', 401));
  }

  // Disable 2FA
  user.twoFactorEnabled = false;
  user.twoFactorSecret = undefined;
  user.twoFactorBackupCodes = [];
  await user.save({ validateBeforeSave: false });

  successResponse(res, 200, 'Two-factor authentication disabled successfully');
});

/**
 * Verify 2FA code during login
 * @route   POST /api/auth/2fa/verify
 * @access  Public (but requires valid login session)
 */
exports.verify2FACode = catchAsync(async (req, res, next) => {
  const { userId, code } = req.body;

  if (!code || code.length !== 6) {
    return next(new ErrorHandler('Please provide a valid 6-digit code', 400));
  }

  const user = await User.findById(userId).select('+twoFactorSecret');

  if (!user || !user.twoFactorEnabled) {
    return next(new ErrorHandler('Invalid request', 400));
  }

  // Try to verify with TOTP first
  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token: code,
    window: 2
  });

  if (verified) {
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });

    return successResponse(res, 200, 'Login successful', {
      token,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified
      }
    });
  }

  // If TOTP fails, try backup codes
  const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
  const backupCodeIndex = user.twoFactorBackupCodes.findIndex(
    bc => bc.code === hashedCode && !bc.used
  );

  if (backupCodeIndex !== -1) {
    // Mark backup code as used
    user.twoFactorBackupCodes[backupCodeIndex].used = true;
    user.twoFactorBackupCodes[backupCodeIndex].usedAt = Date.now();
    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    return successResponse(res, 200, 'Login successful (backup code used)', {
      token,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified
      },
      backupCodesRemaining: user.twoFactorBackupCodes.filter(bc => !bc.used).length
    });
  }

  return next(new ErrorHandler('Invalid verification code', 401));
});

/**
 * Get 2FA status
 * @route   GET /api/auth/2fa/status
 * @access  Private
 */
exports.get2FAStatus = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  successResponse(res, 200, '2FA status retrieved', {
    enabled: user.twoFactorEnabled,
    backupCodesRemaining: user.twoFactorEnabled
      ? user.twoFactorBackupCodes.filter(bc => !bc.used).length
      : 0
  });
});

/**
 * Regenerate backup codes
 * @route   POST /api/auth/2fa/regenerate-backup-codes
 * @access  Private
 */
exports.regenerateBackupCodes = catchAsync(async (req, res, next) => {
  const { password } = req.body;

  if (!password) {
    return next(new ErrorHandler('Please provide your password', 400));
  }

  const user = await User.findById(req.user._id).select('+password');

  if (!user.twoFactorEnabled) {
    return next(new ErrorHandler('Two-factor authentication is not enabled', 400));
  }

  // Verify password
  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) {
    return next(new ErrorHandler('Incorrect password', 401));
  }

  // Generate new backup codes
  const backupCodes = [];
  const plainBackupCodes = [];

  for (let i = 0; i < 8; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    plainBackupCodes.push(code);
    backupCodes.push({
      code: crypto.createHash('sha256').update(code).digest('hex'),
      used: false
    });
  }

  user.twoFactorBackupCodes = backupCodes;
  await user.save({ validateBeforeSave: false });

  successResponse(res, 200, 'Backup codes regenerated successfully', {
    backupCodes: plainBackupCodes
  });
});
