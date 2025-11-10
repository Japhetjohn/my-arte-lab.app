const User = require('../models/User');
const Booking = require('../models/Booking');
const { successResponse } = require('../utils/apiResponse');

// Get platform statistics for homepage
exports.getPlatformStats = async (req, res, next) => {
  try {
    // Run all queries in parallel for better performance
    const [
      totalCreators,
      verifiedCreators,
      completedBookings,
      categoryCounts
    ] = await Promise.all([
      // Total creators
      User.countDocuments({ role: 'creator' }),

      // Verified creators
      User.countDocuments({ role: 'creator', isVerified: true }),

      // Completed bookings
      Booking.countDocuments({ status: 'completed' }),

      // Category counts
      User.aggregate([
        { $match: { role: 'creator' } },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ])
    ]);

    // Transform category counts into object
    const categories = {};
    categoryCounts.forEach(cat => {
      if (cat._id) {
        categories[cat._id] = cat.count;
      }
    });

    successResponse(res, 200, 'Platform statistics retrieved successfully', {
      totalCreators,
      verifiedCreators,
      completedBookings,
      categories
    });
  } catch (error) {
    next(error);
  }
};

// Get featured creators (top-rated or verified)
exports.getFeaturedCreators = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 8;

    // Get verified creators or top-rated creators
    const creators = await User.find({
      role: 'creator',
      $or: [
        { isVerified: true },
        { 'rating.average': { $gte: 4.5 } }
      ]
    })
      .select('-password -wallet.balance -wallet.pendingBalance')
      .sort({ isVerified: -1, 'rating.average': -1, createdAt: -1 })
      .limit(limit)
      .lean();

    // Transform to match frontend format
    const featuredCreators = creators.map(creator => {
      // Format location
      let locationStr = 'Nigeria';
      if (creator.location) {
        if (creator.location.city && creator.location.country) {
          locationStr = `${creator.location.city}, ${creator.location.country}`;
        } else if (creator.location.city) {
          locationStr = creator.location.city;
        } else if (creator.location.country) {
          locationStr = creator.location.country;
        }
      }

      return {
        id: creator._id.toString(),
        name: creator.name || 'Unknown Creator',
        // Always use default avatar with initials for consistency
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(creator.name || 'User')}&background=9747FF&color=fff&bold=true`,
        role: creator.category ? creator.category.charAt(0).toUpperCase() + creator.category.slice(1) : 'Creator',
        location: locationStr,
        rating: creator.rating?.average?.toFixed(1) || '0.0',
        reviewCount: creator.rating?.count || 0,
        verified: creator.isVerified || false,
        price: creator.hourlyRate ? `From $${creator.hourlyRate}/hr` : 'Contact for pricing',
        bio: creator.bio || 'No bio yet',
        cover: creator.coverImage,
        portfolio: creator.portfolio || [],
        services: creator.services || [],
        responseTime: creator.responseTime || 'Within a day',
        completedJobs: creator.completedJobs || 0
      };
    });

    successResponse(res, 200, 'Featured creators retrieved successfully', featuredCreators);
  } catch (error) {
    next(error);
  }
};
