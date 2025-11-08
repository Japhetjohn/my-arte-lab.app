const User = require('../models/User');
const { successResponse } = require('../utils/apiResponse');
const { ErrorHandler, catchAsync } = require('../utils/errorHandler');
const { uploadAvatar, uploadCover, uploadPortfolio } = require('../services/uploadService');

/**
 * @route   POST /api/upload/avatar
 * @desc    Upload user avatar
 * @access  Private
 */
exports.uploadAvatar = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new ErrorHandler('Please upload an image', 400));
  }

  // Upload to Cloudinary
  const result = await uploadAvatar(req.file.buffer);

  // Update user avatar
  const user = await User.findById(req.user._id);
  user.avatar = result.secure_url;
  await user.save({ validateBeforeSave: false });

  successResponse(res, 200, 'Avatar uploaded successfully', {
    avatar: result.secure_url,
    cloudinary: {
      publicId: result.public_id,
      url: result.secure_url
    }
  });
});

/**
 * @route   POST /api/upload/cover
 * @desc    Upload user cover image
 * @access  Private
 */
exports.uploadCover = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new ErrorHandler('Please upload an image', 400));
  }

  // Upload to Cloudinary
  const result = await uploadCover(req.file.buffer);

  // Update user cover
  const user = await User.findById(req.user._id);
  user.coverImage = result.secure_url;
  await user.save({ validateBeforeSave: false });

  successResponse(res, 200, 'Cover image uploaded successfully', {
    coverImage: result.secure_url,
    cloudinary: {
      publicId: result.public_id,
      url: result.secure_url
    }
  });
});

/**
 * @route   POST /api/upload/portfolio
 * @desc    Upload portfolio image
 * @access  Private (Creators only)
 */
exports.uploadPortfolio = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new ErrorHandler('Please upload an image', 400));
  }

  const user = await User.findById(req.user._id);

  if (user.role !== 'creator') {
    return next(new ErrorHandler('Only creators can upload portfolio images', 403));
  }

  // Upload to Cloudinary
  const result = await uploadPortfolio(req.file.buffer);

  // Add to user portfolio
  const portfolioItem = {
    title: req.body.title || 'Portfolio Image',
    description: req.body.description || '',
    image: result.secure_url,
    createdAt: new Date()
  };

  user.portfolio.push(portfolioItem);
  await user.save({ validateBeforeSave: false });

  successResponse(res, 200, 'Portfolio image uploaded successfully', {
    portfolio: user.portfolio,
    newItem: portfolioItem
  });
});

/**
 * @route   DELETE /api/upload/portfolio/:index
 * @desc    Delete portfolio image
 * @access  Private (Creators only)
 */
exports.deletePortfolioImage = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  if (user.role !== 'creator') {
    return next(new ErrorHandler('Only creators can delete portfolio images', 403));
  }

  const index = parseInt(req.params.index);

  if (index < 0 || index >= user.portfolio.length) {
    return next(new ErrorHandler('Invalid portfolio image index', 400));
  }

  // Remove from portfolio
  user.portfolio.splice(index, 1);
  await user.save({ validateBeforeSave: false });

  successResponse(res, 200, 'Portfolio image deleted successfully', {
    portfolio: user.portfolio
  });
});
