const Notification = require('../models/Notification');

/**
 * Notification Service
 * Handles creating and managing user notifications
 */

/**
 * Create a new notification
 * @param {Object} data - Notification data
 * @param {ObjectId} data.user - User ID (recipient)
 * @param {String} data.type - Notification type
 * @param {String} data.title - Notification title
 * @param {String} data.message - Notification message
 * @param {ObjectId} data.relatedId - Related entity ID (booking, transaction, etc.)
 * @param {String} data.relatedModel - Related model name
 * @param {String} data.link - Optional link
 * @returns {Promise<Object>} Created notification
 */
async function createNotification(data) {
  try {
    const notificationData = {
      recipient: data.user || data.recipient,
      sender: data.sender,
      type: data.type,
      title: data.title,
      message: data.message,
      link: data.link
    };

    if (data.relatedModel === 'Booking' || data.booking) {
      notificationData.booking = data.relatedId || data.booking;
    }

    if (data.relatedId && data.relatedModel !== 'Booking') {
      notificationData.metadata = {
        relatedId: data.relatedId,
        relatedModel: data.relatedModel
      };
    }

    const notification = await Notification.create(notificationData);
    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
}

/**
 * Get notifications for a user
 * @param {ObjectId} userId - User ID
 * @param {Number} limit - Number of notifications to return
 * @param {Number} skip - Number of notifications to skip
 * @returns {Promise<Array>} List of notifications
 */
async function getUserNotifications(userId, limit = 20, skip = 0) {
  try {
    const notifications = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate('sender', 'name avatar')
      .populate('booking', 'bookingId serviceTitle')
      .lean();

    return notifications;
  } catch (error) {
    console.error('Failed to get user notifications:', error);
    return [];
  }
}

/**
 * Mark notification as read
 * @param {ObjectId} notificationId - Notification ID
 * @param {ObjectId} userId - User ID (for verification)
 * @returns {Promise<Object>} Updated notification
 */
async function markAsRead(notificationId, userId) {
  try {
    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: userId
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return await notification.markAsRead();
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read for a user
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Object>} Update result
 */
async function markAllAsRead(userId) {
  try {
    return await Notification.markAllAsRead(userId);
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    throw error;
  }
}

/**
 * Get unread notification count for a user
 * @param {ObjectId} userId - User ID
 * @returns {Promise<Number>} Unread count
 */
async function getUnreadCount(userId) {
  try {
    return await Notification.getUnreadCount(userId);
  } catch (error) {
    console.error('Failed to get unread count:', error);
    return 0;
  }
}

/**
 * Delete a notification
 * @param {ObjectId} notificationId - Notification ID
 * @param {ObjectId} userId - User ID (for verification)
 * @returns {Promise<Boolean>} Success status
 */
async function deleteNotification(notificationId, userId) {
  try {
    const result = await Notification.deleteOne({
      _id: notificationId,
      recipient: userId
    });

    return result.deletedCount > 0;
  } catch (error) {
    console.error('Failed to delete notification:', error);
    return false;
  }
}

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification
};
