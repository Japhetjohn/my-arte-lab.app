const User = require('../models/User');

/**
 * Middleware to track user activity
 * Updates lastActive timestamp when user performs actions
 */
const trackActivity = async (req, res, next) => {
  // Only track authenticated users
  if (req.user && req.user._id) {
    try {
      // Update lastActive in background (don't await to avoid slowing requests)
      User.findByIdAndUpdate(req.user._id, { lastActive: new Date() }).exec();
    } catch (error) {
      // Silently fail - don't block requests
      console.error('[ActivityTracker] Error:', error.message);
    }
  }
  next();
};

/**
 * Mark user as active manually
 * Use this for specific actions like logging in, booking, etc.
 */
const markActive = async (userId) => {
  try {
    await User.findByIdAndUpdate(userId, { lastActive: new Date() });
  } catch (error) {
    console.error('[ActivityTracker] markActive error:', error.message);
  }
};

module.exports = { trackActivity, markActive };
