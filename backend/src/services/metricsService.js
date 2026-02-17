/**
 * Creator Metrics Calculation Service
 * Calculates and updates creator performance metrics based on booking history
 */

const Booking = require('../models/Booking');
const User = require('../models/User');

/**
 * Calculate all metrics for a creator
 * @param {string} creatorId - The creator's user ID
 * @returns {Promise<Object>} Calculated metrics
 */
async function calculateCreatorMetrics(creatorId) {
  // Get all bookings for this creator
  const allBookings = await Booking.find({ creator: creatorId });

  // Get completed bookings only
  const completedBookings = allBookings.filter(b => b.status === 'completed');

  // Calculate completed bookings count
  const completedCount = completedBookings.length;

  // Calculate response rate (bookings confirmed / total bookings)
  const confirmedBookings = allBookings.filter(b =>
    ['confirmed', 'in_progress', 'completed'].includes(b.status)
  );
  const responseRate = allBookings.length > 0
    ? Math.round((confirmedBookings.length / allBookings.length) * 100)
    : 100;

  // Calculate on-time delivery rate
  let onTimeCount = 0;
  completedBookings.forEach(booking => {
    if (booking.completedAt && booking.endDate) {
      // Check if completed before or on the end date
      if (new Date(booking.completedAt) <= new Date(booking.endDate)) {
        onTimeCount++;
      }
    }
  });
  const onTimeDeliveryRate = completedBookings.length > 0
    ? Math.round((onTimeCount / completedBookings.length) * 100)
    : 100;

  // Calculate repeat client rate
  const clientCounts = {};
  completedBookings.forEach(booking => {
    const clientId = booking.client.toString();
    clientCounts[clientId] = (clientCounts[clientId] || 0) + 1;
  });

  const repeatClients = Object.values(clientCounts).filter(count => count > 1).length;
  const uniqueClients = Object.keys(clientCounts).length;
  const repeatClientRate = uniqueClients > 0
    ? Math.round((repeatClients / uniqueClients) * 100)
    : 0;

  // Calculate total earnings and average order value
  const totalEarnings = completedBookings.reduce((sum, booking) => {
    return sum + (booking.creatorAmount || 0);
  }, 0);

  const averageOrderValue = completedCount > 0
    ? Math.round(totalEarnings / completedCount)
    : 0;

  // Calculate average response time (time from booking creation to confirmation)
  let totalResponseTime = 0;
  let responsiveBookings = 0;

  confirmedBookings.forEach(booking => {
    // Find the first status change to 'confirmed'
    // For now, we'll use updatedAt - createdAt as an approximation
    if (booking.status === 'confirmed' || booking.status === 'in_progress' || booking.status === 'completed') {
      const responseTime = new Date(booking.updatedAt) - new Date(booking.createdAt);
      totalResponseTime += responseTime;
      responsiveBookings++;
    }
  });

  const averageResponseTime = responsiveBookings > 0
    ? Math.round(totalResponseTime / responsiveBookings / (1000 * 60 * 60)) // Convert to hours
    : null;

  return {
    completedBookings: completedCount,
    responseRate,
    onTimeDeliveryRate,
    repeatClientRate,
    totalEarnings,
    averageOrderValue,
    responseTime: averageResponseTime
  };
}

/**
 * Update creator metrics in database
 * @param {string} creatorId - The creator's user ID
 * @returns {Promise<Object>} Updated user object
 */
async function updateCreatorMetrics(creatorId) {
  const metrics = await calculateCreatorMetrics(creatorId);

  const updatedUser = await User.findByIdAndUpdate(
    creatorId,
    {
      completedBookings: metrics.completedBookings,
      responseTime: metrics.responseTime,
      'metrics.responseRate': metrics.responseRate,
      'metrics.onTimeDeliveryRate': metrics.onTimeDeliveryRate,
      'metrics.repeatClientRate': metrics.repeatClientRate,
      'metrics.totalEarnings': metrics.totalEarnings,
      'metrics.averageOrderValue': metrics.averageOrderValue
    },
    { new: true }
  );

  return updatedUser;
}

/**
 * Batch update metrics for all creators
 * Useful for initial setup or periodic recalculation
 */
async function updateAllCreatorMetrics() {
  const creators = await User.find({ role: 'creator' });

  const results = {
    total: creators.length,
    updated: 0,
    failed: 0,
    errors: []
  };

  for (const creator of creators) {
    try {
      await updateCreatorMetrics(creator._id);
      results.updated++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        creatorId: creator._id,
        error: error.message
      });
    }
  }

  return results;
}

module.exports = {
  calculateCreatorMetrics,
  updateCreatorMetrics,
  updateAllCreatorMetrics
};
