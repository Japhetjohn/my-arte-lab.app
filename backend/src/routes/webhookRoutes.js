const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

router.post('/tsara', webhookController.handleTsaraWebhook);

if (process.env.NODE_ENV !== 'production') {
  router.post('/test', webhookController.testWebhook);
}

module.exports = router;
