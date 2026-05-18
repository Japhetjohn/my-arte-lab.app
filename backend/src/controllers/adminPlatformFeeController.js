/**
 * Admin Platform Fee Controller
 * View-only: Shows accumulated platform profits from completed bookings
 * HostFi B2B handles fee splitting automatically — no manual withdrawal needed
 */

const Transaction = require('../models/Transaction');
const Booking = require('../models/Booking');
const { successResponse } = require('../utils/apiResponse');
const { ErrorHandler, catchAsync } = require('../utils/errorHandler');

/**
 * Get total platform profits from completed bookings
 * For admin analytics dashboard
 */
exports.getAccumulatedFees = catchAsync(async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return next(new ErrorHandler('Admin access required', 403));
  }

  // Calculate from completed bookings (source of truth for platform earnings)
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

  // Get recent completed bookings for the feed
  const recentBookings = await Booking.find({ status: 'completed' })
    .sort({ completedAt: -1 })
    .limit(20)
    .populate('client', 'firstName lastName email')
    .populate('creator', 'firstName lastName email')
    .lean();

  successResponse(res, 200, 'Platform profits retrieved', {
    summary: {
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
});

/**
 * Get platform fee analytics over time
 * For admin dashboard charts
 */
exports.getFeeAnalytics = catchAsync(async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return next(new ErrorHandler('Admin access required', 403));
  }

  const { days = 30 } = req.query;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));

  // Daily stats from completed bookings
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

  // Monthly totals
  const monthlyStats = await Booking.aggregate([
    {
      $match: { status: 'completed' }
    },
    {
      $group: {
        _id: {
          year: { $year: '$completedAt' },
          month: { $month: '$completedAt' }
        },
        totalAmount: { $sum: '$amount' },
        platformFees: { $sum: '$platformFee' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': -1, '_id.month': -1 }
    }
  ]);

  successResponse(res, 200, 'Platform fee analytics retrieved', {
    dailyStats,
    monthlyStats,
    period: {
      days: parseInt(days),
      startDate,
      endDate: new Date()
    }
  });
});
