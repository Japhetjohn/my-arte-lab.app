const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const SwitchWallet = require('../models/SwitchWallet');
const FundingTransaction = require('../models/FundingTransaction');
const switchService = require('../services/switchService');
const { catchAsync } = require('../utils/errorHandler');

/**
 * @route   GET /api/wallet
 * @desc    Get user wallet details and balance summary (including Switch Solana address)
 * @access  Private
 */
router.get('/', protect, catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id).select('wallet balance pendingBalance totalEarnings currency firstName lastName');

  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  // Aggregate active escrow balance from bookings
  const Booking = require('../models/Booking');
  const activeBookings = await Booking.find({
    client: req.user._id,
    status: { $in: ['confirmed', 'in_progress', 'delivered'] },
    paymentStatus: 'paid'
  });
  const escrowBalance = activeBookings.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);

  // Incoming earnings for creators
  const creatorBookings = await Booking.find({
    creator: req.user._id,
    status: { $in: ['confirmed', 'in_progress', 'delivered'] },
    paymentStatus: 'paid'
  });
  const incomingEarnings = creatorBookings.reduce((sum, b) => sum + (parseFloat(b.creatorAmount || b.amount) || 0), 0);

  // Retrieve existing Switch wallet if provisioned, or initialize once if missing
  let switchWallet = await SwitchWallet.findOne({ user: req.user._id });
  if (!switchWallet) {
    try {
      const userName = req.user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim();
      await switchService.getOrCreateUserWallet(req.user._id, userName);
      switchWallet = await SwitchWallet.findOne({ user: req.user._id });
    } catch (provisionErr) {
      console.warn('[Wallet] Could not auto-provision wallet on GET /:', provisionErr.message);
    }
  }

  res.json({
    success: true,
    data: {
      wallet: {
        balance: user.balance || 0,
        usdcBalance: user.balance || 0,
        pendingBalance: user.pendingBalance || 0,
        escrowBalance,
        incomingEarnings,
        currency: user.currency || 'USDC',
        solanaAddress: switchWallet?.solanaAddress || null,
        switchWalletId: switchWallet?.switchWalletId || null,
        network: 'Solana',
        asset: 'solana:usdc'
      }
    }
  });
}));

/**
 * @route   GET /api/wallet/funding-options
 * @desc    Get dynamic Switch-supported funding corridors (countries, currencies, channels, limits)
 * @access  Private
 */
router.get('/funding-options', protect, catchAsync(async (req, res) => {
  const coverage = await switchService.getCoverage('ONRAMP');

  res.json({
    success: true,
    data: coverage
  });
}));

/**
 * @route   POST /api/wallet/quote
 * @desc    Get guaranteed on-ramp quote from fiat to USDC on Solana
 * @access  Private
 */
router.post('/quote', protect, catchAsync(async (req, res) => {
  const { amount, country, currency, channel } = req.body;

  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid funding amount greater than 0'
    });
  }

  if (!country || typeof country !== 'string' || country.trim().length !== 2) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid 2-letter country code'
    });
  }

  if (!currency || typeof currency !== 'string' || currency.trim().length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid currency code'
    });
  }

  try {
    const quote = await switchService.getOnrampQuote({
      amount: Number(amount),
      country: country.trim().toUpperCase(),
      currency: currency.trim().toUpperCase(),
      channel: channel ? channel.trim().toUpperCase() : undefined
    });

    res.json({
      success: true,
      data: quote
    });
  } catch (quoteErr) {
    res.status(quoteErr.status || 400).json({
      success: false,
      error: quoteErr.message || 'Failed to fetch quote from Switch'
    });
  }
}));

/**
 * @route   POST /api/wallet/fund/initiate
 * @desc    Initiate fiat on-ramp funding via Switch to USDC on Solana
 * @access  Private
 */
router.post('/fund/initiate', protect, catchAsync(async (req, res) => {
  const { amount, country, currency, channel, idempotencyKey, payer } = req.body;

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid funding amount greater than 0'
    });
  }

  if (!country || typeof country !== 'string' || country.trim().length !== 2) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid 2-letter country code'
    });
  }

  if (!currency || typeof currency !== 'string' || currency.trim().length < 2) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid currency code'
    });
  }

  const cleanCountry = country.trim().toUpperCase();
  const cleanCurrency = currency.trim().toUpperCase();
  const cleanChannel = (channel || 'BANK').trim().toUpperCase();

  // Resolve idempotency key (prevent duplicate submissions / double-click)
  const resolvedKey = idempotencyKey 
    ? String(idempotencyKey).trim()
    : crypto.createHash('sha256').update(`${req.user._id}-${cleanCountry}-${cleanCurrency}-${numAmount}-${Math.floor(Date.now() / (5 * 60 * 1000))}`).digest('hex');

  // Check for duplicate in-flight initiation
  const existingTx = await FundingTransaction.findOne({
    user: req.user._id,
    idempotencyKey: resolvedKey
  });

  if (existingTx) {
    return res.json({
      success: true,
      message: 'Existing funding transaction returned (idempotency)',
      data: {
        reference: existingTx.reference,
        status: existingTx.status,
        fiatAmount: existingTx.fiatAmount,
        fiatCurrency: existingTx.fiatCurrency,
        quotedUsdcAmount: existingTx.quotedUsdcAmount,
        rate: existingTx.quoteRate,
        channel: existingTx.channel,
        deposit: existingTx.depositDetails
      }
    });
  }

  // 1. Ensure user has an active Switch wallet with Solana address
  let switchWallet = await SwitchWallet.findOne({ user: req.user._id });
  if (!switchWallet || !switchWallet.solanaAddress) {
    const userName = req.user.name || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim();
    switchWallet = await switchService.getOrCreateUserWallet(req.user._id, userName);
  }

  if (!switchWallet || !switchWallet.solanaAddress) {
    return res.status(500).json({
      success: false,
      error: 'Unable to resolve destination Solana address for funding'
    });
  }

  // 2. Fetch fresh quote from Switch to verify live rate & corridor limits
  const quote = await switchService.getOnrampQuote({
    amount: numAmount,
    country: cleanCountry,
    currency: cleanCurrency,
    channel: cleanChannel
  });

  // 3. Generate unique transaction reference UUID
  const reference = crypto.randomUUID();
  const userFullName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'MyArteLab User';

  // 4. Initiate on Switch API
  const callbackUrl = process.env.SWITCH_CALLBACK_URL || 'https://app.myartelab.com/webhooks';
  let initiateResult;
  try {
    initiateResult = await switchService.initiateOnramp({
      amount: numAmount,
      country: cleanCountry,
      currency: cleanCurrency,
      channel: cleanChannel,
      reference,
      callbackUrl,
      beneficiary: {
        holder_type: 'INDIVIDUAL',
        holder_name: userFullName,
        wallet_address: switchWallet.solanaAddress
      },
      payer: payer || undefined
    });
  } catch (initErr) {
    return res.status(initErr.status || 400).json({
      success: false,
      error: initErr.message || 'Failed to initiate funding on Switch'
    });
  }

  const deposit = initiateResult.deposit || {};
  const depositDetails = {
    accountNumber: deposit.account_number || null,
    accountName: deposit.account_name || null,
    bankName: deposit.bank_name || null,
    bankCode: deposit.bank_code || null,
    amount: deposit.amount || numAmount,
    currency: cleanCurrency,
    expiresAt: deposit.expires_at ? new Date(deposit.expires_at) : null,
    instructions: Array.isArray(deposit.note) ? deposit.note : [],
    payer: payer || null
  };

  // 5. Persist FundingTransaction record
  const fundingTx = await FundingTransaction.create({
    user: req.user._id,
    idempotencyKey: resolvedKey,
    reference,
    country: cleanCountry,
    fiatCurrency: cleanCurrency,
    fiatAmount: numAmount,
    channel: cleanChannel,
    destinationAsset: 'solana:usdc',
    destinationNetwork: 'SOLANA',
    destinationAddress: switchWallet.solanaAddress,
    quoteRate: quote.rate,
    quotedUsdcAmount: quote.destination?.amount,
    quoteExpiry: quote.expiry ? new Date(quote.expiry) : null,
    switchStatus: initiateResult.status || 'AWAITING_DEPOSIT',
    status: 'pending',
    depositDetails,
    switchReference: initiateResult.reference || reference,
    isCredited: false
  });

  res.status(201).json({
    success: true,
    message: 'Funding initiated successfully',
    data: {
      reference: fundingTx.reference,
      status: fundingTx.status,
      fiatAmount: fundingTx.fiatAmount,
      fiatCurrency: fundingTx.fiatCurrency,
      quotedUsdcAmount: fundingTx.quotedUsdcAmount,
      rate: fundingTx.quoteRate,
      channel: fundingTx.channel,
      deposit: fundingTx.depositDetails
    }
  });
}));

/**
 * @route   GET /api/wallet/fund/:reference
 * @desc    Get status and deposit details of an on-ramp funding attempt
 * @access  Private
 */
router.get('/fund/:reference', protect, catchAsync(async (req, res) => {
  const { reference } = req.params;

  const fundingTx = await FundingTransaction.findOne({
    reference,
    user: req.user._id
  });

  if (!fundingTx) {
    return res.status(404).json({
      success: false,
      error: 'Funding transaction not found'
    });
  }

  // If still pending or processing, poll Switch to sync live status
  if (['pending', 'processing'].includes(fundingTx.status)) {
    try {
      const switchStatusRes = await switchService.getPaymentStatus(fundingTx.reference);
      const switchStatus = switchStatusRes?.status;
      if (switchStatus && switchStatus !== fundingTx.switchStatus) {
        fundingTx.switchStatus = switchStatus;
        if (switchStatus === 'PROCESSING') fundingTx.status = 'processing';
        if (switchStatus === 'COMPLETED') fundingTx.status = 'completed';
        if (switchStatus === 'FAILED') fundingTx.status = 'failed';
        if (switchStatus === 'REVERSED') fundingTx.status = 'reversed';
        await fundingTx.save();
      }
    } catch (pollErr) {
      console.warn(`[Wallet] Could not sync Switch payment status for ${reference}:`, pollErr.message);
    }
  }

  res.json({
    success: true,
    data: {
      reference: fundingTx.reference,
      status: fundingTx.status,
      switchStatus: fundingTx.switchStatus,
      fiatAmount: fundingTx.fiatAmount,
      fiatCurrency: fundingTx.fiatCurrency,
      quotedUsdcAmount: fundingTx.quotedUsdcAmount,
      rate: fundingTx.quoteRate,
      channel: fundingTx.channel,
      deposit: fundingTx.depositDetails,
      createdAt: fundingTx.createdAt,
      updatedAt: fundingTx.updatedAt
    }
  });
}));

/**
 * @route   GET /api/wallet/switch
 * @desc    Get or create user's Switch non-custodial wallet (USDC on Solana)
 * @access  Private
 */
router.get('/switch', protect, catchAsync(async (req, res) => {
  const userName = req.user.name || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim();
  const wallet = await switchService.getOrCreateUserWallet(req.user._id, userName);

  // Safely attempt to fetch current Switch on-chain balance breakdown
  let switchBalance = null;
  try {
    switchBalance = await switchService.getWalletBalance(wallet.id);
  } catch (err) {
    console.warn(`[Wallet] Could not fetch live Switch balance for ${wallet.id}:`, err.message);
  }

  res.json({
    success: true,
    data: {
      walletId: wallet.id,
      solanaAddress: wallet.solanaAddress,
      network: 'Solana',
      asset: 'solana:usdc',
      status: wallet.status,
      switchBalance: switchBalance?.balance || 0,
      switchBalanceUsd: switchBalance?.balance_in_usd || 0,
      breakdown: switchBalance?.breakdown || []
    }
  });
}));

/**
 * @route   GET /api/wallet/transactions
 * @desc    Get user transaction history
 * @access  Private
 */
router.get('/transactions', protect, catchAsync(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const totalItems = await Transaction.countDocuments({ user: req.user._id });
  const transactions = await Transaction.getUserTransactions(req.user._id, limit, skip);

  res.json({
    success: true,
    data: {
      transactions,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit) || 1,
        totalItems,
        itemsPerPage: limit
      }
    }
  });
}));

module.exports = router;
