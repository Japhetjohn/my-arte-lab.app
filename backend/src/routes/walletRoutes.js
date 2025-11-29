const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const walletController = require('../controllers/walletController');
const { protect, authorize } = require('../middleware/auth');
const {
  validateWithdrawal,
  validatePagination,
  handleValidationErrors
} = require('../middleware/validation');

const publicWalletLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: 'Too many requests to this endpoint, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes (no auth required) - Rate estimates and bank list with rate limiting
router.get('/exchange-rate', publicWalletLimiter, walletController.getExchangeRate);
router.post('/offramp/quote', publicWalletLimiter, walletController.getOfframpQuote);
router.get('/banks', publicWalletLimiter, walletController.getSupportedBanks);

// All routes below require authentication
router.use(protect);

// Wallet information routes
router.get('/', walletController.getWallet);
router.get('/transactions', validatePagination, handleValidationErrors, walletController.getTransactions);
router.get('/balance-summary', walletController.getBalanceSummary);

// Legacy crypto withdrawal (Tsara)
router.post(
  '/withdraw',
  authorize('creator'),
  validateWithdrawal,
  handleValidationErrors,
  walletController.requestWithdrawal
);

// bread.africa Offramp (Withdrawal) routes - Available to ALL authenticated users
router.post('/offramp/bank', walletController.requestBankWithdrawal);

// Beneficiary management routes
router.get('/beneficiaries', walletController.getBeneficiaries);
router.post('/beneficiaries', walletController.addBeneficiary);
router.delete('/beneficiaries/:id', walletController.deleteBeneficiary);

// Utility routes (bank account verification requires auth)
router.post('/verify-bank-account', walletController.verifyBankAccount);

module.exports = router;
