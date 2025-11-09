const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');
const { successResponse } = require('../utils/apiResponse');
const crypto = require('crypto');

const pendingOAuthRequests = new Map();

router.get('/google',
  (req, res, next) => {
    const mode = req.query.mode || 'signin';
    const role = req.query.role || 'client';

    const stateToken = crypto.randomBytes(32).toString('hex');

    pendingOAuthRequests.set(stateToken, {
      mode,
      role,
      timestamp: Date.now()
    });

    setTimeout(() => pendingOAuthRequests.delete(stateToken), 10 * 60 * 1000);

    passport.authenticate('google', {
      scope: ['profile', 'email'],
      session: false,
      state: stateToken
    })(req, res, next);
  }
);

router.get('/google/callback',
  (req, res, next) => {
    const stateToken = req.query.state;
    if (stateToken && pendingOAuthRequests.has(stateToken)) {
      const oauthData = pendingOAuthRequests.get(stateToken);
      req.oauthMode = oauthData.mode;
      req.oauthRole = oauthData.role;
      console.log(`Google OAuth callback: mode=${oauthData.mode}, role=${oauthData.role}`);
      pendingOAuthRequests.delete(stateToken);
    } else {
      console.log('Google OAuth callback: No state found, defaulting to signin');
      req.oauthMode = 'signin';
      req.oauthRole = 'client';
    }
    next();
  },
  (req, res, next) => {
    passport.authenticate('google', {
      session: false,
      failureRedirect: `${process.env.FRONTEND_URL}/?error=google_auth_failed`
    }, (err, user, info) => {
      if (err) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const errorMsg = encodeURIComponent(err.message || 'Authentication failed');
        return res.redirect(`${frontendUrl}/?error=${errorMsg}`);
      }
      if (!user) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(`${frontendUrl}/?error=google_auth_failed`);
      }
      req.user = user;
      next();
    })(req, res, next);
  },
  (req, res) => {
    try {
      const token = jwt.sign(
        {
          id: req.user._id,
          email: req.user.email,
          role: req.user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      const refreshToken = jwt.sign(
        { id: req.user._id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }
      );

      req.user.lastLogin = Date.now();
      req.user.save({ validateBeforeSave: false });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/oauth-callback.html?token=${token}&refresh=${refreshToken}`);
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/?error=token_generation_failed`);
    }
  }
);

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
