const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { protect } = require('../middleware/auth');

router.get('/platform', protect, statsController.getPlatformStats);
router.get('/featured-creators', protect, statsController.getFeaturedCreators);

module.exports = router;
