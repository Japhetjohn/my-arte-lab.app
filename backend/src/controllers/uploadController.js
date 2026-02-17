const User = require('../models/User');
const { successResponse } = require('../utils/apiResponse');
const { ErrorHandler, catchAsync } = require('../utils/errorHandler');
const { uploadAvatar, uploadCover, uploadPortfolio } = require('../services/uploadService');

exports.uploadAvatar = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new ErrorHandler('Please upload an image', 400));
  }

  const result = await uploadAvatar(req.file.buffer, req.file.originalname);

  const user = await User.findById(req.user._id);
  user.avatar = result.secure_url;
  await user.save({ validateBeforeSave: false });

  successResponse(res, 200, 'Avatar uploaded successfully', {
    avatar: result.secure_url,
    publicId: result.public_id,
    url: result.secure_url
  });
});

exports.uploadCover = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new ErrorHandler('Please upload an image', 400));
  }

  const result = await uploadCover(req.file.buffer, req.file.originalname);

  const user = await User.findById(req.user._id);
  user.coverImage = result.secure_url;
  await user.save({ validateBeforeSave: false });

  successResponse(res, 200, 'Cover image uploaded successfully', {
    coverImage: result.secure_url,
    publicId: result.public_id,
    url: result.secure_url
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

  const result = await uploadPortfolio(req.file.buffer, req.file.originalname);

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

  const index = parseInt(req.params.index, 10);

  if (isNaN(index) || index < 0 || index >= user.portfolio.length) {
    return next(new ErrorHandler('Invalid portfolio image index', 400));
  }

  user.portfolio.splice(index, 1);
  await user.save({ validateBeforeSave: false });

  successResponse(res, 200, 'Portfolio image deleted successfully', {
    portfolio: user.portfolio
  });
});

exports.uploadBookingAttachment = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new ErrorHandler('Please upload a file', 400));
  }

  // Reuse the portfolio upload function (it's generic for images/files)
  const result = await uploadPortfolio(req.file.buffer, req.file.originalname);

  successResponse(res, 200, 'File uploaded successfully', {
    url: result.secure_url,
    publicId: result.public_id
  });
});
