const express = require('express');
const router = express.Router();
const passport = require('passport');
const { register, login, getMe, verifyEmail, resendVerificationEmail, googleAuthCallback } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.get('/verify-email/:token', verifyEmail);

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { session: true, failureRedirect: '/login' }), googleAuthCallback);

// Protected routes
router.get('/me', protect, getMe);
router.post('/resend-verification', protect, resendVerificationEmail);

module.exports = router;
