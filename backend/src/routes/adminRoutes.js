const express = require('express');
const router = express.Router();
const { successResponse, errorResponse } = require('../utils/apiResponse');
const metricsService = require('../services/metricsService');
const adminPlatformFeeController = require('../controllers/adminPlatformFeeController');
const { protect } = require('../middleware/auth');
const { verifyAdminAuth } = require('../middleware/adminAuth');

// All admin routes require API key authentication
router.use(verifyAdminAuth);

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

// Verify a creator (add verified badge)
router.post('/verify-creator', async (req, res) => {
  try {
    const { adminSecret, userId, email } = req.body;

    // Check admin secret
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return errorResponse(res, 403, 'Unauthorized - Invalid admin secret');
    }

    if (!userId && !email) {
      return errorResponse(res, 400, 'Either userId or email is required');
    }

    const User = require('../models/User');

    // Find user by ID or email
    const query = userId ? { _id: userId } : { email };
    const user = await User.findOne(query);

    if (!user) {
      return errorResponse(res, 404, `User not found`);
    }

    if (user.role !== 'creator') {
      return errorResponse(res, 400, 'User is not a creator');
    }

    // Update verified status
    user.isVerified = true;
    await user.save();

    console.log(`[ADMIN] Verified creator: ${user.name} (${user.email})`);

    return successResponse(res, 200, `Creator ${user.name} is now verified`, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified
      }
    });

  } catch (error) {
    console.error('Verify creator error:', error);
    return errorResponse(res, 500, 'Failed to verify creator', error.message);
  }
});

// Unverify a creator (remove verified badge)
router.post('/unverify-creator', async (req, res) => {
  try {
    const { adminSecret, userId, email } = req.body;

    // Check admin secret
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return errorResponse(res, 403, 'Unauthorized - Invalid admin secret');
    }

    if (!userId && !email) {
      return errorResponse(res, 400, 'Either userId or email is required');
    }

    const User = require('../models/User');

    // Find user by ID or email
    const query = userId ? { _id: userId } : { email };
    const user = await User.findOne(query);

    if (!user) {
      return errorResponse(res, 404, `User not found`);
    }

    // Update verified status
    user.isVerified = false;
    await user.save();

    console.log(`[ADMIN] Unverified creator: ${user.name} (${user.email})`);

    return successResponse(res, 200, `Creator ${user.name} is now unverified`, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified
      }
    });

  } catch (error) {
    console.error('Unverify creator error:', error);
    return errorResponse(res, 500, 'Failed to unverify creator', error.message);
  }
});

// Get accumulated platform fees for admin (view-only, from completed bookings)
router.get('/platform-fees', async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    
    // Calculate from completed bookings (source of truth)
    const bookingStats = await Booking.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: null,
          totalPlatformFees: { $sum: '$platformFee' },
          totalCreatorPayouts: { $sum: '$creatorAmount' },
          totalBookingVolume: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const stats = bookingStats[0] || {
      totalPlatformFees: 0,
      totalCreatorPayouts: 0,
      totalBookingVolume: 0,
      count: 0
    };
    
    // Get recent completed bookings
    const recentBookings = await Booking.find({ status: 'completed' })
      .sort({ completedAt: -1 })
      .limit(20)
      .populate('client', 'firstName lastName email')
      .populate('creator', 'firstName lastName email')
      .lean();
    
    return successResponse(res, 200, 'Platform profits retrieved', {
      stats: {
        totalPlatformFees: Math.round(stats.totalPlatformFees * 100) / 100,
        totalCreatorPayouts: Math.round(stats.totalCreatorPayouts * 100) / 100,
        totalBookingVolume: Math.round(stats.totalBookingVolume * 100) / 100,
        totalBookings: stats.count,
        commissionRate: 10
      },
      recentBookings: recentBookings.map(b => ({
        id: b._id,
        bookingId: b.bookingId,
        serviceTitle: b.serviceTitle,
        amount: b.amount,
        platformFee: b.platformFee,
        creatorAmount: b.creatorAmount,
        currency: b.currency,
        client: b.client ? `${b.client.firstName} ${b.client.lastName}` : 'Unknown',
        creator: b.creator ? `${b.creator.firstName} ${b.creator.lastName}` : 'Unknown',
        completedAt: b.completedAt
      }))
    });
  } catch (error) {
    console.error('Get platform fees error:', error);
    return errorResponse(res, 500, 'Failed to get platform fees', error.message);
  }
});

// Unlock a locked user account (clear loginAttempts and lockUntil)
router.post('/unlock-user', async (req, res) => {
  try {
    const { email, userId } = req.body;

    if (!email && !userId) {
      return errorResponse(res, 400, 'Either email or userId is required');
    }

    const User = require('../models/User');

    // Find user by ID or email
    const query = userId ? { _id: userId } : { email };
    const user = await User.findOne(query);

    if (!user) {
      return errorResponse(res, 404, `User not found`);
    }

    // Check if user is actually locked
    const wasLocked = user.isLocked();
    const previousAttempts = user.loginAttempts;

    // Reset login attempts and clear lock
    await user.resetLoginAttempts();

    console.log(`[ADMIN] Unlocked user: ${user.name || user.email} (wasLocked: ${wasLocked}, attempts: ${previousAttempts})`);

    return successResponse(res, 200, `User ${user.email} unlocked successfully`, {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        wasLocked,
        previousLoginAttempts: previousAttempts
      }
    });

  } catch (error) {
    console.error('Unlock user error:', error);
    return errorResponse(res, 500, 'Failed to unlock user', error.message);
  }
});

// Get platform fee analytics (view-only)
router.get('/platform-fees/analytics', async (req, res) => {
  try {
    const Booking = require('../models/Booking');
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const dailyStats = await Booking.aggregate([
      {
        $match: {
          status: 'completed',
          completedAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$completedAt' },
            month: { $month: '$completedAt' },
            day: { $dayOfMonth: '$completedAt' }
          },
          totalAmount: { $sum: '$amount' },
          platformFees: { $sum: '$platformFee' },
          creatorPayouts: { $sum: '$creatorAmount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 }
      }
    ]);

    return successResponse(res, 200, 'Platform fee analytics retrieved', {
      dailyStats,
      period: {
        days: parseInt(days),
        startDate,
        endDate: new Date()
      }
    });
  } catch (error) {
    console.error('Get fee analytics error:', error);
    return errorResponse(res, 500, 'Failed to get fee analytics', error.message);
  }
});

module.exports = router;
