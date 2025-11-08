const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');
const { successResponse } = require('../utils/apiResponse');

/**
 * @route   GET /api/auth/google
 * @desc    Initiate Google OAuth flow
 * @access  Public
 */
router.get('/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
  })
);

/**
 * @route   GET /api/auth/google/callback
 * @desc    Google OAuth callback
 * @access  Public
 */
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL}/?error=google_auth_failed`,
    session: false
  }),
  (req, res) => {
    try {
      // Generate JWT token
      const token = jwt.sign(
        {
          id: req.user._id,
          email: req.user.email,
          role: req.user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      // Generate refresh token
      const refreshToken = jwt.sign(
        { id: req.user._id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }
      );

      // Update last login
      req.user.lastLogin = Date.now();
      req.user.save({ validateBeforeSave: false });

      // Redirect to frontend with token in URL
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8000';
      res.redirect(`${frontendUrl}/oauth-callback.html?token=${token}&refresh=${refreshToken}`);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/?error=token_generation_failed`);
    }
  }
);

/**
 * @route   GET /api/auth/google/status
 * @desc    Check if Google OAuth is configured
 * @access  Public
 */
router.get('/google/status', (req, res) => {
  const isConfigured = !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET
  );

  successResponse(res, 200, 'Google OAuth status', {
    configured: isConfigured,
    message: isConfigured
      ? 'Google OAuth is configured and ready to use'
      : 'Google OAuth is not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file'
  });
});

module.exports = router;
