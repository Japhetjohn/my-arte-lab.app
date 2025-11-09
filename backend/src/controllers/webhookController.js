const { successResponse } = require('../utils/apiResponse');
const { ErrorHandler, catchAsync } = require('../utils/errorHandler');
const tsaraService = require('../services/tsaraService');

exports.handleTsaraWebhook = catchAsync(async (req, res, next) => {
  const signature = req.headers['x-tsara-signature'] || req.headers['x-webhook-signature'];

  if (!signature) {
    return next(new ErrorHandler('Missing webhook signature', 401));
  }

  const rawBody = JSON.stringify(req.body);

  const isValid = tsaraService.verifyWebhookSignature(rawBody, signature);

  if (!isValid) {
    console.warn(' Invalid webhook signature received');
    return next(new ErrorHandler('Invalid webhook signature', 401));
  }

  try {
    const result = await tsaraService.handleWebhookEvent(req.body);

    console.log(' Webhook processed successfully:', result);

    successResponse(res, 200, 'Webhook received', result);

  } catch (error) {
    console.error(' Webhook processing error:', error);

    successResponse(res, 200, 'Webhook received but processing failed');
  }
});

exports.testWebhook = catchAsync(async (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return next(new ErrorHandler('Test endpoint not available in production', 404));
  }

  console.log(' Test webhook received:', req.body);

  successResponse(res, 200, 'Test webhook received', {
    receivedData: req.body,
    timestamp: new Date()
  });
});
