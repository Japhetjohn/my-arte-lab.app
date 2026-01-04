const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { upload } = require('../services/uploadService');
const {
  uploadAvatar,
  uploadCover,
  uploadPortfolio,
  deletePortfolioImage,
  uploadBookingAttachment
} = require('../controllers/uploadController');

router.use(protect);

router.post('/avatar', upload.single('avatar'), uploadAvatar);

router.post('/cover', upload.single('cover'), uploadCover);

router.post('/portfolio', upload.single('portfolio'), uploadPortfolio);

router.delete('/portfolio/:index', deletePortfolioImage);

router.post('/booking-attachment', upload.single('file'), uploadBookingAttachment);

module.exports = router;
