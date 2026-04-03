const User = require('../models/User');
const Review = require('../models/Review');
const { successResponse, paginatedResponse } = require('../utils/apiResponse');
const { ErrorHandler, catchAsync } = require('../utils/errorHandler');
const { escapeRegex } = require('../utils/sanitize');
const recommendationEngine = require('../services/recommendationEngine');

exports.getAllCreators = catchAsync(async (req, res, next) => {
  const {
    category,
    search,
    minRating,
    location,
    sortBy = 'trending', // Default to trending (activity-based)
    page = 1,
    limit = 12
  } = req.query;

  const query = { role: 'creator', isActive: true };

  if (category && category !== 'all') {
    query.category = category;
  }

  if (search) {
    const escapedSearch = escapeRegex(search);
    query.$or = [
      { firstName: { $regex: escapedSearch, $options: 'i' } },
      { lastName: { $regex: escapedSearch, $options: 'i' } },
      { bio: { $regex: escapedSearch, $options: 'i' } },
      { skills: { $in: [new RegExp(escapedSearch, 'i')] } }
    ];
  }

  if (minRating) {
    const rating = parseFloat(minRating);
    if (!isNaN(rating) && rating >= 0 && rating <= 5) {
      query['rating.average'] = { $gte: rating };
    }
  }

  if (location) {
    const escapedLocation = escapeRegex(location);
    query['location.country'] = { $regex: escapedLocation, $options: 'i' };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Fetch all matching creators first (for activity-based sorting)
  let creators = await User.find(query)
    .select('-password -encryptedPrivateKey -twoFactorSecret -twoFactorBackupCodes -emailVerificationToken -passwordResetToken -loginAttempts -lockUntil -wallet.tsaraMnemonic -wallet.tsaraEncryptedPrivateKey')
    .lean();

  // Apply sorting based on sortBy parameter
  if (sortBy === 'trending') {
    // Use recommendation engine for activity-based sorting
    const sorted = await recommendationEngine.getCreatorsByActivity(creators, { limit: creators.length });
    creators = sorted.map(s => s.creator);
  } else {
    // Apply traditional sorting
    let sort = {};
    switch (sortBy) {
      case 'rating':
        sort = { 'rating.average': -1, 'rating.count': -1 };
        break;
      case 'newest':
        sort = { createdAt: -1 };
        break;
      case 'popular':
        sort = { completedBookings: -1 };
        break;
      case 'active':
        sort = { lastActive: -1 };
        break;
      default:
        sort = { 'rating.average': -1 };
    }
    
    // Sort creators array
    creators = creators.sort((a, b) => {
      if (sortBy === 'rating') {
        const aRating = a.rating?.average || 0;
        const bRating = b.rating?.average || 0;
        if (bRating !== aRating) return bRating - aRating;
        return (b.rating?.count || 0) - (a.rating?.count || 0);
      }
      if (sortBy === 'newest') {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      if (sortBy === 'popular') {
        return (b.completedBookings || 0) - (a.completedBookings || 0);
      }
      if (sortBy === 'active') {
        return new Date(b.lastActive || 0) - new Date(a.lastActive || 0);
      }
      return 0;
    });
  }

  // Apply pagination
  const total = creators.length;
  const paginatedCreators = creators.slice(skip, skip + parseInt(limit));

  // Add name virtual field and profile completeness score to each creator
  const creatorsWithMeta = paginatedCreators.map(creator => {
    const profileScore = recommendationEngine.calculateProfileCompleteness(creator);
    const activityScore = recommendationEngine.calculateActivityScore(creator.lastActive);
    
    return {
      ...creator,
      id: creator._id.toString(),
      name: `${creator.firstName || ''} ${creator.lastName || ''}`.trim(),
      _profileScore: Math.round(profileScore * 100),
      _activityScore: Math.round(activityScore * 100)
    };
  });

  paginatedResponse(res, 200, 'Creators retrieved successfully', creatorsWithMeta, {
    page: parseInt(page),
    limit: parseInt(limit),
    total
  });
});

/**
 * Get personalized creator recommendations
 * Uses TensorFlow.js algorithm behind the scenes
 */
exports.getRecommendedCreators = catchAsync(async (req, res, next) => {
  const { limit = 20 } = req.query;
  const userId = req.user?._id;

  if (!userId) {
    // Return top rated if not logged in
    const creators = await User.find({ role: 'creator', isActive: true })
      .select('-password -wallet.tsaraMnemonic -wallet.tsaraEncryptedPrivateKey')
      .sort({ 'rating.average': -1 })
      .limit(parseInt(limit))
      .lean();

    return successResponse(res, 200, 'Creators retrieved', {
      creators: creators.map(c => ({
        ...c,
        id: c._id.toString(),
        name: `${c.firstName || ''} ${c.lastName || ''}`.trim()
      }))
    });
  }

  // Get current user
  const user = await User.findById(userId).lean();
  if (!user) {
    return next(new ErrorHandler('User not found', 404));
  }

  // Fetch all active creators
  const allCreators = await User.find({
    role: 'creator',
    isActive: true,
    _id: { $ne: userId }
  })
    .select('-password -wallet.tsaraMnemonic -wallet.tsaraEncryptedPrivateKey')
    .lean();

  // Apply TensorFlow recommendation algorithm
  const recommendations = await recommendationEngine.getRecommendations(
    user,
    allCreators,
    { limit: parseInt(limit) }
  );

  // Format response
  const creators = recommendations.map(({ creator, totalScore, distance }) => ({
    ...creator,
    id: creator._id.toString(),
    name: `${creator.firstName || ''} ${creator.lastName || ''}`.trim(),
    // Include distance for info (but don't show in UI)
    _distance: distance ? Math.round(distance) : null,
    _matchScore: Math.round(totalScore * 100)
  }));

  successResponse(res, 200, 'Recommended creators retrieved', { creators });
});

/**
 * Get trending creators based on weekly activity
 * Prioritizes: Active creators > Complete profiles > High ratings
 */
exports.getTrendingCreators = catchAsync(async (req, res, next) => {
  const { limit = 10 } = req.query;

  // Fetch all active creators
  const allCreators = await User.find({
    role: 'creator',
    isActive: true
  })
    .select('-password -wallet.tsaraMnemonic -wallet.tsaraEncryptedPrivateKey')
    .lean();

  // Get trending with new algorithm
  const trending = await recommendationEngine.getTrendingCreators(
    allCreators,
    new Map(), // Activity data from tracking service (optional)
    { 
      limit: parseInt(limit),
      minProfileCompleteness: 0.25 // At least 25% profile complete
    }
  );

  const creators = trending.map(({ creator, trendScore, activityScore, profileScore }) => ({
    ...creator,
    id: creator._id.toString(),
    name: `${creator.firstName || ''} ${creator.lastName || ''}`.trim(),
    _trendScore: Math.round(trendScore),
    _activityScore: Math.round(activityScore * 100),
    _profileScore: Math.round(profileScore * 100)
  }));

  successResponse(res, 200, 'Trending creators retrieved', { 
    creators,
    total: creators.length,
    message: creators.length === 0 ? 
      'No trending creators found. Creators need to be active and have at least 25% profile completion.' : 
      undefined
  });
});

exports.getCreatorProfile = catchAsync(async (req, res, next) => {
  const creator = await User.findOne({
    _id: req.params.id,
    role: 'creator',
    isActive: true
  }).select('-password');

  if (!creator) {
    return next(new ErrorHandler('Creator not found', 404));
  }

  const reviews = await Review.find({
    creator: creator._id,
    isPublished: true
  })
    .populate('reviewer', 'name avatar')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  successResponse(res, 200, 'Creator profile retrieved successfully', {
    creator: creator.getPublicProfile(),
    reviews
  });
});

exports.getFeaturedCreators = catchAsync(async (req, res, next) => {
  const { limit = 6 } = req.query;

  const creators = await User.find({
    role: 'creator',
    isActive: true,
    isVerified: true,
    'rating.average': { $gte: 4.5 },
    completedBookings: { $gte: 5 }
  })
    .select('-password -encryptedPrivateKey -twoFactorSecret -twoFactorBackupCodes -emailVerificationToken -passwordResetToken -loginAttempts -lockUntil -wallet.tsaraMnemonic -wallet.tsaraEncryptedPrivateKey')
    .sort({ 'rating.average': -1, completedBookings: -1 })
    .limit(parseInt(limit))
    .lean();

  // Add name virtual field and id to each creator
  const creatorsWithName = creators.map(creator => ({
    ...creator,
    id: creator._id.toString(),
    name: `${creator.firstName || ''} ${creator.lastName || ''}`.trim()
  }));

  successResponse(res, 200, 'Featured creators retrieved successfully', { creators: creatorsWithName });
});

exports.getCreatorStats = catchAsync(async (req, res, next) => {
  const stats = await User.aggregate([
    { $match: { role: 'creator', isActive: true } },
    {
      $group: {
        _id: null,
        totalCreators: { $sum: 1 },
        avgRating: { $avg: '$rating.average' },
        totalCompletedBookings: { $sum: '$completedBookings' }
      }
    }
  ]);

  const categoryStats = await User.aggregate([
    { $match: { role: 'creator', isActive: true } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 }
      }
    }
  ]);

  successResponse(res, 200, 'Creator statistics retrieved successfully', {
    overall: stats[0] || { totalCreators: 0, avgRating: 0, totalCompletedBookings: 0 },
    byCategory: categoryStats
  });
});

/**
 * Update creator availability status
 * POST /api/creators/availability
 */
exports.updateAvailability = catchAsync(async (req, res, next) => {
  const { availability } = req.body;
  const userId = req.user._id;

  // Validate availability value
  const validStatuses = ['available', 'busy', 'unavailable'];
  if (!validStatuses.includes(availability)) {
    return next(new ErrorHandler('Invalid availability status. Must be: available, busy, or unavailable', 400));
  }

  // Update user availability
  const user = await User.findByIdAndUpdate(
    userId,
    { availability },
    { new: true, runValidators: true }
  );

  if (!user) {
    return next(new ErrorHandler('User not found', 404));
  }

  successResponse(res, 200, 'Availability updated successfully', {
    availability: user.availability
  });
});

/**
 * Get creator availability status
 * GET /api/creators/:id/availability
 */
exports.getAvailability = catchAsync(async (req, res, next) => {
  const creatorId = req.params.id;

  const creator = await User.findById(creatorId)
    .select('availability firstName lastName')
    .lean();

  if (!creator) {
    return next(new ErrorHandler('Creator not found', 404));
  }

  successResponse(res, 200, 'Availability retrieved', {
    availability: creator.availability || 'available',
    lastUpdated: creator.updatedAt
  });
});
