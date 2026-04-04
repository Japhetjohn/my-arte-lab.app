const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const blockController = require('../controllers/blockController');

// All routes are protected
router.use(protect);

// Get blocked users list
router.get('/', blockController.getBlockedUsers);

// Block a user
router.post('/:userId', blockController.blockUser);

// Unblock a user
router.delete('/:userId', blockController.unblockUser);

// Check block status
router.get('/:userId/status', blockController.checkBlockStatus);

module.exports = router;
