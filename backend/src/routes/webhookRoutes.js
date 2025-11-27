const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Payment provider webhooks
router.post('/bread', webhookController.handleBreadWebhook);

// Test endpoint (development only)
if (process.env.NODE_ENV !== 'production') {
  router.post('/test', webhookController.testWebhook);
}

module.exports = router;
