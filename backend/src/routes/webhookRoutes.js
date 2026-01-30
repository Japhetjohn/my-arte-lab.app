const express = require('express');
const router = express.Router();
const hostfiWebhookController = require('../controllers/hostfiWebhookController');

// HostFi webhooks
router.post('/hostfi/deposit', hostfiWebhookController.handleFiatDeposit);
router.post('/hostfi/withdrawal', hostfiWebhookController.handleFiatWithdrawal);

// Test webhook endpoint (development only)
if (process.env.NODE_ENV !== 'production') {
  router.post('/test', hostfiWebhookController.testWebhook);
}

module.exports = router;
