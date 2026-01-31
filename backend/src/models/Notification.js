const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  type: {
    type: String,
    enum: [
      'booking_request',
      'booking_accepted',
      'booking_rejected',
      'booking_completed',
      'booking_cancelled',
      'payment_received',
      'payment_deducted',
      'payment_failed',
      'withdrawal_completed',
      'withdrawal_failed',
      'counter_proposal',
      'insufficient_balance',
      'message',
      'system',
      'work_delivered',
      // Project notifications
      'project_created',
      'project_application_received',
      'project_application_accepted',
      'project_application_rejected',
      'project_started',
      'project_completed',
      'project_cancelled'
    ],
    required: true
  },

  title: {
    type: String,
    required: true
  },

  message: {
    type: String,
    required: true
  },

  link: {
    type: String
  },

  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },

  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },

  metadata: {
    type: mongoose.Schema.Types.Mixed
  },

  read: {
    type: Boolean,
    default: false,
    index: true
  },

  readAt: {
    type: Date
  }
}, {
  timestamps: true
});

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

notificationSchema.methods.markAsRead = async function () {
  if (!this.read) {
    this.read = true;
    this.readAt = new Date();
    await this.save();
  }
  return this;
};

notificationSchema.statics.createNotification = async function (data) {
  try {
    const notification = await this.create(data);
    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
};

notificationSchema.statics.markAllAsRead = async function (userId) {
  return this.updateMany(
    { recipient: userId, read: false },
    { $set: { read: true, readAt: new Date() } }
  );
};

notificationSchema.statics.getUnreadCount = async function (userId) {
  return this.countDocuments({ recipient: userId, read: false });
};

module.exports = mongoose.model('Notification', notificationSchema);
