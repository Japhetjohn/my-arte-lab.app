const User = require('../models/User');
const { generateToken, generateRefreshToken } = require('../utils/jwtUtils');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { ErrorHandler, catchAsync } = require('../utils/errorHandler');
const tsaraService = require('../services/tsaraService');
const emailConfig = require('../config/email');
const adminNotificationService = require('../services/adminNotificationService');
const crypto = require('crypto');
const { escapeHtml } = require('../utils/sanitize');

exports.register = catchAsync(async (req, res, next) => {
  const { name, email, password, role, category } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ErrorHandler('Email already registered', 400));
  }

  let wallet = null;
  let walletCreationFailed = false;

  try {
    wallet = await tsaraService.generateWallet({
      userId: email,
      email,
      name,
      role: role || 'client'
    });
  } catch (error) {
    console.error(' Wallet creation failed (will retry later):', error.message);
    walletCreationFailed = true;
    const tempWalletId = crypto.randomBytes(16).toString('hex');
    wallet = {
      address: `pending_${tempWalletId}`,
      currency: 'USDC',
      balance: 0,
      network: 'Solana'
    };
  }

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

  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Generate 6-digit verification code
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedCode = crypto.createHash('sha256').update(verificationCode).digest('hex');

  user.emailVerificationToken = hashedCode;
  user.emailVerificationExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
  await user.save({ validateBeforeSave: false});

  const walletInfo = !walletCreationFailed ? `
    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p><strong>Payment Wallet:</strong> Solana Stablecoin (${escapeHtml(wallet.currency)})</p>
      <p><strong>Wallet Address:</strong> ${escapeHtml(wallet.address)}</p>
      <p><strong>Network:</strong> ${escapeHtml(wallet.network)}</p>
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
      <h1>Welcome ${escapeHtml(user.name)}!</h1>
      <p>Your account has been created successfully${!walletCreationFailed ? ' with Solana stablecoin payment support' : ''}.</p>
      ${walletInfo}
      <p>Please verify your email address using the code below:</p>
      <div style="background: #f9f9f9; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
        <h2 style="font-size: 32px; letter-spacing: 8px; margin: 0; color: #FF6B35;">${escapeHtml(verificationCode)}</h2>
      </div>
      <p>This code will expire in 30 minutes.</p>
      <p>You can now start ${user.role === 'creator' ? 'offering your services' : 'booking creative services'}!</p>
      <p>Best regards,<br/>MyArteLab Team</p>
    `
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
  const allowedFields = ['name', 'bio', 'location', 'skills', 'avatar', 'coverImage'];
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

  // Check if user is OAuth user (has googleId but no password)
  const isOAuthUser = !!user.googleId;

  // For OAuth users, allow deletion without password
  // For regular users, require password verification
  if (!isOAuthUser) {
    if (!password) {
      return next(new ErrorHandler('Please provide your password to confirm account deletion', 400));
    }

    const isCorrect = await user.comparePassword(password);

    if (!isCorrect) {
      return next(new ErrorHandler('Incorrect password', 401));
    }
  }

  // Permanently delete user from database
  await User.findByIdAndDelete(req.user._id);

  successResponse(res, 200, 'Account permanently deleted successfully');
});

exports.verifyEmail = catchAsync(async (req, res, next) => {
  const { code } = req.body;

  if (!code) {
    return next(new ErrorHandler('Please provide verification code', 400));
  }

  // Hash the incoming code to compare with stored hash
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

  // Generate new 6-digit verification code
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedCode = crypto.createHash('sha256').update(verificationCode).digest('hex');

  user.emailVerificationToken = hashedCode;
  user.emailVerificationExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
  await user.save({ validateBeforeSave: false });

  try {
    await emailConfig.sendEmail({
      to: user.email,
      subject: 'Verify Your Email - MyArteLab',
      html: `
        <h1>Verify Your Email</h1>
        <p>Hi ${user.name},</p>
        <p>Please verify your email address using the code below:</p>
        <div style="background: #f9f9f9; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <h2 style="font-size: 32px; letter-spacing: 8px; margin: 0; color: #FF6B35;">${verificationCode}</h2>
        </div>
        <p>This code will expire in 30 minutes.</p>
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
