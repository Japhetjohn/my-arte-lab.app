const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const {
  validateReview,
  validateObjectId,
  validatePagination,
  handleValidationErrors
} = require('../middleware/validation');

// Public route
router.get(
  '/creator/:creatorId',
  optionalAuth,
  validateObjectId('creatorId'),
  validatePagination,
  handleValidationErrors,
  reviewController.getCreatorReviews
);

// Protected routes
router.use(protect);

router.post('/', validateReview, handleValidationErrors, reviewController.createReview);
router.put(
  '/:id/response',
  authorize('creator'),
  validateObjectId('id'),
  handleValidationErrors,
  reviewController.respondToReview
);

// Public can vote (optional auth)
router.post('/:id/helpful', optionalAuth, validateObjectId('id'), handleValidationErrors, reviewController.markHelpful);

module.exports = router;
