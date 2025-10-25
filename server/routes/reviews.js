const express = require('express');
const router = express.Router();
const {
  createReview,
  getCreatorReviews,
  getReviewById,
  respondToReview
} = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

// Public routes
router.get('/creator/:creatorId', getCreatorReviews);
router.get('/:id', getReviewById);

// Protected routes
router.post('/', protect, createReview);
router.put('/:id/response', protect, respondToReview);

module.exports = router;
