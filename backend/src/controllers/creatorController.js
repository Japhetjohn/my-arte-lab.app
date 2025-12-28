const User = require('../models/User');
const Review = require('../models/Review');
const { successResponse, paginatedResponse } = require('../utils/apiResponse');
const { ErrorHandler, catchAsync } = require('../utils/errorHandler');
const { escapeRegex } = require('../utils/sanitize');

exports.getAllCreators = catchAsync(async (req, res, next) => {
  const {
    category,
    search,
    minRating,
    location,
    sortBy = 'rating',
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
    default:
      sort = { 'rating.average': -1 };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const creators = await User.find(query)
    .select('-password -wallet.balance -wallet.pendingBalance')
    .sort(sort)
    .limit(parseInt(limit))
    .skip(skip)
    .lean();

  // Add name virtual field to each creator
  const creatorsWithName = creators.map(creator => ({
    ...creator,
    name: `${creator.firstName || ''} ${creator.lastName || ''}`.trim()
  }));

  const total = await User.countDocuments(query);

  paginatedResponse(res, 200, 'Creators retrieved successfully', creatorsWithName, {
    page: parseInt(page),
    limit: parseInt(limit),
    total
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
    .select('-password -wallet.balance -wallet.pendingBalance')
    .sort({ 'rating.average': -1, completedBookings: -1 })
    .limit(parseInt(limit))
    .lean();

  successResponse(res, 200, 'Featured creators retrieved successfully', { creators });
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
