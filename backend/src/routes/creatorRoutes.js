const express = require('express');
const router = express.Router();
const creatorController = require('../controllers/creatorController');
const { optionalAuth } = require('../middleware/auth');
const {
  validateObjectId,
  validatePagination,
  handleValidationErrors
} = require('../middleware/validation');

router.get('/', optionalAuth, validatePagination, handleValidationErrors, creatorController.getAllCreators);
router.get('/featured', optionalAuth, creatorController.getFeaturedCreators);
router.get('/stats', optionalAuth, creatorController.getCreatorStats);
router.get('/:id', optionalAuth, validateObjectId('id'), handleValidationErrors, creatorController.getCreatorProfile);

module.exports = router;
