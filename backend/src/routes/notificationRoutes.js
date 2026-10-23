const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

router.use(protect);

router.get('/', notificationController.getNotifications);

router.get('/unread-count', notificationController.getUnreadCount);

router.patch('/mark-all-read', notificationController.markAllAsRead);
router.patch('/:id/read', notificationController.markAsRead);

// Bulk delete routes (must precede parameterized /:id)
router.delete('/read', notificationController.deleteAllRead);
router.delete('/read/all', notificationController.deleteAllRead);
router.delete('/all', notificationController.deleteAll);
router.delete('/clear', notificationController.deleteAll);

// Individual delete route
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
