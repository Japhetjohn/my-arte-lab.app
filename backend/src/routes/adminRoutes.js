const express = require('express');
const router = express.Router();
const { successResponse, errorResponse } = require('../utils/apiResponse');
const metricsService = require('../services/metricsService');
const adminPlatformFeeController = require('../controllers/adminPlatformFeeController');
const { protect } = require('../middleware/auth');

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

// Withdraw accumulated platform fees
router.post('/platform-fees/withdraw', async (req, res) => {
  try {
    const platformFeeAccumulator = require('../services/platformFeeAccumulator');
    const User = require('../models/User');
    const mongoose = require('mongoose');
    
    const clientUserId = process.env.HOSTFI_CLIENT_USER_ID || '677fc32a5e199a1dbc0eb9e5';
    
    // Get client user and their asset ID
    const client = await User.findById(clientUserId);
    if (!client || !client.wallet?.hostfiWalletAssets) {
      return errorResponse(res, 500, 'Client wallet not configured');
    }
    
    const usdcAsset = client.wallet.hostfiWalletAssets.find(a => a.currency === 'USDC');
    if (!usdcAsset?.assetId) {
      return errorResponse(res, 500, 'USDC asset not found in client wallet');
    }
    
    // Withdraw fees - correct method signature: (userId, currency, clientAssetId)
    const result = await platformFeeAccumulator.withdrawAccumulatedFees(
      clientUserId,
      'USDC',
      usdcAsset.assetId
    );
    
    if (result.success) {
      return successResponse(res, 200, `Successfully withdrawn ${result.amount} USDC to platform wallet`, {
        amount: result.amount,
        reference: result.reference,
        transactionsUpdated: result.transactionsUpdated
      });
    } else if (result.skipped) {
      return successResponse(res, 200, 'Withdrawal skipped: ' + result.reason, {
        accumulated: result.accumulated
      });
    } else {
      return errorResponse(res, 400, 'Withdrawal failed', result);
    }
  } catch (error) {
    console.error('Withdraw platform fees error:', error);
    return errorResponse(res, 500, 'Failed to withdraw platform fees', error.message);
  }
});

module.exports = router;
