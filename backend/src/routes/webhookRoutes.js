const express = require('express');
const router = express.Router();

/**
 * Webhook Routes
 */

// Catch-all for webhooks
router.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Webhook endpoint not found'
  });
});

module.exports = router;
