const express = require('express');
const router = express.Router();
const creatorController = require('../controllers/creatorController');
const { optionalAuth, protect } = require('../middleware/auth');
const {
  validateObjectId,
  validatePagination,
  handleValidationErrors
} = require('../middleware/validation');
const { markActive } = require('../middleware/activityTracker');
const { successResponse } = require('../utils/apiResponse');

// Ping endpoint to mark user as active
router.post('/ping', protect, async (req, res) => {
  await markActive(req.user._id);
  successResponse(res, 200, 'Activity recorded');
});

router.get('/', optionalAuth, validatePagination, handleValidationErrors, creatorController.getAllCreators);
router.get('/recommended', protect, creatorController.getRecommendedCreators);
router.get('/trending', optionalAuth, creatorController.getTrendingCreators);
router.get('/featured', optionalAuth, creatorController.getFeaturedCreators);
router.get('/stats', optionalAuth, creatorController.getCreatorStats);

// Availability routes
router.post('/availability', protect, creatorController.updateAvailability);
router.get('/:id/availability', optionalAuth, validateObjectId('id'), handleValidationErrors, creatorController.getAvailability);

router.get('/:id', optionalAuth, validateObjectId('id'), handleValidationErrors, creatorController.getCreatorProfile);

module.exports = router;
