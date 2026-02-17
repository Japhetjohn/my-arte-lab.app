const express = require('express');
const router = express.Router();
const { successResponse, errorResponse } = require('../utils/apiResponse');
const metricsService = require('../services/metricsService');

// Admin cleanup endpoint - protected by admin secret
router.post('/cleanup-unknown-creators', async (req, res) => {
  try {
    const { adminSecret } = req.body;

    // Check admin secret
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return errorResponse(res, 403, 'Unauthorized - Invalid admin secret');
    }

    const User = require('../models/User');

    // Find and delete all users with undefined/null firstName or lastName
    // or users whose firstName/lastName combination results in empty name
    const usersToDelete = await User.find({
      $or: [
        { firstName: { $exists: false } },
        { lastName: { $exists: false } },
        { firstName: null },
        { lastName: null },
        { firstName: '' },
        { lastName: '' }
      ]
    });

    console.log(`Found ${usersToDelete.length} users to delete`);

    const deletedEmails = usersToDelete.map(u => u.email);

    const deleteResult = await User.deleteMany({
      _id: { $in: usersToDelete.map(u => u._id) }
    });

    console.log(`Deleted ${deleteResult.deletedCount} users`);

    return successResponse(res, 200, `Successfully deleted ${deleteResult.deletedCount} unknown creators`, {
      count: deleteResult.deletedCount,
      deletedEmails: deletedEmails
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return errorResponse(res, 500, 'Cleanup failed', error.message);
  }
});

// Alternative: Delete all creators (except specific user)
router.post('/cleanup-all-except', async (req, res) => {
  try {
    const { adminSecret, keepEmail } = req.body;

    // Check admin secret
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return errorResponse(res, 403, 'Unauthorized - Invalid admin secret');
    }

    if (!keepEmail) {
      return errorResponse(res, 400, 'keepEmail is required');
    }

    const User = require('../models/User');

    // Find the user to keep
    const keepUser = await User.findOne({ email: keepEmail });

    if (!keepUser) {
      return errorResponse(res, 404, `User with email ${keepEmail} not found`);
    }

    console.log(`Keeping user: ${keepUser.firstName} ${keepUser.lastName} (${keepUser.email})`);

    // Delete all except the specified user
    const deleteResult = await User.deleteMany({
      _id: { $ne: keepUser._id }
    });

    console.log(`Deleted ${deleteResult.deletedCount} users`);

    return successResponse(res, 200, `Successfully deleted ${deleteResult.deletedCount} users. Kept: ${keepUser.email}`, {
      deletedCount: deleteResult.deletedCount,
      keptUser: {
        email: keepUser.email,
        name: `${keepUser.firstName} ${keepUser.lastName}`,
        role: keepUser.role
      }
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return errorResponse(res, 500, 'Cleanup failed', error.message);
  }
});

// Delete specific user by email
// Protected by verifyAdminAuth middleware
router.post('/delete-user', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return errorResponse(res, 400, 'Email is required');
    }

    const User = require('../models/User');

    // Find and delete the user
    const user = await User.findOneAndDelete({ email });

    if (!user) {
      return errorResponse(res, 404, `User with email ${email} not found`);
    }

    console.log(`[ADMIN] Deleted user: ${user.firstName} ${user.lastName} (${user.email})`);

    return successResponse(res, 200, `Successfully deleted user: ${user.email}`, {
      deletedUser: {
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Delete user error:', error);
    return errorResponse(res, 500, 'Failed to delete user', error.message);
  }
});

// Delete specific user by ID
// Protected by verifyAdminAuth middleware
router.post('/delete-user-by-id', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return errorResponse(res, 400, 'User ID is required');
    }

    const User = require('../models/User');

    // Find and delete the user
    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return errorResponse(res, 404, `User with ID ${userId} not found`);
    }

    console.log(`[ADMIN] Deleted user: ${user.firstName} ${user.lastName} (${user.email}) - ID: ${userId}`);

    return successResponse(res, 200, `Successfully deleted user: ${user.email}`, {
      deletedUser: {
        id: userId,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Delete user error:', error);
    return errorResponse(res, 500, 'Failed to delete user', error.message);
  }
});

// Recalculate metrics for all creators
router.post('/recalculate-metrics', async (req, res) => {
  try {
    const { adminSecret } = req.body;

    // Check admin secret
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return errorResponse(res, 403, 'Unauthorized - Invalid admin secret');
    }

    console.log('Starting metrics recalculation for all creators...');

    const results = await metricsService.updateAllCreatorMetrics();

    console.log(`Metrics recalculation complete: ${results.updated} updated, ${results.failed} failed`);

    return successResponse(res, 200, 'Metrics recalculation completed', {
      total: results.total,
      updated: results.updated,
      failed: results.failed,
      errors: results.errors
    });

  } catch (error) {
    console.error('Metrics recalculation error:', error);
    return errorResponse(res, 500, 'Metrics recalculation failed', error.message);
  }
});

module.exports = router;
