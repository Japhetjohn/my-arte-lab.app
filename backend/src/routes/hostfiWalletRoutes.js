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

/**
 * @route   GET /api/hostfi/currencies/supported
 * @desc    Get all supported currencies
 * @access  Private
 */
router.get('/currencies/supported', protect, hostfiWalletController.getSupportedCurrencies);

// ============================================
// COLLECTIONS (ON-RAMP) - User Receives Money
// ============================================

/**
 * @route   POST /api/hostfi/collections/crypto/address
 * @desc    Create crypto collection address (Solana, etc.)
 * @access  Private
 */
router.post('/collections/crypto/address', protect, hostfiWalletController.createCryptoAddress);

/**
 * @route   GET /api/hostfi/collections/crypto/addresses
 * @desc    Get user's crypto collection addresses
 * @access  Private
 */
router.get('/collections/crypto/addresses', protect, hostfiWalletController.getCryptoAddresses);

/**
 * @route   POST /api/hostfi/collections/fiat/channel
 * @desc    Create fiat collection channel (bank account)
 * @access  Private
 */
router.post('/collections/fiat/channel', protect, hostfiWalletController.createFiatChannel);

/**
 * @route   GET /api/hostfi/collections/fiat/channels
 * @desc    Get user's fiat collection channels
 * @access  Private
 */
router.get('/collections/fiat/channels', protect, hostfiWalletController.getFiatChannels);

// ============================================
// PAYMENTS (OFF-RAMP) - User Sends Money Out
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
 * @desc    Initiate withdrawal to bank account (with 1% platform fee)
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

/**
 * @route   POST /api/hostfi/assets/swap
 * @desc    Swap assets
 * @access  Private
 */
/*
router.post('/assets/swap', protect, hostfiWalletController.swapAssets);
*/

// ============================================
// RATES & FEES ROUTES
// ============================================

/**
 * @route   GET /api/hostfi/rates/exchange
 * @desc    Get exchange rates for currency pair
 * @access  Private
 */
router.get('/rates/exchange', protect, hostfiWalletController.getExchangeRates);

/**
 * @route   GET /api/hostfi/fees/exchange
 * @desc    Get exchange fees
 * @access  Private
 */
router.get('/fees/exchange', protect, hostfiWalletController.getExchangeFees);

/**
 * @route   GET /api/hostfi/currency/swap-pairs
 * @desc    Get supported currency swap/conversion pairs
 * @access  Private
 */
router.get('/currency/swap-pairs', protect, hostfiWalletController.getCurrencySwapPairs);

// ============================================
// WEBHOOK ROUTES (Public - validated by signature)
// ============================================

/**
 * @route   POST /api/hostfi/webhooks
 * @desc    Unified HostFi Webhook Handler
 * @access  Public (Webhook)
 */
router.post('/webhooks', hostfiWebhookController.handleWebhook);

/**
 * @route   POST /api/hostfi/webhooks/address-generated
 * @desc    Handle address generated webhook from HostFi
 * @access  Public (Webhook)
 */
router.post('/webhooks/address-generated', hostfiWebhookController.handleAddressGenerated);

/**
 * @route   POST /api/hostfi/webhooks/fiat-deposit
 * @desc    Handle fiat deposit webhook from HostFi
 * @access  Public (Webhook)
 */
router.post('/webhooks/fiat-deposit', hostfiWebhookController.handleFiatDeposit);

/**
 * @route   POST /api/hostfi/webhooks/crypto-deposit
 * @desc    Handle crypto deposit webhook from HostFi
 * @access  Public (Webhook)
 */
router.post('/webhooks/crypto-deposit', hostfiWebhookController.handleCryptoDeposit);

/**
 * @route   POST /api/hostfi/webhooks/fiat-payout
 * @desc    Handle fiat payout webhook from HostFi
 * @access  Public (Webhook)
 */
router.post('/webhooks/fiat-payout', hostfiWebhookController.handleFiatPayout);

/**
 * @route   POST /api/hostfi/webhooks/crypto-payout
 * @desc    Handle crypto payout webhook from HostFi
 * @access  Public (Webhook)
 */
router.post('/webhooks/crypto-payout', hostfiWebhookController.handleCryptoPayout);

/**
 * @route   POST /api/hostfi/webhooks/test
 * @desc    Test webhook endpoint (development only)
 * @access  Public
 */
router.post('/webhooks/test', hostfiWebhookController.testWebhook);

module.exports = router;
