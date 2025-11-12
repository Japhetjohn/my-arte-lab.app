const User = require('../models/User');
const Review = require('../models/Review');
const { successResponse, paginatedResponse } = require('../utils/apiResponse');
const { ErrorHandler, catchAsync } = require('../utils/errorHandler');

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

  const orConditions = [];

  if (search) {
    orConditions.push(
      { name: { $regex: search, $options: 'i' } },
      { bio: { $regex: search, $options: 'i' } },
      { skills: { $in: [new RegExp(search, 'i')] } }
    );
  }

  if (location) {
    orConditions.push(
      { 'location.localArea': { $regex: location, $options: 'i' } },
      { 'location.city': { $regex: location, $options: 'i' } },
      { 'location.state': { $regex: location, $options: 'i' } },
      { 'location.country': { $regex: location, $options: 'i' } },
      { 'location.fullAddress': { $regex: location, $options: 'i' } }
    );
  }

  if (orConditions.length > 0) {
    query.$or = orConditions;
  }

  if (minRating) {
    query['rating.average'] = { $gte: parseFloat(minRating) };
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

  const total = await User.countDocuments(query);

  paginatedResponse(res, 200, 'Creators retrieved successfully', creators, {
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
