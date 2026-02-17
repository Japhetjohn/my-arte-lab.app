const express = require('express');
const router = express.Router();
const favoritesController = require('../controllers/favoritesController');
const { protect } = require('../middleware/auth');
const { validateObjectId, handleValidationErrors } = require('../middleware/validation');

router.use(protect);

router.get('/', favoritesController.getFavorites);

router.post('/:creatorId', validateObjectId('creatorId'), handleValidationErrors, favoritesController.addToFavorites);

router.delete('/:creatorId', validateObjectId('creatorId'), handleValidationErrors, favoritesController.removeFromFavorites);

router.get('/:creatorId/status', validateObjectId('creatorId'), handleValidationErrors, favoritesController.isFavorited);

module.exports = router;
