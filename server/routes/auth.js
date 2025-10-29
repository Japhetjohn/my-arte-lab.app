const express = require('express');
const router = express.Router();
const passport = require('passport');
const { register, login, getMe, verifyEmail, resendVerificationEmail, googleAuthCallback } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.get('/verify-email/:token', verifyEmail);

// Google OAuth routes - only register if Google OAuth is configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  router.get('/google/callback', passport.authenticate('google', { session: true, failureRedirect: '/login' }), googleAuthCallback);
} else {
  // Provide a fallback route that returns an error message
  router.get('/google', (req, res) => {
    res.status(503).json({ message: 'Google OAuth is not configured. Please contact the administrator.' });
  });
  router.get('/google/callback', (req, res) => {
    res.status(503).json({ message: 'Google OAuth is not configured. Please contact the administrator.' });
  });
}

// Protected routes
router.get('/me', protect, getMe);
router.post('/resend-verification', protect, resendVerificationEmail);

module.exports = router;
