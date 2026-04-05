const Message = require('../models/Message');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { successResponse, errorResponse } = require('../utils/apiResponse');

/**
 * Send a message to another user
 * POST /api/messages
 */
exports.sendMessage = async (req, res) => {
  try {
    const { recipientId, content } = req.body;
    const senderId = req.user.id;

    // Validate input
    if (!recipientId || !content?.trim()) {
      return errorResponse(res, 'Recipient ID and message content are required', 400);
    }

    if (content.trim().length > 2000) {
      return errorResponse(res, 'Message too long. Maximum 2000 characters', 400);
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId).select('name avatar blockedUsers');
    if (!recipient) {
      return errorResponse(res, 'Recipient not found', 404);
    }

    // Prevent messaging yourself
    if (recipientId === senderId) {
      return errorResponse(res, 'You cannot message yourself', 400);
    }

    // Check if sender has blocked recipient
    const senderWithBlocks = await User.findById(senderId).select('blockedUsers name firstName lastName');
    if (senderWithBlocks.blockedUsers.includes(recipientId)) {
      return errorResponse(res, 'You have blocked this user. Unblock them to send messages.', 403);
    }

    // Check if recipient has blocked sender
    if (recipient.blockedUsers.includes(senderId)) {
      return errorResponse(res, 'You cannot message this user.', 403);
    }

    // Create message
    const message = new Message({
      senderId,
      recipientId,
      content: content.trim()
    });

    await message.save();

    // Create notification for recipient
    const senderName = senderWithBlocks.firstName || senderWithBlocks.name || 'Someone';
    Notification.createNotification({
      recipient: recipientId,
      type: 'message',
      title: 'New Message',
      message: `${senderName} sent you a message`,
      link: `/messages/${senderId}`,
      sender: senderId
    }).catch(err => console.error('Message notification failed:', err));

    // Populate sender info for response
    await message.populate('senderId', 'name avatar');
    await message.populate('recipientId', 'name avatar');

    return successResponse(res, 201, 'Message sent successfully', { message });

  } catch (error) {
    console.error('Error sending message:', error);
    return errorResponse(res, 'Failed to send message', 500);
  }
};

/**
 * Get messages between current user and another user
 * GET /api/messages/:userId
 */
exports.getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    // Get conversation
    const messages = await Message.getConversation(currentUserId, userId, { page, limit });

    // Mark messages as read
    await Message.markAsRead(currentUserId, userId);

    return successResponse(res, 200, 'Messages retrieved', {
      messages,
      pagination: {
        page,
        limit,
        hasMore: messages.length === limit
      }
    });

  } catch (error) {
    console.error('Error getting messages:', error);
    return errorResponse(res, 'Failed to get messages', 500);
  }
};

/**
 * Get all conversations for current user
 * GET /api/messages/conversations
 */
exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), 10000)
    );
    
    const conversationsPromise = Message.getConversations(userId);
    
    const conversations = await Promise.race([conversationsPromise, timeoutPromise]);

    return successResponse(res, 200, 'Conversations retrieved', {
      conversations: conversations || [],
      count: (conversations || []).length
    });

  } catch (error) {
    console.error('Error getting conversations:', error);
    return successResponse(res, {
      conversations: [],
      count: 0
    });
  }
};

/**
 * Mark messages from a user as read
 * PATCH /api/messages/:userId/read
 */
exports.markAsRead = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const count = await Message.markAsRead(currentUserId, userId);

    return successResponse(res, 200, 'Messages marked as read', { count });

  } catch (error) {
    console.error('Error marking messages as read:', error);
    return errorResponse(res, 'Failed to mark messages as read', 500);
  }
};

/**
 * Get unread message count
 * GET /api/messages/unread-count
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const count = await Message.getUnreadCount(userId);

    return successResponse(res, 200, 'Unread count retrieved', { count });

  } catch (error) {
    console.error('Error getting unread count:', error);
    return errorResponse(res, 'Failed to get unread count', 500);
  }
};

/**
 * Delete a message (only sender can delete their own message)
 * DELETE /api/messages/:messageId
 */
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(messageId);

    if (!message) {
      return errorResponse(res, 'Message not found', 404);
    }

    // Only sender can delete
    if (message.senderId.toString() !== userId) {
      return errorResponse(res, 'You can only delete your own messages', 403);
    }

    await Message.findByIdAndDelete(messageId);

    return successResponse(res, 200, 'Message deleted successfully');

  } catch (error) {
    console.error('Error deleting message:', error);
    return errorResponse(res, 'Failed to delete message', 500);
  }
};
