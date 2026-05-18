const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const verificationService = require('../services/verificationService');
const { successResponse } = require('../utils/apiResponse');
const { catchAsync } = require('../utils/errorHandler');

// Subscribe to verification badge ($1/month)
router.post('/subscribe', protect, catchAsync(async (req, res) => {
  const result = await verificationService.subscribe(req.user._id);
  successResponse(res, 200, result.message, {
    expiresAt: result.expiresAt,
    balance: result.balance
  });
}));

// Cancel verification subscription
router.delete('/cancel', protect, catchAsync(async (req, res) => {
  const result = await verificationService.cancel(req.user._id);
  successResponse(res, 200, result.message, result);
}));

// Get verification status
router.get('/status', protect, catchAsync(async (req, res) => {
  const status = await verificationService.getStatus(req.user._id);
  successResponse(res, 200, 'Verification status retrieved', status);
}));

module.exports = router;
