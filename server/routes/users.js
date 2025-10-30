const express = require('express');
const router = express.Router();
const {
  updateProfile,
  getCreatorById,
  getCreators,
  getWallet,
  withdrawFunds,
  submitQuestionnaire
} = require('../controllers/userController');
const { protect, creatorOnly } = require('../middleware/auth');

// Public routes
router.get('/creators', getCreators);
router.get('/creator/:id', getCreatorById);

// Protected routes
router.put('/profile', protect, updateProfile);
router.post('/questionnaire', protect, submitQuestionnaire);
router.get('/wallet', protect, getWallet);
router.post('/wallet/withdraw', protect, creatorOnly, withdrawFunds);

module.exports = router;
