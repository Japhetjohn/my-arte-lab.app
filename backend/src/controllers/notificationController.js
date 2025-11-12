const Notification = require('../models/Notification');
const { successResponse } = require('../utils/apiResponse');
const { ErrorHandler, catchAsync } = require('../utils/errorHandler');

/**
 * Get user notifications
 */
exports.getNotifications = catchAsync(async (req, res, next) => {
  const { read, limit = 50, skip = 0 } = req.query;

  const query = { recipient: req.user._id };

  if (read !== undefined) {
    query.read = read === 'true';
  }

  const notifications = await Notification.find(query)
    .populate('sender', 'name avatar')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(parseInt(skip));

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
  const notification = await Notification.findOne({
    _id: req.params.id,
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
  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
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
