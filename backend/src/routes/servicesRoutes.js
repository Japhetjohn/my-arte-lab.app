const express = require('express');
const router = express.Router();
const {
  getMyServices,
  addService,
  updateService,
  deleteService,
  uploadServiceImage,
  deleteServiceImage
} = require('../controllers/servicesController');
const { protect } = require('../middleware/auth');
const { upload } = require('../services/uploadService');

// All routes require authentication
router.use(protect);

// Service CRUD operations
router.get('/', getMyServices);
router.post('/', addService);
router.put('/:serviceId', updateService);
router.delete('/:serviceId', deleteService);

// Service image management
router.post('/:serviceId/images', upload.single('image'), uploadServiceImage);
router.delete('/:serviceId/images/:imageIndex', deleteServiceImage);

module.exports = router;
