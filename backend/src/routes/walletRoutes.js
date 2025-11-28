const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { protect, authorize } = require('../middleware/auth');
const {
  validateWithdrawal,
  validatePagination,
  handleValidationErrors
} = require('../middleware/validation');

// Public routes (no auth required) - Rate estimates and bank list
router.get('/exchange-rate', walletController.getExchangeRate);
router.post('/offramp/quote', walletController.getOfframpQuote);
router.get('/banks', walletController.getSupportedBanks);

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
