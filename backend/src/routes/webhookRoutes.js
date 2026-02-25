const express = require('express');
const router = express.Router();

/**
 * Webhook Routes
 *
 * All webhook functionality has been moved to HostFi integration.
 * HostFi webhooks are handled at /api/hostfi/webhooks/*
 *
 * This route file is kept for backwards compatibility.
 */

const tsaraWebhookController = require('../controllers/tsaraWebhookController');

// Tsara Webhooks
router.post('/tsara', tsaraWebhookController.handleWebhook);

// Catch-all for other webhooks
router.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Webhook endpoint not found',
    note: 'HostFi webhooks are at /api/hostfi/webhooks/, Tsara webhooks are at /api/webhooks/tsara',
    availableEndpoints: [
      '/api/webhooks/tsara',
      '/api/hostfi/webhooks/address-generated',
      '/api/hostfi/webhooks/fiat-deposit',
      '/api/hostfi/webhooks/crypto-deposit',
      '/api/hostfi/webhooks/fiat-payout',
      '/api/hostfi/webhooks/crypto-payout',
      '/api/hostfi/webhooks/test'
    ]
  });
});

module.exports = router;
