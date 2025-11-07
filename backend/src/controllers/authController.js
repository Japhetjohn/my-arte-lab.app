const User = require('../models/User');
const { generateToken, generateRefreshToken } = require('../utils/jwtUtils');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { ErrorHandler, catchAsync } = require('../utils/errorHandler');
const tsaraService = require('../services/tsaraService');
const emailConfig = require('../config/email');
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

  // Generate Tsara wallet for the user
  let wallet;
  try {
    wallet = await tsaraService.generateWallet({
      userId: email, // Use email as temporary ID before user is created
      email,
      name,
      role: role || 'client'
    });
  } catch (error) {
    console.error('Wallet generation failed:', error);
    return next(new ErrorHandler('Failed to create wallet. Please try again', 500));
  }

  // Create user with wallet
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
      totalEarnings: 0
    }
  });

  // Generate tokens
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Send welcome email (non-blocking)
  emailConfig.sendEmail({
    to: user.email,
    subject: 'Welcome to MyArteLab! 🎨',
    html: `
      <h1>Welcome ${user.name}!</h1>
      <p>Your account has been created successfully.</p>
      <p><strong>Your Wallet Address:</strong> ${wallet.address}</p>
      <p>You can now start ${user.role === 'creator' ? 'offering your services' : 'booking creative services'}!</p>
      <p>Best regards,<br/>MyArteLab Team</p>
    `
  }).catch(err => console.error('Welcome email failed:', err));

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
