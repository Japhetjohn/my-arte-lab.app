const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Webhook routes (public but verified via signature)
router.post('/tsara', webhookController.handleTsaraWebhook);

// Test endpoint (development only)
if (process.env.NODE_ENV !== 'production') {
  router.post('/test', webhookController.testWebhook);
}

module.exports = router;
