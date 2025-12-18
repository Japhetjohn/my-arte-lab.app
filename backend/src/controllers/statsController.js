const User = require('../models/User');
const Booking = require('../models/Booking');
const { successResponse } = require('../utils/apiResponse');

exports.getPlatformStats = async (req, res, next) => {
  try {
    const [
      totalCreators,
      verifiedCreators,
      completedBookings,
      categoryCounts
    ] = await Promise.all([
      User.countDocuments({ role: 'creator' }),

      User.countDocuments({ role: 'creator', isVerified: true }),

      Booking.countDocuments({ status: 'completed' }),

      User.aggregate([
        { $match: { role: 'creator' } },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ])
    ]);

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

exports.getFeaturedCreators = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 8;

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

    const featuredCreators = creators.map(creator => {
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
