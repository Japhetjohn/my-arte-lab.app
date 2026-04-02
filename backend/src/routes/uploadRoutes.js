const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { upload } = require('../services/uploadService');
const { successResponse } = require('../utils/apiResponse');
const { catchAsync, ErrorHandler } = require('../utils/errorHandler');
const { uploadPortfolio } = require('../services/uploadService');
const {
  uploadAvatar,
  uploadCover,
  uploadPortfolio: uploadPortfolioController,
  deletePortfolioImage,
  uploadBookingAttachment
} = require('../controllers/uploadController');

router.use(protect);

// Generic image upload - returns URL only
router.post('/image', upload.single('image'), catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new ErrorHandler('Please upload an image', 400));
  }

  // Use portfolio upload function (generic image upload)
  const result = await uploadPortfolio(req.file.buffer, req.file.originalname);

  successResponse(res, 200, 'Image uploaded successfully', {
    url: result.secure_url,
    publicId: result.public_id
  });
}));

router.post('/avatar', upload.single('avatar'), uploadAvatar);

router.post('/cover', upload.single('cover'), uploadCover);

router.post('/portfolio', upload.single('portfolio'), uploadPortfolioController);

router.delete('/portfolio/:index', deletePortfolioImage);

router.post('/booking-attachment', upload.single('file'), uploadBookingAttachment);

module.exports = router;
