const express = require('express');
const router = express.Router();
const {
  getFeed,
  getServiceById,
  getMyServices,
  addService,
  updateService,
  deleteService,
  uploadServiceImage,
  deleteServiceImage,
  toggleLike,
  getComments,
  addComment,
  toggleCommentLike,
  recordImpression
} = require('../controllers/servicesController');
const { protect, optionalAuth } = require('../middleware/auth');
const { upload } = require('../services/uploadService');

// Public endpoints (with optionalAuth to identify current user likes and impressions)
router.get('/feed', optionalAuth, getFeed);
router.get('/:serviceId', optionalAuth, getServiceById);
router.get('/:serviceId/comments', optionalAuth, getComments);
router.post('/:serviceId/impression', optionalAuth, recordImpression);

// Authenticated social engagement endpoints
router.post('/:serviceId/like', protect, toggleLike);
router.post('/:serviceId/comments', protect, addComment);
router.post('/:serviceId/comments/:commentId/like', protect, toggleCommentLike);

// Creator service management
router.get('/', protect, getMyServices);
router.post('/', protect, addService);
router.put('/:serviceId', protect, updateService);
router.delete('/:serviceId', deleteService);

router.post('/:serviceId/images', protect, upload.single('image'), uploadServiceImage);
router.delete('/:serviceId/images/:imageIndex', protect, deleteServiceImage);

module.exports = router;
