const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

// Public routes - no authentication required
router.get('/platform', statsController.getPlatformStats);
router.get('/featured-creators', statsController.getFeaturedCreators);

module.exports = router;
