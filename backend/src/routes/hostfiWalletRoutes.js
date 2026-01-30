const express = require('express');
const router = express.Router();
const hostfiWalletController = require('../controllers/hostfiWalletController');
const hostfiWebhookController = require('../controllers/hostfiWebhookController');
const { protect } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');

// ============================================
// WALLET ROUTES (Protected)
// ============================================

/**
 * @route   GET /api/hostfi/wallet
 * @desc    Get wallet information with HostFi balances
 * @access  Private
 */
router.get('/wallet', protect, hostfiWalletController.getWallet);

/**
 * @route   GET /api/hostfi/wallet/transactions
 * @desc    Get wallet transactions
 * @access  Private
 */
router.get('/wallet/transactions', protect, hostfiWalletController.getTransactions);

/**
 * @route   GET /api/hostfi/wallet/balance-summary
 * @desc    Get balance summary
 * @access  Private
 */
router.get('/wallet/balance-summary', protect, hostfiWalletController.getBalanceSummary);

/**
 * @route   GET /api/hostfi/wallet/transactions/:reference
 * @desc    Get transaction by reference
 * @access  Private
 */
router.get('/wallet/transactions/:reference', protect, hostfiWalletController.getTransactionByReference);

// ============================================
// DEPOSIT / ON-RAMP ROUTES
// ============================================

/**
 * @route   POST /api/hostfi/deposit/channel
 * @desc    Create fiat collection channel (bank account for deposits)
 * @access  Private
 */
router.post('/deposit/channel', protect, hostfiWalletController.createDepositChannel);

/**
 * @route   GET /api/hostfi/deposit/channels
 * @desc    Get deposit channels for user
 * @access  Private
 */
router.get('/deposit/channels', protect, hostfiWalletController.getDepositChannels);

// ============================================
// WITHDRAWAL / OFF-RAMP ROUTES
// ============================================

/**
 * @route   GET /api/hostfi/withdrawal/methods
 * @desc    Get available withdrawal methods
 * @access  Private
 */
router.get('/withdrawal/methods', protect, hostfiWalletController.getWithdrawalMethods);

/**
 * @route   GET /api/hostfi/banks/:countryCode
 * @desc    Get banks list for a country
 * @access  Private
 */
router.get('/banks/:countryCode', protect, hostfiWalletController.getBanksList);

/**
 * @route   POST /api/hostfi/withdrawal/verify-account
 * @desc    Verify bank account details
 * @access  Private
 */
router.post('/withdrawal/verify-account', protect, hostfiWalletController.verifyBankAccount);

/**
 * @route   POST /api/hostfi/withdrawal/initiate
 * @desc    Initiate withdrawal to bank account
 * @access  Private
 */
router.post('/withdrawal/initiate', protect, hostfiWalletController.initiateWithdrawal);

/**
 * @route   GET /api/hostfi/withdrawal/status/:reference
 * @desc    Get withdrawal status by reference
 * @access  Private
 */
router.get('/withdrawal/status/:reference', protect, hostfiWalletController.getWithdrawalStatus);

// ============================================
// BENEFICIARIES ROUTES
// ============================================

/**
 * @route   GET /api/hostfi/beneficiaries
 * @desc    Get saved beneficiaries
 * @access  Private
 */
router.get('/beneficiaries', protect, hostfiWalletController.getBeneficiaries);

/**
 * @route   POST /api/hostfi/beneficiaries
 * @desc    Add new beneficiary
 * @access  Private
 */
router.post('/beneficiaries', protect, hostfiWalletController.addBeneficiary);

/**
 * @route   DELETE /api/hostfi/beneficiaries/:id
 * @desc    Remove beneficiary
 * @access  Private
 */
router.delete('/beneficiaries/:id', protect, hostfiWalletController.removeBeneficiary);

// ============================================
// CRYPTO ON-RAMP ROUTES (Fiat to Crypto)
// ============================================

/**
 * @route   POST /api/hostfi/onramp/quote
 * @desc    Get crypto on-ramp quote (buy crypto with fiat)
 * @access  Private
 */
router.post('/onramp/quote', protect, hostfiWalletController.getCryptoOnrampQuote);

/**
 * @route   GET /api/hostfi/onramp/countries
 * @desc    Get supported on-ramp countries
 * @access  Private
 */
router.get('/onramp/countries', protect, hostfiWalletController.getOnrampCountries);

/**
 * @route   GET /api/hostfi/onramp/payment-methods
 * @desc    Get supported payment methods for on-ramp
 * @access  Private
 */
router.get('/onramp/payment-methods', protect, hostfiWalletController.getOnrampPaymentMethods);

/**
 * @route   POST /api/hostfi/onramp/initiate
 * @desc    Initiate crypto on-ramp transaction
 * @access  Private
 */
router.post('/onramp/initiate', protect, hostfiWalletController.initiateCryptoOnramp);

/**
 * @route   GET /api/hostfi/onramp/status/:reference
 * @desc    Get crypto on-ramp transaction status
 * @access  Private
 */
router.get('/onramp/status/:reference', protect, hostfiWalletController.getCryptoOnrampStatus);

// ============================================
// CRYPTO OFF-RAMP ROUTES (Crypto to Fiat)
// ============================================

/**
 * @route   POST /api/hostfi/offramp/quote
 * @desc    Get crypto off-ramp quote (sell crypto for fiat)
 * @access  Private
 */
router.post('/offramp/quote', protect, hostfiWalletController.getCryptoOfframpQuote);

/**
 * @route   GET /api/hostfi/offramp/countries
 * @desc    Get supported off-ramp countries
 * @access  Private
 */
router.get('/offramp/countries', protect, hostfiWalletController.getOfframpCountries);

/**
 * @route   POST /api/hostfi/offramp/initiate
 * @desc    Initiate crypto off-ramp transaction
 * @access  Private
 */
router.post('/offramp/initiate', protect, hostfiWalletController.initiateCryptoOfframp);

/**
 * @route   GET /api/hostfi/offramp/status/:reference
 * @desc    Get crypto off-ramp transaction status
 * @access  Private
 */
router.get('/offramp/status/:reference', protect, hostfiWalletController.getCryptoOfframpStatus);

/**
 * @route   GET /api/hostfi/offramp/deposit-address
 * @desc    Get deposit address for crypto off-ramp
 * @access  Private
 */
router.get('/offramp/deposit-address', protect, hostfiWalletController.getCryptoOfframpDepositAddress);

// ============================================
// WEBHOOK ROUTES (Public - validated by signature)
// ============================================

/**
 * @route   POST /api/hostfi/webhooks/deposit
 * @desc    Handle fiat deposit webhook from HostFi
 * @access  Public (Webhook)
 */
router.post('/webhooks/deposit', hostfiWebhookController.handleFiatDeposit);

/**
 * @route   POST /api/hostfi/webhooks/withdrawal
 * @desc    Handle fiat withdrawal webhook from HostFi
 * @access  Public (Webhook)
 */
router.post('/webhooks/withdrawal', hostfiWebhookController.handleFiatWithdrawal);

/**
 * @route   POST /api/hostfi/webhooks/onramp
 * @desc    Handle crypto on-ramp webhook from HostFi
 * @access  Public (Webhook)
 */
router.post('/webhooks/onramp', hostfiWebhookController.handleCryptoOnramp);

/**
 * @route   POST /api/hostfi/webhooks/offramp
 * @desc    Handle crypto off-ramp webhook from HostFi
 * @access  Public (Webhook)
 */
router.post('/webhooks/offramp', hostfiWebhookController.handleCryptoOfframp);

/**
 * @route   POST /api/hostfi/webhooks/test
 * @desc    Test webhook endpoint
 * @access  Public
 */
router.post('/webhooks/test', hostfiWebhookController.testWebhook);

module.exports = router;
