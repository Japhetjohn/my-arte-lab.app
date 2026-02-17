const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

router.get('/platform', statsController.getPlatformStats);
router.get('/featured-creators', statsController.getFeaturedCreators);

module.exports = router;
