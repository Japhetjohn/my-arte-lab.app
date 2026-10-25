const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const { successResponse } = require('../utils/apiResponse');
const { ErrorHandler, catchAsync } = require('../utils/errorHandler');
const { isUserVerified } = require('../utils/verificationHelper');

/**
 * Get user notifications
 */
exports.getNotifications = catchAsync(async (req, res, next) => {
  const { read, limit = 50, skip = 0 } = req.query;

  const query = { recipient: req.user._id };

  if (read !== undefined) {
    query.read = read === 'true';
  }

  const rawNotifications = await Notification.find(query)
    .populate('sender', 'name firstName lastName avatar isVerified verificationSubscription email')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(parseInt(skip))
    .lean();

  const notifications = rawNotifications.map(n => {
    if (n.sender) {
      n.sender.isVerified = isUserVerified(n.sender);
    }
    return n;
  });

  const unreadCount = await Notification.getUnreadCount(req.user._id);

  successResponse(res, 200, 'Notifications retrieved successfully', {
    notifications,
    unreadCount
  });
});

/**
 * Get unread count
 */
exports.getUnreadCount = catchAsync(async (req, res, next) => {
  const unreadCount = await Notification.getUnreadCount(req.user._id);

  successResponse(res, 200, 'Unread count retrieved', { unreadCount });
});

/**
 * Mark notification as read
 */
exports.markAsRead = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler('Invalid notification ID', 400));
  }

  const notification = await Notification.findOne({
    _id: id,
    recipient: req.user._id
  });

  if (!notification) {
    return next(new ErrorHandler('Notification not found', 404));
  }

  await notification.markAsRead();

  successResponse(res, 200, 'Notification marked as read', { notification });
});

/**
 * Mark all notifications as read
 */
exports.markAllAsRead = catchAsync(async (req, res, next) => {
  await Notification.markAllAsRead(req.user._id);

  successResponse(res, 200, 'All notifications marked as read');
});

/**
 * Delete notification
 */
exports.deleteNotification = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Safeguard: If 'read', 'all', or 'clear' is passed, delegate to the proper handler
  if (id === 'read') {
    return exports.deleteAllRead(req, res, next);
  }
  if (id === 'all' || id === 'clear') {
    return exports.deleteAll(req, res, next);
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new ErrorHandler('Invalid notification ID', 400));
  }

  const notification = await Notification.findOneAndDelete({
    _id: id,
    recipient: req.user._id
  });

  if (!notification) {
    return next(new ErrorHandler('Notification not found', 404));
  }

  successResponse(res, 200, 'Notification deleted');
});

/**
 * Delete all read notifications
 */
exports.deleteAllRead = catchAsync(async (req, res, next) => {
  await Notification.deleteMany({
    recipient: req.user._id,
    read: true
  });

  successResponse(res, 200, 'All read notifications deleted');
});

/**
 * Delete all notifications (clear all)
 */
exports.deleteAll = catchAsync(async (req, res, next) => {
  await Notification.deleteMany({
    recipient: req.user._id
  });

  successResponse(res, 200, 'All notifications deleted');
});
