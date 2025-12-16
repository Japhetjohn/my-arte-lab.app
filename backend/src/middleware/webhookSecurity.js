const crypto = require('crypto');
const WebhookEvent = require('../models/WebhookEvent');
const { WEBHOOK_REPLAY_PROTECTION } = require('../utils/constants');
const { ErrorHandler } = require('../utils/errorHandler');

const verifySwitchWebhookSignature = (req, res, next) => {
  try {
    const signature = req.headers['x-switch-signature'];
    const timestamp = req.headers['x-switch-timestamp'];

    if (!signature || !timestamp) {
      return res.status(401).json({
        success: false,
        error: 'Missing webhook signature or timestamp'
      });
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const webhookTime = parseInt(timestamp);
    const maxAgeSeconds = WEBHOOK_REPLAY_PROTECTION.MAX_AGE_MINUTES * 60;

    if (Math.abs(currentTime - webhookTime) > maxAgeSeconds) {
      return res.status(401).json({
        success: false,
        error: 'Webhook timestamp too old or too far in the future'
      });
    }

    const rawBody = req.rawBody || JSON.stringify(req.body);
    const signedPayload = `${timestamp}.${rawBody}`;

    const expectedSignature = crypto
      .createHmac('sha256', process.env.SWITCH_WEBHOOK_SECRET)
      .update(signedPayload)
      .digest('hex');

    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (signatureBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid webhook signature'
      });
    }

    req.webhookVerified = true;
    next();
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return res.status(401).json({
      success: false,
      error: 'Webhook signature verification failed'
    });
  }
};

const preventWebhookReplay = async (req, res, next) => {
  try {
    const eventId = req.body.id || req.body.event_id || req.body.reference;
    const provider = req.body.provider || 'switch';

    if (!eventId) {
      return next(new ErrorHandler('Missing webhook event ID', 400));
    }

    const isProcessed = await WebhookEvent.isProcessed(eventId, provider);

    if (isProcessed) {
      return res.status(200).json({
        success: true,
        message: 'Webhook already processed'
      });
    }

    try {
      await WebhookEvent.recordWebhook({
        eventId,
        provider,
        eventType: req.body.type || req.body.event_type || 'unknown',
        payload: req.body,
        signature: req.headers['x-switch-signature'] || ''
      });

      req.webhookEventId = eventId;
      req.webhookProvider = provider;
      next();
    } catch (error) {
      if (error.message.includes('Duplicate')) {
        return res.status(200).json({
          success: true,
          message: 'Webhook already processed'
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Webhook replay protection error:', error);
    return next(new ErrorHandler('Webhook processing error', 500));
  }
};

const markWebhookProcessed = (success = true, error = null) => {
  return async (req, res, next) => {
    if (req.webhookEventId && req.webhookProvider) {
      try {
        await WebhookEvent.markProcessed(
          req.webhookEventId,
          req.webhookProvider,
          error
        );
      } catch (err) {
        console.error('Failed to mark webhook as processed:', err);
      }
    }
    next();
  };
};

module.exports = {
  verifySwitchWebhookSignature,
  preventWebhookReplay,
  markWebhookProcessed
};
