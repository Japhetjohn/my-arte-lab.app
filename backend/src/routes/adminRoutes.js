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

// Get accumulated platform fees for admin
router.get('/platform-fees', async (req, res) => {
  try {
    const Transaction = require('../models/Transaction');
    const mongoose = require('mongoose');
    
    // Aggregate fees by status
    const stats = await Transaction.aggregate([
      { $match: { type: 'platform_fee' } },
      {
        $group: {
          _id: '$status',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Get total accumulated (pending_accumulation)
    const accumulatedResult = await Transaction.aggregate([
      { $match: { type: 'platform_fee', status: 'pending_accumulation' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalAccumulated = accumulatedResult.length > 0 ? accumulatedResult[0].total : 0;
    
    // Get total withdrawn (completed)
    const withdrawnResult = await Transaction.aggregate([
      { $match: { type: 'platform_fee', status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalWithdrawn = withdrawnResult.length > 0 ? withdrawnResult[0].total : 0;
    
    // Get recent fees
    const recentFees = await Transaction.find({ type: 'platform_fee' })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('user', 'firstName lastName email')
      .lean();
    
    return successResponse(res, 200, 'Platform fees retrieved', {
      stats: {
        totalAccumulated: Math.round(totalAccumulated * 100) / 100,
        totalWithdrawn: Math.round(totalWithdrawn * 100) / 100,
        breakdown: stats
      },
      recentFees,
      canWithdraw: totalAccumulated >= 1
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

// Trigger immediate platform fee batch withdrawal (admin override)
router.post('/platform-fees/withdraw', async (req, res) => {
  try {
    const platformFeeAccumulator = require('../services/platformFeeAccumulator');
    const { runPayoutJobNow } = require('../jobs/payoutCron');
    
    const result = await runPayoutJobNow();
    
    if (result.skipped) {
      return successResponse(res, 200, 'Withdrawal skipped', {
        reason: result.reason,
        totalPending: result.totalPending
      });
    }
    
    return successResponse(res, 200, `Successfully withdrawn ${result.amount} USDC to platform wallet`, {
      amount: result.amount,
      reference: result.reference,
      feesCount: result.feesCount
    });
  } catch (error) {
    console.error('Withdraw platform fees error:', error);
    return errorResponse(res, 500, 'Failed to withdraw platform fees', error.message);
  }
});

// ─── PLATFORM FEE ADMIN ENDPOINTS ───

// Get pending platform fees summary
router.get('/payouts/pending', async (req, res) => {
  try {
    const platformFeeAccumulator = require('../services/platformFeeAccumulator');
    const Transaction = require('../models/Transaction');
    
    const globalPending = await platformFeeAccumulator.getGlobalPendingAmount('USDC');
    const pendingFees = await platformFeeAccumulator.getPendingFees('USDC');
    
    return successResponse(res, 200, 'Pending platform fees retrieved', {
      summary: {
        totalPending: globalPending,
        feesCount: pendingFees.length,
        canWithdraw: globalPending >= 1,
        nextScheduledRun: 'Daily at 00:00 UTC (midnight)'
      },
      fees: pendingFees.map(tx => ({
        id: tx._id,
        amount: tx.amount,
        currency: tx.currency,
        booking: tx.booking,
        user: tx.user,
        createdAt: tx.createdAt
      }))
    });
  } catch (error) {
    console.error('Get pending fees error:', error);
    return errorResponse(res, 500, 'Failed to get pending fees', error.message);
  }
});

// Trigger immediate batch withdrawal
router.post('/payouts/process', async (req, res) => {
  try {
    const { runPayoutJobNow } = require('../jobs/payoutCron');
    
    // Run synchronously since it's now a single HostFi call
    const result = await runPayoutJobNow();
    
    if (result.skipped) {
      return successResponse(res, 200, 'Batch skipped', {
        reason: result.reason,
        totalPending: result.totalPending
      });
    }
    
    return successResponse(res, 200, 'Batch withdrawal completed', {
      amount: result.amount,
      reference: result.reference,
      feesCount: result.feesCount
    });
  } catch (error) {
    console.error('Process batch error:', error);
    return errorResponse(res, 500, 'Failed to process batch', error.message);
  }
});

module.exports = router;
