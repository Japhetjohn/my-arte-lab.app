const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

router.post('/switch/onramp', webhookController.handleSwitchOnrampWebhook);
router.post('/switch/offramp', webhookController.handleSwitchOfframpWebhook);

if (process.env.NODE_ENV !== 'production') {
  router.post('/test', webhookController.testWebhook);
}

module.exports = router;
