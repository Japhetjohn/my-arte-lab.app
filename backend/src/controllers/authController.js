const User = require('../models/User');
const Notification = require('../models/Notification');
const { generateToken, generateRefreshToken } = require('../utils/jwtUtils');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { ErrorHandler, catchAsync } = require('../utils/errorHandler');
const emailConfig = require('../config/email');
const emailTemplates = require('../utils/emailTemplates');
const adminNotificationService = require('../services/adminNotificationService');
const switchService = require('../services/switchService');
const crypto = require('crypto');
const axios = require('axios');
const { escapeHtml } = require('../utils/sanitize');

exports.register = catchAsync(async (req, res, next) => {
  const { firstName, lastName, email, password, role, category, avatar, coverImage } = req.body;
  
  // Handle location and country fields - support both nested and flat formats
  const { normalizeCountryCode, getCountryName } = require('../utils/countryUtils');
  const localArea = req.body.localArea || req.body.location?.localArea;
  const state = req.body.state || req.body.location?.state;
  const rawCountry = req.body.countryCode || req.body.country || req.body.location?.country || req.body.location?.countryCode;
  const normalizedCountryCode = normalizeCountryCode(rawCountry) || 'NG';
  const countryName = getCountryName(normalizedCountryCode) || 'Nigeria';

  console.log('[Register] Request body:', JSON.stringify(req.body, null, 2));
  console.log('[Register] Extracted location & country:', { localArea, state, country: countryName, countryCode: normalizedCountryCode });

  // Validate required fields
  if (!firstName || !lastName || !email || !password) {
    return next(new ErrorHandler('Please provide all required fields', 400));
  }

  // Pre-validate password format with human-friendly messages
  if (typeof password !== 'string' || password.length < 8) {
    return next(new ErrorHandler('Password must be at least 8 characters', 400));
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) {
    return next(new ErrorHandler('Password must contain at least one uppercase and one lowercase letter', 400));
  }
  
  // Assign default avatar and cover image if not provided
  const userAvatar = avatar || '/images/avatar-3.png';
  const userCoverImage = coverImage || '/images/hero-bg.jpg';

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ErrorHandler('This email is already registered', 400));
  }

  let user;
  try {
    user = await User.create({
      firstName,
      lastName,
      email,
      password,
      avatar: userAvatar,
      coverImage: userCoverImage,
      role: role || 'client',
      category: role === 'creator' ? (Array.isArray(category) ? category : category ? [category] : []) : undefined,
      countryCode: normalizedCountryCode,
      location: {
        localArea,
        state,
        country: countryName
      },
      wallet: {
        currency: 'USDC',
        balance: 0,
        pendingBalance: 0,
        totalEarnings: 0
      }
    });
  } catch (error) {
    console.error('User creation error:', error);
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map(e => e.message).join(', ');
      return next(new ErrorHandler(message, 400));
    }
    if (error.code === 11000) {
      return next(new ErrorHandler('This email is already registered', 400));
    }
    return next(new ErrorHandler('Failed to create user account. Please try again.', 500));
  }

  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedCode = crypto.createHash('sha256').update(verificationCode).digest('hex');

  user.emailVerificationToken = hashedCode;
  user.emailVerificationExpire = Date.now() + 30 * 60 * 1000; // 30 minutes

  await user.save({ validateBeforeSave: false });

  // Send professional branded welcome email with verification code
  let emailSent = false;
  try {
    await emailConfig.sendEmail({
      to: user.email,
      subject: 'Welcome to MyArteLab! Verify Your Email',
      html: emailTemplates.welcome(user.firstName, verificationCode)
    });
    emailSent = true;
  } catch (err) {
    console.error('Welcome email failed:', err.message);
    // Log verification code for support purposes when email fails
    console.log(`[SUPPORT] Email failed for ${user.email}. Verification code: ${verificationCode}`);
  }

  adminNotificationService.notifyNewUserRegistration(user)
    .catch(err => console.error('Admin notification failed:', err));

  // Initialize Switch non-custodial wallet for the new user (USDC on Solana)
  try {
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'MyArteLabUser';
    await switchService.getOrCreateUserWallet(user._id, fullName);
  } catch (walletErr) {
    console.warn('[Register] Warning: Could not initialize Switch wallet during signup:', walletErr.message);
  }

  // Create welcome notification for new user
  Notification.createNotification({
    recipient: user._id,
    type: 'system',
    title: 'Welcome to MyArteLab!',
    message: 'Your account has been created successfully. Complete your profile to start connecting with artists and creators.',
    link: '/profile'
  }).catch(err => console.error('Welcome notification failed:', err));

  successResponse(res, 201, 'Registration successful', {
    user: user.getPublicProfile(),
    token,
    refreshToken,
    emailSent,
    message: emailSent 
      ? 'Registration successful! Please check your email for the verification code.'
      : 'Registration successful! However, we could not send the verification email. Please click "Resend Code" or contact support.'
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

  // Block login if email is not verified
  if (!user.isEmailVerified) {
    // Generate a fresh verification code for the user
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = crypto.createHash('sha256').update(verificationCode).digest('hex');
    
    user.emailVerificationToken = hashedCode;
    user.emailVerificationExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
    await user.save({ validateBeforeSave: false });
    
    // Try to send the code via email
    let emailSent = false;
    try {
      await emailConfig.sendEmail({
        to: user.email,
        subject: 'Verify Your Email - MyArteLab',
        html: emailTemplates.verificationCode(user.firstName, verificationCode)
      });
      emailSent = true;
    } catch (err) {
      console.error(`[Login] Email failed for ${user.email}:`, err.message);
      console.log(`[SUPPORT] Login verification email failed for ${user.email}. Code: ${verificationCode}`);
    }
    
    return res.status(403).json({
      success: false,
      error: 'Please verify your email before logging in.',
      code: 'EMAIL_NOT_VERIFIED',
      email: user.email,
      emailSent,
      message: emailSent 
        ? 'A new verification code has been sent to your email. Please verify to continue.'
        : 'We could not send the verification email. Please click resend or contact support.'
    });
  }

  if (user.loginAttempts > 0) {
    await user.resetLoginAttempts();
  }

  user.lastLogin = new Date();
  user.lastActive = new Date();
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

  // Update lastActive in background
  user.lastActive = new Date();
  user.save({ validateBeforeSave: false }).catch(() => {});

  successResponse(res, 200, 'User retrieved successfully', {
    user: user.getPublicProfile()
  });
});

exports.pingActivity = catchAsync(async (req, res, next) => {
  // Update lastActive timestamp
  await User.findByIdAndUpdate(req.user._id, { lastActive: new Date() });
  
  successResponse(res, 200, 'Activity recorded');
});

exports.logout = catchAsync(async (req, res, next) => {

  successResponse(res, 200, 'Logout successful');
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return next(new ErrorHandler('Please provide current and new password', 400));
  }

  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return next(new ErrorHandler('Password must be at least 8 characters', 400));
  }
  if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword)) {
    return next(new ErrorHandler('Password must contain at least one uppercase and one lowercase letter', 400));
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

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    // Generic response to prevent account enumeration
    return successResponse(res, 200, 'If an account with that email exists, a verification code has been sent', {
      email: normalizedEmail
    });
  }

  // Generate a secure 6-digit verification code
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedCode = crypto.createHash('sha256').update(resetCode).digest('hex');

  user.resetPasswordToken = hashedCode;
  user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?code=${resetCode}&email=${encodeURIComponent(user.email)}`;

  try {
    await emailConfig.sendEmail({
      to: user.email,
      subject: 'Reset Your MyArteLab Password',
      html: emailTemplates.passwordReset(user.firstName || 'there', resetCode, resetUrl)
    });

    successResponse(res, 200, 'Password reset verification code sent', {
      email: user.email
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    console.error(`[ForgotPassword] Email failed for ${user.email}:`, error.message);
    console.log(`[SUPPORT] Password reset code for ${user.email}: ${resetCode}`);

    return next(new ErrorHandler('Email could not be sent. Please try again.', 500));
  }
});

exports.verifyResetCode = catchAsync(async (req, res, next) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return next(new ErrorHandler('Please provide email and verification code', 400));
  }

  const normalizedEmail = email.toLowerCase().trim();
  const hashedCode = crypto.createHash('sha256').update(code.toString().trim()).digest('hex');

  const user = await User.findOne({
    email: normalizedEmail,
    resetPasswordToken: hashedCode,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) {
    return next(new ErrorHandler('Invalid or expired verification code', 400));
  }

  // Code is valid! Issue a short-lived (15 min), single-use reset authorization token
  const resetAuthToken = crypto.randomBytes(32).toString('hex');
  const hashedAuthToken = crypto.createHash('sha256').update(resetAuthToken).digest('hex');

  user.resetPasswordToken = hashedAuthToken;
  user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes to set a new password
  await user.save({ validateBeforeSave: false });

  successResponse(res, 200, 'Verification code verified successfully', {
    resetToken: resetAuthToken,
    email: user.email
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const { token, code, email, newPassword } = req.body;

  if ((!token && (!code || !email)) || !newPassword) {
    return next(new ErrorHandler('Please provide reset authorization and new password', 400));
  }

  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return next(new ErrorHandler('Password must be at least 8 characters', 400));
  }
  if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword)) {
    return next(new ErrorHandler('Password must contain at least one uppercase and one lowercase letter', 400));
  }

  let user = null;

  if (token) {
    // Verified via 32-byte reset authorization token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });
  } else if (code && email) {
    // Direct code + email submission
    const hashedCode = crypto.createHash('sha256').update(code.toString().trim()).digest('hex');
    user = await User.findOne({
      email: email.toLowerCase().trim(),
      resetPasswordToken: hashedCode,
      resetPasswordExpire: { $gt: Date.now() }
    });
  }

  if (!user) {
    return next(new ErrorHandler('Invalid or expired reset token', 400));
  }

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  
  // Clear login lockout so user can immediately log in with new password
  user.loginAttempts = 0;
  user.lockUntil = undefined;
  
  await user.save();

  const jwtToken = generateToken(user._id);

  successResponse(res, 200, 'Password reset successful', { token: jwtToken });
});

exports.updateProfile = catchAsync(async (req, res, next) => {
  const allowedFields = ['firstName', 'lastName', 'bio', 'location', 'countryCode', 'country', 'skills', 'avatar', 'coverImage', 'phoneNumber', 'phoneNumberVisible', 'category', 'portfolio', 'services', 'profileVisibility', 'privacy'];
  const updates = {};

  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  // Handle explicit country / countryCode updates
  const { normalizeCountryCode, getCountryName } = require('../utils/countryUtils');
  const rawCountry = req.body.countryCode || req.body.country || req.body.location?.country || req.body.location?.countryCode;
  if (rawCountry !== undefined && rawCountry !== null && String(rawCountry).trim() !== '') {
    const normCode = normalizeCountryCode(String(rawCountry));
    if (!normCode) {
      return next(new ErrorHandler(`Invalid country: "${rawCountry}". Please select a valid country.`, 400));
    }
    updates.countryCode = normCode;
    const countryName = getCountryName(normCode);
    const existingLoc = req.user.location?.toObject ? req.user.location.toObject() : (req.user.location || {});
    updates.location = {
      ...existingLoc,
      ...(updates.location || {}),
      country: countryName
    };
    delete updates.country; // Normalized to countryCode and location.country
  }
  
  // Handle category - normalize to array and remove if empty
  if (updates.category !== undefined) {
    if (updates.category === '' || updates.category === null || 
        (Array.isArray(updates.category) && updates.category.length === 0)) {
      delete updates.category;
    } else if (!Array.isArray(updates.category)) {
      updates.category = [updates.category];
    }
  }
  
  // Handle skills parsing - if skills is a string, split it into array
  if (updates.skills !== undefined) {
    if (typeof updates.skills === 'string') {
      // Split by comma, space, or both, then clean up
      updates.skills = updates.skills
        .split(/[,\s]+/)
        .map(s => s.trim())
        .filter(s => s.length > 0 && s !== ',');
    } else if (Array.isArray(updates.skills)) {
      // Clean up array items
      updates.skills = updates.skills
        .map(s => typeof s === 'string' ? s.trim() : s)
        .filter(s => s && s.length > 0);
    }
  }
  
  // Validate that avatar and coverImage cannot be removed
  if (updates.avatar === '' || updates.avatar === null) {
    return next(new ErrorHandler('Profile photo cannot be removed. Please upload a new profile picture.', 400));
  }
  
  if (updates.coverImage === '' || updates.coverImage === null) {
    return next(new ErrorHandler('Profile banner cannot be removed. Please upload a new banner image.', 400));
  }

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
  const { code, email } = req.body;

  if (!code) {
    return next(new ErrorHandler('Please provide verification code', 400));
  }

  const hashedCode = crypto.createHash('sha256').update(code.toString().trim()).digest('hex');

  const query = {
    emailVerificationToken: hashedCode,
    emailVerificationExpire: { $gt: Date.now() }
  };

  if (email) {
    query.email = email.toLowerCase().trim();
  } else if (req.user) {
    query._id = req.user._id;
  }

  const user = await User.findOne(query);

  if (!user) {
    return next(new ErrorHandler('Invalid or expired verification code', 400));
  }

  user.isEmailVerified = true;
  user.isOnboarded = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;
  await user.save({ validateBeforeSave: false });

  const jwtToken = generateToken(user._id);

  emailConfig.sendEmail({
    to: user.email,
    subject: 'Email Verified Successfully! 🎉',
    html: emailTemplates.emailVerified(user.firstName || user.name)
  }).catch(err => console.error('Verification confirmation email failed:', err));

  successResponse(res, 200, 'Email verified successfully', {
    token: jwtToken,
    user: user.getPublicProfile()
  });
});

exports.resendVerification = catchAsync(async (req, res, next) => {
  // Support both authenticated (req.user) and unauthenticated (req.body.email) requests
  const email = req.body?.email;
  let user;

  if (req.user) {
    // Authenticated user — use their ID
    user = await User.findById(req.user._id);
  } else if (email) {
    // Unauthenticated user — find by email (for registration flow)
    user = await User.findOne({ email: email.toLowerCase().trim() });
  }

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
    // Log code for support but DON'T clear the token - user might retry or contact support
    console.error(`[Resend] Email failed for ${user.email}:`, error.message);
    console.log(`[SUPPORT] Email resend failed for ${user.email}. Verification code: ${verificationCode}`);

    return next(new ErrorHandler('Failed to send verification email. Please try again or contact support.', 500));
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

/**
 * @desc    Generate Google OAuth initiation URL
 * @route   GET /api/auth/google/url
 * @access  Public
 */
exports.getGoogleAuthUrl = catchAsync(async (req, res, next) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || '349133501173-8q51dm2dalrpg244mq07lfhlcrhk1ota.apps.googleusercontent.com';
  const { redirectUri, role, state } = req.query;

  const targetRedirectUri = redirectUri || 'https://myartelab.com';
  const statePayload = encodeURIComponent(JSON.stringify({ role: role || 'client', state: state || '' }));

  const url = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `redirect_uri=${encodeURIComponent(targetRedirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent('openid email profile')}&` +
    `access_type=offline&` +
    `prompt=select_account&` +
    `state=${statePayload}`;

  successResponse(res, 200, 'Google OAuth URL generated', { url, clientId });
});

/**
 * @desc    Authenticate with Google (ID token or OAuth authorization code)
 * @route   POST /api/auth/google
 * @access  Public
 */
exports.googleAuth = catchAsync(async (req, res, next) => {
  const { credential, code, redirectUri, role, category } = req.body;

  if (!credential && !code) {
    return next(new ErrorHandler('Google authentication token or authorization code is required', 400));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || '349133501173-8q51dm2dalrpg244mq07lfhlcrhk1ota.apps.googleusercontent.com';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  let googleUser = null;

  // Flow 1: ID Token / Credential (Google Identity Services)
  if (credential) {
    try {
      const response = await axios.get(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
        { timeout: 10000 }
      );

      const payload = response.data;

      // 1. Audience check
      if (payload.aud !== clientId) {
        console.error('[GoogleAuth] Audience mismatch. Expected:', clientId, 'Got:', payload.aud);
        return next(new ErrorHandler('Google token audience verification failed', 401));
      }

      // 2. Issuer check
      if (payload.iss !== 'accounts.google.com' && payload.iss !== 'https://accounts.google.com') {
        console.error('[GoogleAuth] Issuer mismatch:', payload.iss);
        return next(new ErrorHandler('Google token issuer verification failed', 401));
      }

      // 3. Expiration check
      const nowInSeconds = Math.floor(Date.now() / 1000);
      if (Number(payload.exp) < nowInSeconds) {
        return next(new ErrorHandler('Google token has expired', 401));
      }

      googleUser = {
        googleId: payload.sub,
        email: (payload.email || '').toLowerCase().trim(),
        emailVerified: payload.email_verified === 'true' || payload.email_verified === true,
        firstName: payload.given_name || payload.name?.split(' ')[0] || 'User',
        lastName: payload.family_name || payload.name?.split(' ').slice(1).join(' ') || '',
        avatar: payload.picture
      };
    } catch (err) {
      console.error('[GoogleAuth] Token verification error:', err.response?.data || err.message);
      return next(new ErrorHandler('Invalid Google credential token', 401));
    }
  }
  // Flow 2: OAuth 2.0 Authorization Code exchange
  else if (code) {
    try {
      const tokenResponse = await axios.post(
        'https://oauth2.googleapis.com/token',
        new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri || 'postmessage',
          grant_type: 'authorization_code'
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 10000
        }
      );

      const { id_token, access_token } = tokenResponse.data;

      if (id_token) {
        const verifyRes = await axios.get(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(id_token)}`,
          { timeout: 10000 }
        );
        const payload = verifyRes.data;

        if (payload.aud !== clientId) {
          return next(new ErrorHandler('Google token audience verification failed', 401));
        }

        googleUser = {
          googleId: payload.sub,
          email: (payload.email || '').toLowerCase().trim(),
          emailVerified: payload.email_verified === 'true' || payload.email_verified === true,
          firstName: payload.given_name || payload.name?.split(' ')[0] || 'User',
          lastName: payload.family_name || payload.name?.split(' ').slice(1).join(' ') || '',
          avatar: payload.picture
        };
      } else if (access_token) {
        const userinfoRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${access_token}` },
          timeout: 10000
        });
        const info = userinfoRes.data;
        googleUser = {
          googleId: info.sub,
          email: (info.email || '').toLowerCase().trim(),
          emailVerified: info.email_verified === true || info.email_verified === 'true',
          firstName: info.given_name || info.name?.split(' ')[0] || 'User',
          lastName: info.family_name || info.name?.split(' ').slice(1).join(' ') || '',
          avatar: info.picture
        };
      }
    } catch (err) {
      console.error('[GoogleAuth] Code exchange error:', err.response?.data || err.message);
      return next(new ErrorHandler('Failed to exchange Google authorization code', 401));
    }
  }

  if (!googleUser || !googleUser.email || !googleUser.googleId) {
    return next(new ErrorHandler('Could not retrieve verified Google profile', 400));
  }

  const isGoogleEmailVerified = Boolean(googleUser.emailVerified);

  // Find existing user by Google ID or by Email
  let user = await User.findOne({ googleId: googleUser.googleId });
  let isNew = false;

  if (!user) {
    user = await User.findOne({ email: googleUser.email });

    if (user) {
      // Safe account linking: Only link if Google identity has verified the email
      if (!isGoogleEmailVerified) {
        return next(new ErrorHandler('Google email is not verified by Google. Cannot link to existing account.', 403));
      }

      // Link Google ID to existing user account
      user.googleId = googleUser.googleId;
      if (!user.isEmailVerified) {
        user.isEmailVerified = true;
      }
      if (!user.avatar && googleUser.avatar) {
        user.avatar = googleUser.avatar;
      }
      await user.save({ validateBeforeSave: false });
    } else {
      // Create new user record
      if (!isGoogleEmailVerified) {
        return next(new ErrorHandler('Google account email is not verified. Please verify your email with Google first.', 403));
      }

      isNew = true;
      const targetRole = role === 'creator' ? 'creator' : 'client';
      const userCategory = targetRole === 'creator' && category
        ? (Array.isArray(category) ? category : [category])
        : [];

      user = await User.create({
        firstName: googleUser.firstName,
        lastName: googleUser.lastName || 'User',
        email: googleUser.email,
        googleId: googleUser.googleId,
        password: 'OAUTH_USER_NO_PASSWORD',
        isEmailVerified: true,
        isOnboarded: false, // New Google sign-ups must complete mandatory onboarding
        avatar: googleUser.avatar || '/images/avatar-3.png',
        coverImage: '/images/hero-bg.jpg',
        role: targetRole === 'creator' && userCategory.length > 0 ? 'creator' : 'client',
        category: targetRole === 'creator' && userCategory.length > 0 ? userCategory : undefined,
        location: {
          country: 'Nigeria',
          state: '',
          localArea: ''
        },
        countryCode: 'NG',
        wallet: {
          currency: 'USDC',
          balance: 0,
          pendingBalance: 0,
          totalEarnings: 0
        }
      });

      // Initialize Solana USDC non-custodial wallet via Switch
      try {
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'MyArteLabUser';
        await switchService.getOrCreateUserWallet(user._id, fullName);
      } catch (walletErr) {
        console.warn('[GoogleAuth] Switch wallet init warning:', walletErr.message);
      }

      // Notifications for new registration
      adminNotificationService.notifyNewUserRegistration(user).catch(() => {});
      Notification.createNotification({
        recipient: user._id,
        type: 'system',
        title: 'Welcome to MyArteLab!',
        message: 'Your account has been created with Google. Complete your profile setup to get started.',
        link: '/onboarding'
      }).catch(() => {});
    }
  }

  // Check account status
  if (user.isActive === false) {
    return next(new ErrorHandler('Your account has been deactivated. Please contact support.', 403));
  }
  if (typeof user.isLocked === 'function' && user.isLocked()) {
    return next(new ErrorHandler('Account is temporarily locked. Please try again later.', 423));
  }

  // Reset login attempts and update timestamps
  if (user.loginAttempts > 0 && typeof user.resetLoginAttempts === 'function') {
    await user.resetLoginAttempts();
  }
  user.lastLogin = new Date();
  user.lastActive = new Date();
  await user.save({ validateBeforeSave: false });

  // Issue authentic session tokens
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  const publicProfile = user.getPublicProfile();

  successResponse(res, 200, isNew ? 'Google registration successful' : 'Google login successful', {
    user: publicProfile,
    token,
    refreshToken,
    isNewUser: isNew,
    requiresOnboarding: !publicProfile.isOnboarded
  });
});

/**
 * @desc    Complete onboarding for authenticated user
 * @route   POST /api/auth/complete-onboarding
 * @access  Private
 */
exports.completeOnboarding = catchAsync(async (req, res, next) => {
  const { role, category, location, bio, phoneNumber, firstName, lastName } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    return next(new ErrorHandler('User not found', 404));
  }

  // 1. Validate role (mandatory: client or creator)
  if (!role || (role !== 'client' && role !== 'creator')) {
    return next(new ErrorHandler('Please select a valid account type (client or creator)', 400));
  }

  // 2. Validate categories if creator (mandatory: 1 to 3 categories)
  let normalizedCategories = [];
  if (role === 'creator') {
    const rawCategories = Array.isArray(category) ? category : category ? [category] : [];
    normalizedCategories = rawCategories.filter(Boolean);
    if (normalizedCategories.length === 0) {
      return next(new ErrorHandler('Creators must select at least one primary creative category', 400));
    }
    if (normalizedCategories.length > 3) {
      return next(new ErrorHandler('Creators can select at most 3 categories', 400));
    }
  }

  // 3. Update user fields
  user.role = role;
  user.category = role === 'creator' ? normalizedCategories : undefined;

  if (firstName && firstName.trim()) user.firstName = firstName.trim();
  if (lastName && lastName.trim()) user.lastName = lastName.trim();
  if (bio !== undefined) user.bio = bio ? bio.trim() : user.bio;
  if (phoneNumber !== undefined) user.phoneNumber = phoneNumber ? phoneNumber.trim() : user.phoneNumber;

  // 4. Update location if provided
  if (location) {
    const { normalizeCountryCode, getCountryName } = require('../utils/countryUtils');
    const localArea = location.localArea || user.location?.localArea || '';
    const state = location.state || user.location?.state || '';
    const rawCountry = location.country || user.location?.country || 'Nigeria';
    const normalizedCountryCode = location.countryCode || normalizeCountryCode(rawCountry) || user.countryCode || 'NG';
    const countryName = getCountryName(normalizedCountryCode) || rawCountry;

    user.location = {
      localArea,
      state,
      country: countryName
    };
    user.countryCode = normalizedCountryCode;
  }

  // 5. Mark onboarding as complete and save
  user.isOnboarded = true;
  await user.save();

  successResponse(res, 200, 'Onboarding completed successfully', {
    user: user.getPublicProfile()
  });
});
