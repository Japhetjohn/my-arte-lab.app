const User = require('../models/User');
const { generateToken, generateRefreshToken } = require('../utils/jwtUtils');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { ErrorHandler, catchAsync } = require('../utils/errorHandler');
const tsaraService = require('../services/tsaraService');
const emailConfig = require('../config/email');
const adminNotificationService = require('../services/adminNotificationService');
const crypto = require('crypto');

/**
 * @route   POST /api/auth/register
 * @desc    Register new user with Tsara wallet
 * @access  Public
 */
exports.register = catchAsync(async (req, res, next) => {
  const { name, email, password, role, category } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ErrorHandler('Email already registered', 400));
  }

  // Generate Tsara Solana stablecoin wallet (optional - can be created later if fails)
  let wallet = null;
  let walletCreationFailed = false;

  try {
    wallet = await tsaraService.generateWallet({
      userId: email, // Use email as temporary ID before user is created
      email,
      name,
      role: role || 'client'
    });
    console.log('✅ Wallet created successfully for:', email);
  } catch (error) {
    console.error('⚠️ Wallet creation failed (will retry later):', error.message);
    walletCreationFailed = true;
    // Don't fail registration - wallet can be created later
    // Generate a temporary placeholder wallet address
    const tempWalletId = crypto.randomBytes(16).toString('hex');
    wallet = {
      address: `pending_${tempWalletId}`,
      currency: 'USDT',
      balance: 0,
      network: 'Solana'
    };
  }

  // Create user with Solana wallet
  const user = await User.create({
    name,
    email,
    password,
    role: role || 'client',
    category: role === 'creator' ? category : undefined,
    wallet: {
      address: wallet.address,
      currency: wallet.currency,
      balance: 0,
      pendingBalance: 0,
      totalEarnings: 0,
      network: wallet.network
    }
  });

  // Generate tokens
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Generate email verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  await user.save({ validateBeforeSave: false });

  // Create verification URL
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

  // Send welcome email with verification link (non-blocking)
  const walletInfo = !walletCreationFailed ? `
    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p><strong>Payment Wallet:</strong> Solana Stablecoin (${wallet.currency})</p>
      <p><strong>Wallet Address:</strong> ${wallet.address}</p>
      <p><strong>Network:</strong> ${wallet.network}</p>
      <p>You can receive payments in stablecoins (USDT, USDC, DAI) from anywhere in the world!</p>
    </div>
  ` : `
    <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
      <p><strong>Note:</strong> Your payment wallet is being set up and will be ready shortly.</p>
      <p>You can start exploring the platform now, and your wallet will be activated automatically.</p>
    </div>
  `;

  emailConfig.sendEmail({
    to: user.email,
    subject: 'Welcome to MyArteLab! Verify Your Email',
    html: `
      <h1>Welcome ${user.name}!</h1>
      <p>Your account has been created successfully${!walletCreationFailed ? ' with Solana stablecoin payment support' : ''}.</p>
      ${walletInfo}
      <p>Please verify your email address to unlock all features:</p>
      <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background: #FF6B35; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
      <p>This link is valid for 24 hours.</p>
      <p>You can now start ${user.role === 'creator' ? 'offering your services' : 'booking creative services'}!</p>
      <p>Best regards,<br/>MyArteLab Team</p>
    `
  }).catch(err => console.error('Welcome email failed:', err));

  // Notify admin of new user registration
  adminNotificationService.notifyNewUserRegistration(user)
    .catch(err => console.error('Admin notification failed:', err));

  console.log(`✅ User created via ${user.googleId ? 'Google OAuth' : 'registration'}`);

  // Response
  successResponse(res, 201, 'Registration successful', {
    user: user.getPublicProfile(),
    token,
    refreshToken
  });
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Find user and include password
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    return next(new ErrorHandler('Invalid email or password', 401));
  }

  // Check if account is locked
  if (user.isLocked()) {
    return next(new ErrorHandler('Account is locked due to multiple failed login attempts. Please try again later', 423));
  }

  // Check password
  const isPasswordCorrect = await user.comparePassword(password);

  if (!isPasswordCorrect) {
    await user.incLoginAttempts();
    return next(new ErrorHandler('Invalid email or password', 401));
  }

  // Reset login attempts on successful login
  if (user.loginAttempts > 0) {
    await user.resetLoginAttempts();
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  // Generate tokens
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Get fresh user data without password
  const userData = await User.findById(user._id);

  successResponse(res, 200, 'Login successful', {
    user: userData.getPublicProfile(),
    token,
    refreshToken
  });
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current logged in user
 * @access  Private
 */
exports.getMe = catchAsync(async (req, res, next) => {
  // req.user is set by protect middleware
  const user = await User.findById(req.user._id);

  if (!user) {
    return next(new ErrorHandler('User not found', 404));
  }

  successResponse(res, 200, 'User retrieved successfully', {
    user: user.getPublicProfile()
  });
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
exports.logout = catchAsync(async (req, res, next) => {
  // In a stateless JWT system, logout is handled client-side by removing the token
  // You could implement token blacklisting here if needed

  successResponse(res, 200, 'Logout successful');
});

/**
 * @route   PUT /api/auth/update-password
 * @desc    Update password
 * @access  Private
 */
exports.updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return next(new ErrorHandler('Please provide current and new password', 400));
  }

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');

  // Check current password
  const isCorrect = await user.comparePassword(currentPassword);
  if (!isCorrect) {
    return next(new ErrorHandler('Current password is incorrect', 401));
  }

  // Update password
  user.password = newPassword;
  await user.save();

  // Generate new token
  const token = generateToken(user._id);

  successResponse(res, 200, 'Password updated successfully', { token });
});

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 */
exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new ErrorHandler('Please provide your email', 400));
  }

  const user = await User.findOne({ email });

  if (!user) {
    // Don't reveal if user exists
    return successResponse(res, 200, 'If an account with that email exists, a reset link has been sent');
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
  await user.save({ validateBeforeSave: false });

  // Create reset URL
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  // Send email
  try {
    await emailConfig.sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <h1>Password Reset</h1>
        <p>You requested a password reset for your MyArteLab account.</p>
        <p>Click the link below to reset your password (valid for 30 minutes):</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background: #FF6B35; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br/>MyArteLab Team</p>
      `
    });

    successResponse(res, 200, 'Password reset email sent');
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new ErrorHandler('Email could not be sent', 500));
  }
});

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
exports.resetPassword = catchAsync(async (req, res, next) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return next(new ErrorHandler('Please provide token and new password', 400));
  }

  // Hash token
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Find user with valid token
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) {
    return next(new ErrorHandler('Invalid or expired reset token', 400));
  }

  // Set new password
  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  // Generate new token
  const jwtToken = generateToken(user._id);

  successResponse(res, 200, 'Password reset successful', { token: jwtToken });
});

/**
 * @route   PUT /api/auth/update-profile
 * @desc    Update user profile
 * @access  Private
 */
exports.updateProfile = catchAsync(async (req, res, next) => {
  const allowedFields = ['name', 'bio', 'location', 'skills', 'avatar', 'coverImage'];
  const updates = {};

  // Filter allowed fields
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

/**
 * @route   DELETE /api/auth/delete-account
 * @desc    Delete user account
 * @access  Private
 */
exports.deleteAccount = catchAsync(async (req, res, next) => {
  const { password } = req.body;

  if (!password) {
    return next(new ErrorHandler('Please provide your password to confirm account deletion', 400));
  }

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');

  // Verify password
  const isCorrect = await user.comparePassword(password);
  if (!isCorrect) {
    return next(new ErrorHandler('Incorrect password', 401));
  }

  // Soft delete - deactivate account
  user.isActive = false;
  await user.save({ validateBeforeSave: false });

  // Or hard delete (uncomment if needed)
  // await user.remove();

  successResponse(res, 200, 'Account deleted successfully');
});

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email with token
 * @access  Public
 */
exports.verifyEmail = catchAsync(async (req, res, next) => {
  const { token } = req.body;

  if (!token) {
    return next(new ErrorHandler('Please provide verification token', 400));
  }

  // Hash token
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  // Find user with valid token
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpire: { $gt: Date.now() }
  });

  if (!user) {
    return next(new ErrorHandler('Invalid or expired verification token', 400));
  }

  // Mark email as verified
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;
  await user.save({ validateBeforeSave: false });

  // Send confirmation email
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

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend email verification link
 * @access  Private
 */
exports.resendVerification = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return next(new ErrorHandler('User not found', 404));
  }

  if (user.isEmailVerified) {
    return next(new ErrorHandler('Email is already verified', 400));
  }

  // Generate new verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');

  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  await user.save({ validateBeforeSave: false });

  // Create verification URL
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

  // Send verification email
  try {
    await emailConfig.sendEmail({
      to: user.email,
      subject: 'Verify Your Email - MyArteLab',
      html: `
        <h1>Verify Your Email</h1>
        <p>Hi ${user.name},</p>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background: #FF6B35; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
        <p>This link is valid for 24 hours.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br/>MyArteLab Team</p>
      `
    });

    successResponse(res, 200, 'Verification email sent successfully');
  } catch (error) {
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new ErrorHandler('Failed to send verification email', 500));
  }
});
