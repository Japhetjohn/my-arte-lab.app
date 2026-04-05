const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000,
    trim: true
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
messageSchema.index({ senderId: 1, recipientId: 1, createdAt: -1 });
messageSchema.index({ recipientId: 1, read: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ recipientId: 1, createdAt: -1 });
messageSchema.index({ createdAt: -1 });

// Static method to get conversation between two users
messageSchema.statics.getConversation = async function(userId1, userId2, options = {}) {
  const { page = 1, limit = 50 } = options;
  const skip = (page - 1) * limit;

  const messages = await this.find({
    $or: [
      { senderId: userId1, recipientId: userId2 },
      { senderId: userId2, recipientId: userId1 }
    ]
  })
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit)
  .populate('senderId', 'name avatar')
  .populate('recipientId', 'name avatar')
  .lean();

  // Reverse to show oldest first
  messages.reverse();

  return messages;
};

// Static method to get all conversations for a user
messageSchema.statics.getConversations = async function(userId) {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  
  // Find all messages where user is sender or recipient
  const messages = await this.find({
    $or: [
      { senderId: userObjectId },
      { recipientId: userObjectId }
    ]
  })
  .sort({ createdAt: -1 })
  .limit(1000)
  .lean();

  // Group by conversation partner
  const conversationMap = new Map();
  
  for (const msg of messages) {
    const otherUserId = msg.senderId.toString() === userId 
      ? msg.recipientId.toString() 
      : msg.senderId.toString();
    
    if (!conversationMap.has(otherUserId)) {
      conversationMap.set(otherUserId, {
        _id: otherUserId,
        lastMessage: msg,
        unreadCount: 0
      });
    }
    
    // Count unread messages
    if (msg.recipientId.toString() === userId && !msg.read) {
      conversationMap.get(otherUserId).unreadCount++;
    }
  }
  
  // Get unique user IDs
  const userIds = Array.from(conversationMap.keys()).map(id => new mongoose.Types.ObjectId(id));
  
  // Fetch user details
  const users = await mongoose.model('User').find({
    _id: { $in: userIds }
  }).select('_id name firstName lastName avatar').lean();
  
  // Build final conversations array
  const conversations = [];
  for (const [userId, conv] of conversationMap) {
    const user = users.find(u => u._id.toString() === userId);
    if (user) {
      conversations.push({
        _id: userId,
        otherUser: {
          _id: userId,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar
        },
        lastMessage: {
          content: conv.lastMessage.content,
          createdAt: conv.lastMessage.createdAt,
          senderId: conv.lastMessage.senderId
        },
        unreadCount: conv.unreadCount
      });
    }
  }
  
  // Sort by last message date
  conversations.sort((a, b) => 
    new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
  );

  return conversations;
};

// Static method to mark messages as read
messageSchema.statics.markAsRead = async function(recipientId, senderId) {
  const result = await this.updateMany(
    {
      recipientId: new mongoose.Types.ObjectId(recipientId),
      senderId: new mongoose.Types.ObjectId(senderId),
      read: false
    },
    {
      $set: { read: true, readAt: new Date() }
    }
  );

  return result.modifiedCount;
};

// Static method to get unread count
messageSchema.statics.getUnreadCount = async function(userId) {
  return await this.countDocuments({
    recipientId: new mongoose.Types.ObjectId(userId),
    read: false
  });
};

module.exports = mongoose.model('Message', messageSchema);
