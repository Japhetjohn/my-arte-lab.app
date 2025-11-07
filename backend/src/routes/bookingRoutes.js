const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/auth');
const {
  validateBooking,
  validateObjectId,
  handleValidationErrors
} = require('../middleware/validation');

// All routes require authentication
router.use(protect);

router.post('/', validateBooking, handleValidationErrors, bookingController.createBooking);
router.get('/', bookingController.getMyBookings);
router.get('/:id', validateObjectId('id'), handleValidationErrors, bookingController.getBooking);

// Creator actions
router.post('/:id/complete', validateObjectId('id'), handleValidationErrors, bookingController.completeBooking);

// Client actions
router.post('/:id/release-funds', validateObjectId('id'), handleValidationErrors, bookingController.releaseFunds);

// Both can cancel and message
router.post('/:id/cancel', validateObjectId('id'), handleValidationErrors, bookingController.cancelBooking);
router.post('/:id/messages', validateObjectId('id'), handleValidationErrors, bookingController.addMessage);

module.exports = router;
