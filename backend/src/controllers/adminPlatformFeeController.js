/**
 * Admin Platform Fee Controller
 * Manage accumulated platform fees and withdrawals
 */

const User = require('../models/User');
const Transaction = require('../models/Transaction');
const platformFeeAccumulator = require('../services/platformFeeAccumulator');
const { successResponse } = require('../utils/apiResponse');
const { ErrorHandler, catchAsync } = require('../utils/errorHandler');

/**
 * Get all accumulated platform fees across all users
 * For admin analytics dashboard
 */
exports.getAccumulatedFees = catchAsync(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return next(new ErrorHandler('Admin access required', 403));
  }

  // Aggregate all pending platform fees
  const accumulatedFees = await Transaction.aggregate([
    {
      $match: {
        type: 'platform_fee',
        status: 'pending_accumulation'
      }
    },
    {
      $group: {
        _id: '$user',
        totalAmount: { $sum: '$amount' },
        transactionCount: { $sum: 1 },
        currency: { $first: '$currency' }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'userInfo'
      }
    },
    {
      $unwind: '$userInfo'
    },
    {
      $project: {
        userId: '$_id',
        userEmail: '$userInfo.email',
        userName: { $concat: ['$userInfo.firstName', ' ', '$userInfo.lastName'] },
        totalAmount: 1,
        transactionCount: 1,
        currency: 1,
        canWithdraw: { $gte: ['$totalAmount', 1] } // HostFi minimum
      }
    },
    {
      $sort: { totalAmount: -1 }
    }
  ]);

  // Calculate totals
  const totalAccumulated = accumulatedFees.reduce((sum, item) => sum + item.totalAmount, 0);
  const totalReadyToWithdraw = accumulatedFees
    .filter(item => item.canWithdraw)
    .reduce((sum, item) => sum + item.totalAmount, 0);

  successResponse(res, 200, 'Accumulated platform fees retrieved', {
    fees: accumulatedFees,
    summary: {
      totalAccumulated,
      totalReadyToWithdraw,
      totalUsers: accumulatedFees.length,
      usersReadyToWithdraw: accumulatedFees.filter(item => item.canWithdraw).length
    }
  });
});

/**
 * Withdraw accumulated fees for a specific user
 * Admin can trigger this from the dashboard
 */
exports.withdrawUserFees = catchAsync(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return next(new ErrorHandler('Admin access required', 403));
  }

  const { userId } = req.params;

  // Get user
  const user = await User.findById(userId);
  if (!user) {
    return next(new ErrorHandler('User not found', 404));
  }

  // Check accumulated amount
  const accumulatedAmount = await platformFeeAccumulator.getAccumulatedAmount(userId, 'USDC');
  
  if (accumulatedAmount < 1) {
    return next(new ErrorHandler(
      `Insufficient accumulated fees. Current: ${accumulatedAmount} USDC, Minimum: 1 USDC`,
      400
    ));
  }

  // Get user's asset ID
  const usdcAsset = user.wallet?.hostfiWalletAssets?.find(a => a.currency === 'USDC');
  if (!usdcAsset?.assetId) {
    return next(new ErrorHandler('User has no USDC wallet asset', 400));
  }

  // Execute withdrawal
  const result = await platformFeeAccumulator.withdrawAccumulatedFees(
    userId,
    'USDC',
    usdcAsset.assetId
  );

  successResponse(res, 200, 'Platform fees withdrawn successfully', {
    user: {
      id: userId,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`
    },
    withdrawn: result
  });
});

/**
 * Withdraw all accumulated fees (bulk operation)
 * Only withdraws fees that have reached the 1 USDC minimum
 */
exports.withdrawAllFees = catchAsync(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return next(new ErrorHandler('Admin access required', 403));
  }

  const results = await platformFeeAccumulator.forceWithdrawAll();

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => r.error);

  successResponse(res, 200, 'Bulk withdrawal completed', {
    summary: {
      totalProcessed: results.length,
      successful: successful.length,
      failed: failed.length,
      totalWithdrawn: successful.reduce((sum, r) => sum + (r.amount || 0), 0)
    },
    details: {
      successful,
      failed
    }
  });
});

/**
 * Get platform fee analytics
 * For admin dashboard charts and stats
 */
exports.getFeeAnalytics = catchAsync(async (req, res, next) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return next(new ErrorHandler('Admin access required', 403));
  }

  const { days = 30 } = req.query;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));

  // Get daily fee collection stats
  const dailyStats = await Transaction.aggregate([
    {
      $match: {
        type: 'platform_fee',
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 }
    }
  ]);

  // Get status breakdown
  const statusBreakdown = await Transaction.aggregate([
    {
      $match: {
        type: 'platform_fee'
      }
    },
    {
      $group: {
        _id: '$status',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);

  successResponse(res, 200, 'Platform fee analytics retrieved', {
    dailyStats,
    statusBreakdown,
    period: {
      days: parseInt(days),
      startDate,
      endDate: new Date()
    }
  });
});
