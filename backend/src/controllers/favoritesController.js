const User = require('../models/User');
const { ErrorHandler, catchAsync } = require('../utils/errorHandler');
const { successResponse } = require('../utils/apiResponse');

/**
 * Add creator to favorites
 */
exports.addToFavorites = catchAsync(async (req, res, next) => {
  const { creatorId } = req.params;

  // Check if creator exists
  const creator = await User.findById(creatorId);
  if (!creator || !creator.role || !creator.role.toLowerCase().includes('creator')) {
    return next(new ErrorHandler('Creator not found', 404));
  }

  // Check if already favorited
  const user = await User.findById(req.user._id);
  if (user.favoriteCreators.includes(creatorId)) {
    return next(new ErrorHandler('Creator already in favorites', 400));
  }

  // Add to favorites
  user.favoriteCreators.push(creatorId);
  await user.save();

  successResponse(res, 200, 'Creator added to favorites', {
    favoriteCreators: user.favoriteCreators
  });
});

/**
 * Remove creator from favorites
 */
exports.removeFromFavorites = catchAsync(async (req, res, next) => {
  const { creatorId } = req.params;

  const user = await User.findById(req.user._id);

  // Remove from favorites
  user.favoriteCreators = user.favoriteCreators.filter(
    id => id.toString() !== creatorId
  );
  await user.save();

  successResponse(res, 200, 'Creator removed from favorites', {
    favoriteCreators: user.favoriteCreators
  });
});

/**
 * Get user's favorite creators
 */
exports.getFavorites = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id)
    .populate({
      path: 'favoriteCreators',
      select: 'name email avatar bio category skills rating services metrics badges isVerified location'
    });

  successResponse(res, 200, 'Favorites retrieved successfully', {
    favorites: user.favoriteCreators
  });
});

/**
 * Check if creator is favorited
 */
exports.isFavorited = catchAsync(async (req, res, next) => {
  const { creatorId } = req.params;

  const user = await User.findById(req.user._id);
  const isFavorited = user.favoriteCreators.includes(creatorId);

  successResponse(res, 200, 'Favorite status retrieved', {
    isFavorited
  });
});
