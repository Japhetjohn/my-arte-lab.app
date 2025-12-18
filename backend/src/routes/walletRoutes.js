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

router.get('/switch/countries', publicWalletLimiter, walletController.getSwitchCountries);
router.get('/switch/banks/:country', publicWalletLimiter, walletController.getSwitchBanksByCountry);
router.get('/switch/requirements', publicWalletLimiter, walletController.getSwitchRequirements);
router.post('/switch/quote/offramp', publicWalletLimiter, walletController.getSwitchOfframpQuote);
router.post('/switch/quote/onramp', publicWalletLimiter, walletController.getSwitchOnrampQuote);
router.post('/switch/quote/swap', publicWalletLimiter, walletController.getSwitchSwapQuote);
router.post('/switch/verify-account', publicWalletLimiter, walletController.verifySwitchBankAccount);

router.use(protect);

router.get('/', walletController.getWallet);
router.get('/transactions', validatePagination, handleValidationErrors, walletController.getTransactions);
router.get('/balance-summary', walletController.getBalanceSummary);

router.post(
  '/withdraw',
  authorize('creator'),
  validateWithdrawal,
  handleValidationErrors,
  walletController.requestWithdrawal
);

router.post('/switch/onramp', walletController.requestSwitchOnramp);
router.post('/switch/offramp', walletController.requestSwitchOfframp);
router.post('/switch/swap', walletController.requestSwitchSwap);
router.get('/switch/status/:reference', walletController.getSwitchTransactionStatus);

router.get('/beneficiaries', walletController.getBeneficiaries);
router.post('/beneficiaries', walletController.addBeneficiary);
router.delete('/beneficiaries/:id', walletController.deleteBeneficiary);

module.exports = router;
