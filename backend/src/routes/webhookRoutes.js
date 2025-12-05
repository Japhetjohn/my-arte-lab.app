const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Payment provider webhooks
// Switch webhooks for onramp (deposits) and offramp (withdrawals)
router.post('/switch/onramp', webhookController.handleSwitchOnrampWebhook);
router.post('/switch/offramp', webhookController.handleSwitchOfframpWebhook);

// Test endpoint (development only)
if (process.env.NODE_ENV !== 'production') {
  router.post('/test', webhookController.testWebhook);
}

module.exports = router;
