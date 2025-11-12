const User = require('../models/User');
const { successResponse } = require('../utils/apiResponse');
const { ErrorHandler, catchAsync } = require('../utils/errorHandler');
const { uploadAvatar, uploadCover, uploadPortfolio } = require('../services/uploadService');

exports.uploadAvatar = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new ErrorHandler('Please upload an image', 400));
  }

  const result = await uploadAvatar(req.file.buffer);

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

exports.uploadCover = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new ErrorHandler('Please upload an image', 400));
  }

  const result = await uploadCover(req.file.buffer);

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

exports.uploadPortfolio = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new ErrorHandler('Please upload an image', 400));
  }

  const user = await User.findById(req.user._id);

  if (user.role !== 'creator') {
    return next(new ErrorHandler('Only creators can upload portfolio images', 403));
  }

  // Check if user already has max portfolio items
  if (user.portfolio && user.portfolio.length >= 5) {
    return next(new ErrorHandler('Maximum of 5 portfolio items allowed. Please delete an existing item to upload a new one.', 400));
  }

  const result = await uploadPortfolio(req.file.buffer);

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

exports.deletePortfolioImage = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  if (user.role !== 'creator') {
    return next(new ErrorHandler('Only creators can delete portfolio images', 403));
  }

  const index = parseInt(req.params.index);

  if (index < 0 || index >= user.portfolio.length) {
    return next(new ErrorHandler('Invalid portfolio image index', 400));
  }

  user.portfolio.splice(index, 1);
  await user.save({ validateBeforeSave: false });

  successResponse(res, 200, 'Portfolio image deleted successfully', {
    portfolio: user.portfolio
  });
});
