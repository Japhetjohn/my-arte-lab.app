const { successResponse } = require('../utils/apiResponse');
const { ErrorHandler, catchAsync } = require('../utils/errorHandler');
const tsaraService = require('../services/tsaraService');

/**
 * @route   POST /api/webhooks/tsara
 * @desc    Handle Tsara payment gateway webhooks
 * @access  Public (but verified)
 */
exports.handleTsaraWebhook = catchAsync(async (req, res, next) => {
  // Get signature from header
  const signature = req.headers['x-tsara-signature'] || req.headers['x-webhook-signature'];

  if (!signature) {
    return next(new ErrorHandler('Missing webhook signature', 401));
  }

  // Get raw body (must be raw string for signature verification)
  const rawBody = JSON.stringify(req.body);

  // Verify webhook signature
  const isValid = tsaraService.verifyWebhookSignature(rawBody, signature);

  if (!isValid) {
    console.warn('⚠️ Invalid webhook signature received');
    return next(new ErrorHandler('Invalid webhook signature', 401));
  }

  try {
    // Handle the webhook event
    const result = await tsaraService.handleWebhookEvent(req.body);

    console.log('✅ Webhook processed successfully:', result);

    // Always return 200 to acknowledge receipt
    successResponse(res, 200, 'Webhook received', result);

  } catch (error) {
    console.error('❌ Webhook processing error:', error);

    // Still return 200 to prevent retries for non-recoverable errors
    // Tsara will retry on non-200 responses
    successResponse(res, 200, 'Webhook received but processing failed');
  }
});

/**
 * @route   POST /api/webhooks/test
 * @desc    Test webhook endpoint
 * @access  Public (for development/testing)
 */
exports.testWebhook = catchAsync(async (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return next(new ErrorHandler('Test endpoint not available in production', 404));
  }

  console.log('🧪 Test webhook received:', req.body);

  successResponse(res, 200, 'Test webhook received', {
    receivedData: req.body,
    timestamp: new Date()
  });
});
