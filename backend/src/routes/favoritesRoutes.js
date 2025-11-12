const express = require('express');
const router = express.Router();
const favoritesController = require('../controllers/favoritesController');
const { protect } = require('../middleware/auth');
const { validateObjectId, handleValidationErrors } = require('../middleware/validation');

// All routes require authentication
router.use(protect);

// Get all favorites
router.get('/', favoritesController.getFavorites);

// Add to favorites
router.post('/:creatorId', validateObjectId('creatorId'), handleValidationErrors, favoritesController.addToFavorites);

// Remove from favorites
router.delete('/:creatorId', validateObjectId('creatorId'), handleValidationErrors, favoritesController.removeFromFavorites);

// Check if favorited
router.get('/:creatorId/status', validateObjectId('creatorId'), handleValidationErrors, favoritesController.isFavorited);

module.exports = router;
