const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const messagesController = require('../controllers/messagesController');

// All routes are protected
router.use(protect);

// Send a message
router.post('/', messagesController.sendMessage);

// Get unread count
router.get('/unread-count', messagesController.getUnreadCount);

// Get all conversations
router.get('/conversations', messagesController.getConversations);

// Get messages with specific user
router.get('/:userId', messagesController.getMessages);

// Mark messages as read
router.patch('/:userId/read', messagesController.markAsRead);

// Delete a message
router.delete('/:messageId', messagesController.deleteMessage);

module.exports = router;
