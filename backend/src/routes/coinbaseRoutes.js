/**
 * Coinbase Onramp & Offramp Routes
 */

const express = require('express');
const router = express.Router();
const coinbaseController = require('../controllers/coinbaseController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

/**
 * Onramp Routes (Client wallet funding)
 */

// Generate onramp session for wallet funding
router.post('/onramp/session', coinbaseController.generateOnrampSession);

// Get buy quote (estimate)
router.get('/onramp/quote', coinbaseController.getBuyQuote);

/**
 * Offramp Routes (Creator cash out)
 */

// Generate offramp session for withdrawal
router.post('/offramp/session', coinbaseController.generateOfframpSession);

// Get sell quote (estimate)
router.get('/offramp/quote', coinbaseController.getSellQuote);

/**
 * General Routes
 */

// Check Coinbase integration status
router.get('/status', coinbaseController.getStatus);

module.exports = router;
