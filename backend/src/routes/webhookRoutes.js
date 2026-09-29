const express = require('express');
const router = express.Router();
const switchService = require('../services/switchService');
const ledgerService = require('../services/ledgerService');
const FundingTransaction = require('../models/FundingTransaction');
const crypto = require('crypto');

/**
 * Switch Webhook Handler
 * Endpoint: POST /webhooks or POST /api/webhooks or POST /api/webhooks/switch
 * 
 * Verifies authenticity of incoming Switch webhooks using HMAC-SHA256 signature and timestamp.
 * Updates FundingTransaction state machine upon verified payment status events.
 * Phase 5: Triggers idempotent settlement crediting to user balance when status is COMPLETED.
 */
const handleSwitchWebhook = async (req, res) => {
  const signatureHeader = req.headers['x-switch-signature'];
  const timestampHeader = req.headers['x-switch-timestamp'];
  const rawBody = req.rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}));

  // 1. Perform signature & replay protection check
  const verification = switchService.verifyWebhookSignature(rawBody, signatureHeader, timestampHeader);

  if (!verification.isValid) {
    console.warn(`[Switch Webhook] Verification failed from ${req.ip}: ${verification.reason}`);
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid webhook signature or timestamp',
      error: verification.reason
    });
  }

  // 2. Extract event data safely
  const payload = req.body || {};
  const data = payload.data || payload;
  const eventType = payload.type || data.type || 'UNKNOWN_EVENT';
  const switchStatus = String(payload.status || data.status || '').toUpperCase();
  const reference = payload.reference || data.reference;

  console.log(`[Switch Webhook] Verified event received. Type: ${eventType}, Status: ${switchStatus}, Ref: ${reference || 'N/A'}`);

  // 3. Update matching FundingTransaction if reference exists
  if (reference) {
    try {
      const fundingTx = await FundingTransaction.findOne({ reference });
      if (fundingTx) {
        // Event deduplication check
        const alreadyRecorded = fundingTx.webhookEvents.some(
          e => e.status === switchStatus && (Date.now() - new Date(e.timestamp).getTime()) < 30000
        );

        if (!alreadyRecorded) {
          fundingTx.webhookEvents.push({
            eventId: req.headers['x-switch-event-id'] || crypto.randomUUID(),
            status: switchStatus,
            timestamp: new Date(),
            payload: data
          });

          if (switchStatus) {
            fundingTx.switchStatus = switchStatus;

            // Controlled state machine transitions
            if (switchStatus === 'PROCESSING') {
              fundingTx.status = 'processing';
            } else if (switchStatus === 'COMPLETED') {
              fundingTx.status = 'completed';
            } else if (switchStatus === 'FAILED') {
              fundingTx.status = 'failed';
            } else if (switchStatus === 'REVERSED') {
              fundingTx.status = 'reversed';
            } else if (switchStatus === 'EXPIRED') {
              fundingTx.status = 'expired';
            }
          }

          await fundingTx.save();
          console.log(`[Switch Webhook] Funding ${reference} transitioned to ${fundingTx.status} (Switch: ${switchStatus})`);
        }

        // Phase 5 settlement accounting: Idempotent balance crediting on settlement
        if (switchStatus === 'COMPLETED') {
          const creditResult = await ledgerService.creditFundingDeposit(fundingTx);
          console.log(`[Switch Webhook] Settlement credit for ${reference}:`, creditResult);
        }
      }
    } catch (dbErr) {
      console.error(`[Switch Webhook] Error updating funding record for ${reference}:`, dbErr.message);
      // Non-blocking: Still acknowledge to Switch to prevent endless webhook retries
    }
  }

  // 4. Acknowledge receipt to Switch (200 OK)
  return res.status(200).json({
    success: true,
    message: 'Webhook received, verified and processed successfully',
    timestamp: new Date().toISOString()
  });
};

// Health check and probe handlers for external webhook verifiers
const handleWebhookHealth = (req, res) => {
  return res.status(200).json({
    success: true,
    status: 'active',
    service: 'Switch Webhook Receiver',
    endpoint: '/webhooks',
    timestamp: new Date().toISOString()
  });
};

router.get('/switch', handleWebhookHealth);
router.get('/', handleWebhookHealth);
router.head('/switch', (req, res) => res.status(200).end());
router.head('/', (req, res) => res.status(200).end());
router.options('/switch', (req, res) => res.status(204).end());
router.options('/', (req, res) => res.status(204).end());

// Route handlers for Switch webhook payloads (HMAC-SHA256 verified)
router.post('/switch', handleSwitchWebhook);
router.post('/', handleSwitchWebhook);

// Catch-all for unsupported methods or paths
router.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Webhook endpoint not found'
  });
});

module.exports = router;
