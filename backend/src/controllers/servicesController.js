const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { ErrorHandler, catchAsync } = require('../utils/errorHandler');
const { uploadServiceImage } = require('../services/uploadService');

/**
 * Get all services for the authenticated user
 */
exports.getMyServices = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  if (user.role !== 'creator') {
    return next(new ErrorHandler('Only creators can have services', 403));
  }

  successResponse(res, 200, 'Services retrieved successfully', {
    services: user.services || []
  });
});

/**
 * Add a new service
 */
exports.addService = catchAsync(async (req, res, next) => {
  const { title, description, directLink } = req.body;

  const user = await User.findById(req.user._id);

  if (user.role !== 'creator') {
    return next(new ErrorHandler('Only creators can add services', 403));
  }

  if (!title || !description) {
    return next(new ErrorHandler('Title and description are required', 400));
  }

  const newService = {
    title: title.trim(),
    description: description.trim(),
    images: [],
    directLink: directLink ? directLink.trim() : undefined,
    createdAt: new Date()
  };

  user.services.push(newService);
  await user.save({ validateBeforeSave: false });

  successResponse(res, 201, 'Service added successfully', {
    service: user.services[user.services.length - 1],
    services: user.services
  });
});

/**
 * Update an existing service
 */
exports.updateService = catchAsync(async (req, res, next) => {
  const { serviceId } = req.params;
  const { title, description, directLink } = req.body;

  const user = await User.findById(req.user._id);

  if (user.role !== 'creator') {
    return next(new ErrorHandler('Only creators can update services', 403));
  }

  const service = user.services.id(serviceId);
  if (!service) {
    return next(new ErrorHandler('Service not found', 404));
  }

  if (title) service.title = title.trim();
  if (description) service.description = description.trim();
  if (directLink !== undefined) {
    service.directLink = directLink ? directLink.trim() : undefined;
  }

  await user.save({ validateBeforeSave: false });

  successResponse(res, 200, 'Service updated successfully', {
    service,
    services: user.services
  });
});

/**
 * Delete a service
 */
exports.deleteService = catchAsync(async (req, res, next) => {
  const { serviceId } = req.params;

  const user = await User.findById(req.user._id);

  if (user.role !== 'creator') {
    return next(new ErrorHandler('Only creators can delete services', 403));
  }

  const service = user.services.id(serviceId);
  if (!service) {
    return next(new ErrorHandler('Service not found', 404));
  }

  user.services.pull(serviceId);
  await user.save({ validateBeforeSave: false });

  successResponse(res, 200, 'Service deleted successfully', {
    services: user.services
  });
});

/**
 * Upload service image
 */
exports.uploadServiceImage = catchAsync(async (req, res, next) => {
  const { serviceId } = req.params;

  if (!req.file) {
    return next(new ErrorHandler('Please upload an image', 400));
  }

  const user = await User.findById(req.user._id);

  if (user.role !== 'creator') {
    return next(new ErrorHandler('Only creators can upload service images', 403));
  }

  const service = user.services.id(serviceId);
  if (!service) {
    return next(new ErrorHandler('Service not found', 404));
  }

  if (service.images.length >= 5) {
    return next(new ErrorHandler('Maximum 5 images allowed per service', 400));
  }

  const result = await uploadServiceImage(req.file.buffer);

  service.images.push(result.secure_url);
  await user.save({ validateBeforeSave: false });

  successResponse(res, 200, 'Service image uploaded successfully', {
    service,
    imageUrl: result.secure_url
  });
});

/**
 * Delete service image
 */
exports.deleteServiceImage = catchAsync(async (req, res, next) => {
  const { serviceId, imageIndex } = req.params;

  const user = await User.findById(req.user._id);

  if (user.role !== 'creator') {
    return next(new ErrorHandler('Only creators can delete service images', 403));
  }

  const service = user.services.id(serviceId);
  if (!service) {
    return next(new ErrorHandler('Service not found', 404));
  }

  const index = parseInt(imageIndex, 10);
  if (isNaN(index) || index < 0 || index >= service.images.length) {
    return next(new ErrorHandler('Invalid image index', 400));
  }

  service.images.splice(index, 1);
  await user.save({ validateBeforeSave: false });

  successResponse(res, 200, 'Service image deleted successfully', {
    service
  });
});
