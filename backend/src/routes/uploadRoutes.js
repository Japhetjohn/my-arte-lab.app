const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { upload } = require('../services/uploadService');
const {
  uploadAvatar,
  uploadCover,
  uploadPortfolio,
  deletePortfolioImage
} = require('../controllers/uploadController');

// All routes require authentication
router.use(protect);

// Avatar upload
router.post('/avatar', upload.single('avatar'), uploadAvatar);

// Cover image upload
router.post('/cover', upload.single('cover'), uploadCover);

// Portfolio image upload
router.post('/portfolio', upload.single('portfolio'), uploadPortfolio);

// Delete portfolio image
router.delete('/portfolio/:index', deletePortfolioImage);

module.exports = router;
