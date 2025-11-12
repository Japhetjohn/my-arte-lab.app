const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/auth');
const {
  validateBooking,
  validateObjectId,
  handleValidationErrors
} = require('../middleware/validation');

router.use(protect);

router.post('/', validateBooking, handleValidationErrors, bookingController.createBooking);
router.get('/', bookingController.getMyBookings);
router.get('/:id', validateObjectId('id'), handleValidationErrors, bookingController.getBooking);

router.post('/:id/complete', validateObjectId('id'), handleValidationErrors, bookingController.completeBooking);

router.post('/:id/release-funds', validateObjectId('id'), handleValidationErrors, bookingController.releaseFunds);

router.post('/:id/cancel', validateObjectId('id'), handleValidationErrors, bookingController.cancelBooking);
router.post('/:id/messages', validateObjectId('id'), handleValidationErrors, bookingController.addMessage);

// Booking proposal actions (creator only)
router.post('/:id/accept', validateObjectId('id'), handleValidationErrors, bookingController.acceptBooking);
router.post('/:id/reject', validateObjectId('id'), handleValidationErrors, bookingController.rejectBooking);
router.post('/:id/counter-proposal', validateObjectId('id'), handleValidationErrors, bookingController.counterProposal);

module.exports = router;
