const User = require('../models/User');
const { ErrorHandler, catchAsync } = require('../utils/errorHandler');
const { successResponse } = require('../utils/apiResponse');
const { isUserVerified, isFounder } = require('../utils/verificationHelper');
const { isSelfAction } = require('../utils/ownershipHelper');

/**
 * Add creator to favorites
 */
exports.addToFavorites = catchAsync(async (req, res, next) => {
  const { creatorId } = req.params;

  if (isSelfAction(req.user._id, creatorId)) {
    return next(new ErrorHandler('You cannot add yourself to favorite creators', 400));
  }

  const creator = await User.findById(creatorId);
  if (!creator || !creator.role || !creator.role.toLowerCase().includes('creator')) {
    return next(new ErrorHandler('Creator not found', 404));
  }

  const user = await User.findById(req.user._id);
  if (user.favoriteCreators.includes(creatorId)) {
    return next(new ErrorHandler('Creator already in favorites', 400));
  }

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
      select: 'name email avatar bio category skills rating services metrics badges isVerified isFounder verificationSubscription location'
    });

  const formattedFavorites = (user?.favoriteCreators || []).map(c => {
    const cObj = c.toObject ? c.toObject() : { ...c };
    cObj.isVerified = isUserVerified(cObj);
    cObj.isFounder = isFounder(cObj);
    return cObj;
  });

  successResponse(res, 200, 'Favorites retrieved successfully', {
    favorites: formattedFavorites
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
