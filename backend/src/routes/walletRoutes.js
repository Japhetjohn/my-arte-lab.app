const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const hostfiWalletController = require('../controllers/hostfiWalletController');
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

// Public endpoints (with rate limiting)
router.get('/banks/:countryCode', publicWalletLimiter, hostfiWalletController.getBanksList);
router.post('/verify-account', publicWalletLimiter, hostfiWalletController.verifyBankAccount);

// Protected endpoints
router.use(protect);

// Wallet information
router.get('/', hostfiWalletController.getWallet);
router.get('/transactions', validatePagination, handleValidationErrors, hostfiWalletController.getTransactions);
router.get('/balance-summary', hostfiWalletController.getBalanceSummary);
router.get('/transactions/:reference', hostfiWalletController.getTransactionByReference);

// Deposits (ON-RAMP)
router.post('/deposit/channel', hostfiWalletController.createDepositChannel);
router.get('/deposit/channels', hostfiWalletController.getDepositChannels);

// Withdrawals (OFF-RAMP)
router.get('/withdrawal/methods', hostfiWalletController.getWithdrawalMethods);
router.post('/withdrawal/initiate', hostfiWalletController.initiateWithdrawal);
router.get('/withdrawal/status/:reference', hostfiWalletController.getWithdrawalStatus);

// Beneficiaries
router.get('/beneficiaries', hostfiWalletController.getBeneficiaries);
router.post('/beneficiaries', hostfiWalletController.addBeneficiary);
router.delete('/beneficiaries/:id', hostfiWalletController.removeBeneficiary);

module.exports = router;
