const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const SwitchWallet = require('../models/SwitchWallet');
const FundingTransaction = require('../models/FundingTransaction');
const WithdrawalTransaction = require('../models/WithdrawalTransaction');
const switchService = require('../services/switchService');
const ledgerService = require('../services/ledgerService');
const withdrawalService = require('../services/withdrawalService');
const solanaDepositService = require('../services/solanaDepositService');
const { catchAsync } = require('../utils/errorHandler');

/**
 * @route   GET /api/wallet
 * @desc    Get user wallet details and balance summary (including Switch Solana address)
 * @access  Private
 */
router.get('/', protect, catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id).select('wallet balance pendingBalance pendingWithdrawal totalEarnings currency firstName lastName countryCode location');

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

  // Ensure dual balance fields are aligned (authoritative source)
  const authoritativeBalance = user.wallet?.balance !== undefined && user.wallet?.balance !== null
    ? user.wallet.balance
    : (user.balance || 0);

  const pendingWithdrawal = user.wallet?.pendingWithdrawal !== undefined && user.wallet?.pendingWithdrawal !== null
    ? user.wallet.pendingWithdrawal
    : (user.pendingWithdrawal || 0);

  // Self-heal field discrepancy if detected
  if (user.balance !== authoritativeBalance || user.wallet?.balance !== authoritativeBalance) {
    await User.findByIdAndUpdate(user._id, {
      $set: {
        'wallet.balance': authoritativeBalance,
        'balance': authoritativeBalance
      }
    });
  }

  const { normalizeCountryCode, getCountryName, getDefaultCurrency, getCountryPaymentCapabilities } = require('../utils/countryUtils');
  const userCountryCode = user.countryCode || normalizeCountryCode(user.location?.country) || 'NG';
  const userCountryName = user.location?.country || getCountryName(userCountryCode);
  const defaultCurrency = getDefaultCurrency(userCountryCode);
  const paymentCapabilities = getCountryPaymentCapabilities(userCountryCode);

  res.json({
    success: true,
    data: {
      wallet: {
        balance: authoritativeBalance,
        usdcBalance: authoritativeBalance,
        pendingBalance: user.pendingBalance || user.wallet?.pendingBalance || 0,
        pendingWithdrawal,
        availableBalance: Math.max(0, authoritativeBalance - pendingWithdrawal),
        escrowBalance,
        incomingEarnings,
        currency: user.currency || 'USDC',
        solanaAddress: switchWallet?.solanaAddress || null,
        switchWalletId: switchWallet?.switchWalletId || null,
        network: 'Solana',
        asset: 'solana:usdc'
      },
      userCountry: {
        countryCode: userCountryCode,
        countryName: userCountryName,
        defaultCurrency
      },
      paymentCapabilities
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
 * @route   GET /api/wallet/withdraw/options
 * @desc    Get dynamic Switch-supported off-ramp / withdrawal corridors
 * @access  Private
 */
router.get('/withdraw/options', protect, catchAsync(async (req, res) => {
  const coverage = await switchService.getCoverage('OFFRAMP');

  res.json({
    success: true,
    data: coverage
  });
}));

/**
 * @route   GET /api/wallet/capabilities
 * @desc    Get user-specific payment capabilities based on saved signup country and provider permissions
 * @access  Private
 */
router.get('/capabilities', protect, catchAsync(async (req, res) => {
  const { normalizeCountryCode, getCountryPaymentCapabilities, getAllCountriesList } = require('../utils/countryUtils');
  const user = await User.findById(req.user._id).select('countryCode location');
  const userCountryCode = user?.countryCode || normalizeCountryCode(user?.location?.country) || 'NG';
  const capabilities = getCountryPaymentCapabilities(userCountryCode);

  res.json({
    success: true,
    data: {
      userCountry: {
        countryCode: capabilities.countryCode,
        countryName: capabilities.countryName,
        defaultCurrency: capabilities.defaultCurrency
      },
      capabilities,
      countries: getAllCountriesList()
    }
  });
}));

/**
 * @route   GET /api/wallet/countries
 * @desc    Get all recognized countries and their operational payment statuses
 * @access  Private
 */
router.get('/countries', protect, catchAsync(async (req, res) => {
  const { getAllCountriesList } = require('../utils/countryUtils');
  res.json({
    success: true,
    data: getAllCountriesList()
  });
}));

/**
 * @route   GET /api/wallet/institutions
 * @desc    Get list of supported banks/institutions for a country
 * @access  Private
 */
router.get('/institutions', protect, catchAsync(async (req, res) => {
  const { country } = req.query;

  if (!country || typeof country !== 'string' || country.trim().length !== 2) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid 2-letter country code (e.g. ?country=NG)'
    });
  }

  try {
    const institutions = await switchService.getInstitutions({
      country: country.trim().toUpperCase()
    });

    res.json({
      success: true,
      data: institutions
    });
  } catch (instErr) {
    res.status(instErr.status || 400).json({
      success: false,
      error: instErr.message || 'Failed to fetch institutions from Switch'
    });
  }
}));

/**
 * @route   GET /api/wallet/beneficiary-requirements
 * @desc    Get required beneficiary fields for a country, currency, and channel
 * @access  Private
 */
router.get('/beneficiary-requirements', protect, catchAsync(async (req, res) => {
  const { country, currency, channel, type } = req.query;

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
    const requirements = await switchService.getBeneficiaryRequirements({
      country: country.trim().toUpperCase(),
      currency: currency.trim().toUpperCase(),
      channel: channel ? String(channel).trim().toUpperCase() : undefined,
      type: type ? String(type).trim().toUpperCase() : 'INDIVIDUAL'
    });

    res.json({
      success: true,
      data: requirements
    });
  } catch (reqErr) {
    res.status(reqErr.status || 400).json({
      success: false,
      error: reqErr.message || 'Failed to fetch beneficiary requirements from Switch'
    });
  }
}));

/**
 * @route   POST /api/wallet/resolve-account
 * @desc    Resolve / verify beneficiary bank account details before withdrawal
 * @access  Private
 */
router.post('/resolve-account', protect, catchAsync(async (req, res) => {
  const { country, accountNumber, bankCode } = req.body;

  if (!country || typeof country !== 'string' || country.trim().length !== 2) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid 2-letter country code'
    });
  }

  if (!accountNumber || typeof accountNumber !== 'string' || accountNumber.trim().length < 3) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid account number'
    });
  }

  if (!bankCode || typeof bankCode !== 'string' || bankCode.trim().length < 1) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid bank or institution code'
    });
  }

  try {
    const resolution = await switchService.lookupInstitution({
      country: country.trim().toUpperCase(),
      accountNumber: accountNumber ? accountNumber.trim() : undefined,
      bankCode: bankCode ? bankCode.trim() : undefined,
      mobileNetwork: req.body.mobileNetwork ? String(req.body.mobileNetwork).trim() : undefined,
      phoneNumber: req.body.phoneNumber ? String(req.body.phoneNumber).trim() : undefined
    });

    res.json({
      success: true,
      data: resolution
    });
  } catch (resErr) {
    res.status(resErr.status || 400).json({
      success: false,
      error: resErr.message || 'Failed to verify account details with Switch'
    });
  }
}));

/**
 * @route   POST /api/wallet/quote
 * @desc    Get guaranteed on-ramp quote from fiat to USDC on Solana
 * @access  Private
 */
router.post('/quote', protect, catchAsync(async (req, res) => {
  const { amount, channel } = req.body;
  const { normalizeCountryCode, SWITCH_ONRAMP_ACTIVE, getCountryName, getDefaultCurrency } = require('../utils/countryUtils');

  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid funding amount greater than 0'
    });
  }

  // Derive country from request or fallback to user's saved signup country
  const rawCountry = req.body.country || req.user.countryCode || req.user.location?.country || 'NG';
  const cleanCountry = normalizeCountryCode(rawCountry);

  if (!cleanCountry) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid 2-letter country code'
    });
  }

  if (!SWITCH_ONRAMP_ACTIVE.has(cleanCountry)) {
    return res.status(400).json({
      success: false,
      error: `Local currency deposit is not currently supported for ${getCountryName(cleanCountry)}. Please use Direct Solana USDC funding.`
    });
  }

  const cleanCurrency = req.body.currency ? String(req.body.currency).trim().toUpperCase() : getDefaultCurrency(cleanCountry);

  try {
    const quote = await switchService.getOnrampQuote({
      amount: Number(amount),
      country: cleanCountry,
      currency: cleanCurrency,
      channel: channel ? channel.trim().toUpperCase() : undefined,
      developerFee: 1,
      developerRecipient: process.env.PLATFORM_WALLET_ADDRESS
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
 * @route   POST /api/wallet/withdraw/quote
 * @desc    Get guaranteed off-ramp quote from USDC on Solana to fiat
 * @access  Private
 */
router.post('/withdraw/quote', protect, catchAsync(async (req, res) => {
  const { amount, channel, exactOutput } = req.body;
  const { normalizeCountryCode, resolveEnvironment, SWITCH_OFFRAMP_SANDBOX_ACTIVE, SWITCH_OFFRAMP_SANDBOX_BLOCKED, getCountryName, getDefaultCurrency } = require('../utils/countryUtils');

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid withdrawal amount greater than 0'
    });
  }

  const rawCountry = req.body.country || req.user.countryCode || req.user.location?.country || 'NG';
  const cleanCountry = normalizeCountryCode(rawCountry);

  if (!cleanCountry) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid 2-letter country code'
    });
  }

  // Pre-flight environment check
  const currentEnv = resolveEnvironment();
  if (currentEnv === 'sandbox') {
    if (!SWITCH_OFFRAMP_SANDBOX_ACTIVE.has(cleanCountry)) {
      if (SWITCH_OFFRAMP_SANDBOX_BLOCKED.has(cleanCountry)) {
        return res.status(400).json({
          success: false,
          error: `Local currency payout for ${getCountryName(cleanCountry)} is awaiting Switch provider activation in this sandbox environment. Please withdraw via Direct Solana USDC.`
        });
      } else {
        return res.status(400).json({
          success: false,
          error: `Local currency payout is not supported for ${getCountryName(cleanCountry)}. Please withdraw via Direct Solana USDC.`
        });
      }
    }
  }

  const cleanCurrency = req.body.currency ? String(req.body.currency).trim().toUpperCase() : getDefaultCurrency(cleanCountry);

  // Find user's Switch wallet address if available
  const switchWallet = await SwitchWallet.findOne({ user: req.user._id });

  try {
    const quote = await switchService.getOfframpQuote({
      amount: numAmount,
      country: cleanCountry,
      currency: cleanCurrency,
      channel: channel ? channel.trim().toUpperCase() : undefined,
      wallet: switchWallet?.solanaAddress || undefined,
      exactOutput: Boolean(exactOutput),
      developerFee: 1,
      developerRecipient: process.env.PLATFORM_WALLET_ADDRESS
    });

    res.json({
      success: true,
      data: quote
    });
  } catch (quoteErr) {
    res.status(quoteErr.status || 400).json({
      success: false,
      error: quoteErr.message || 'Failed to fetch withdrawal quote from Switch'
    });
  }
}));

/**
 * @route   POST /api/wallet/withdraw/initiate
 * @desc    Initiate off-ramp payout withdrawal via Switch with atomic balance reservation
 * @access  Private
 */
router.post('/withdraw/initiate', protect, catchAsync(async (req, res) => {
  const { amount, country, currency, channel, beneficiary, idempotencyKey, narration, reason } = req.body;

  const result = await withdrawalService.initiateWithdrawal({
    user: req.user,
    amount,
    country,
    currency,
    channel,
    beneficiary,
    idempotencyKey,
    narration,
    reason
  });

  res.status(201).json(result);
}));

/**
 * @route   GET /api/wallet/withdraw/:reference
 * @desc    Get status and details of an off-ramp withdrawal attempt
 * @access  Private
 */
router.get('/withdraw/:reference', protect, catchAsync(async (req, res) => {
  const { reference } = req.params;

  try {
    const data = await withdrawalService.getWithdrawalStatus(reference, req.user._id);
    res.json({
      success: true,
      data
    });
  } catch (err) {
    res.status(err.status || 404).json({
      success: false,
      error: err.message || 'Withdrawal transaction not found'
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

  const rawCountry = req.body.country || req.user.countryCode || req.user.location?.country || 'NG';
  const { normalizeCountryCode, SWITCH_ONRAMP_ACTIVE, getCountryName, getDefaultCurrency } = require('../utils/countryUtils');
  const cleanCountry = normalizeCountryCode(rawCountry);

  if (!cleanCountry) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid 2-letter country code'
    });
  }

  if (!SWITCH_ONRAMP_ACTIVE.has(cleanCountry)) {
    return res.status(400).json({
      success: false,
      error: `Local currency deposit is not currently supported for ${getCountryName(cleanCountry)}. Please use Direct Solana USDC funding.`
    });
  }

  const cleanCurrency = req.body.currency ? String(req.body.currency).trim().toUpperCase() : getDefaultCurrency(cleanCountry);
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
    // Ensure an authoritative pending Transaction record exists in the ledger for transaction history
    const existingLedgerTx = await Transaction.findOne({
      user: req.user._id,
      $or: [
        { reference: existingTx.reference },
        { 'metadata.fundingTransactionId': existingTx._id }
      ]
    });

    if (!existingLedgerTx) {
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = crypto.randomBytes(3).toString('hex').toUpperCase();
      const usdcAmt = Number(existingTx.quotedUsdcAmount) || Number(existingTx.fiatAmount);

      await Transaction.create({
        transactionId: `TXN-DEP-${timestamp}-${random}`,
        user: req.user._id,
        type: 'deposit',
        amount: usdcAmt,
        netAmount: usdcAmt,
        currency: 'USDC',
        status: existingTx.status || 'pending',
        reference: existingTx.reference,
        paymentMethod: existingTx.channel === 'MOBILEMONEY' ? 'mobile_money' : 'bank_transfer',
        description: `Deposit: ${existingTx.fiatAmount} ${existingTx.fiatCurrency} -> ${usdcAmt} USDC`,
        blockchainNetwork: 'SOLANA',
        toAddress: existingTx.destinationAddress,
        paymentDetails: {
          accountNumber: existingTx.depositDetails?.accountNumber,
          accountName: existingTx.depositDetails?.accountName,
          bankName: existingTx.depositDetails?.bankName,
          targetCurrency: existingTx.fiatCurrency,
          targetAmount: existingTx.fiatAmount,
          exchangeRate: existingTx.quoteRate,
          reference: existingTx.reference
        },
        metadata: {
          provider: 'switch',
          fundingTransactionId: existingTx._id,
          fiatCurrency: existingTx.fiatCurrency,
          fiatAmount: existingTx.fiatAmount,
          quoteRate: existingTx.quoteRate,
          quotedUsdcAmount: existingTx.quotedUsdcAmount,
          channel: existingTx.channel,
          country: existingTx.country,
          switchReference: existingTx.switchReference
        }
      });
    }

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
    channel: cleanChannel,
    developerFee: 1,
    developerRecipient: process.env.PLATFORM_WALLET_ADDRESS
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
      payer: payer || undefined,
      developerFee: 1,
      developerRecipient: process.env.PLATFORM_WALLET_ADDRESS
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

  // 6. Create corresponding pending Transaction record so it immediately appears in transaction history
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  const usdcAmt = Number(quote.destination?.amount) || numAmount;

  await Transaction.create({
    transactionId: `TXN-DEP-${timestamp}-${random}`,
    user: req.user._id,
    type: 'deposit',
    amount: usdcAmt,
    netAmount: usdcAmt,
    currency: 'USDC',
    status: 'pending',
    reference,
    paymentMethod: cleanChannel === 'MOBILEMONEY' ? 'mobile_money' : 'bank_transfer',
    description: `Deposit: ${numAmount} ${cleanCurrency} -> ${usdcAmt} USDC`,
    blockchainNetwork: 'SOLANA',
    toAddress: switchWallet.solanaAddress,
    paymentDetails: {
      accountNumber: deposit.accountNumber,
      accountName: deposit.accountName,
      bankName: deposit.bankName,
      targetCurrency: cleanCurrency,
      targetAmount: numAmount,
      exchangeRate: quote.rate,
      reference
    },
    metadata: {
      provider: 'switch',
      fundingTransactionId: fundingTx._id,
      fiatCurrency: cleanCurrency,
      fiatAmount: numAmount,
      quoteRate: quote.rate,
      quotedUsdcAmount: usdcAmt,
      channel: cleanChannel,
      country: cleanCountry,
      switchReference: initiateResult.reference || reference
    }
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
        if (switchStatus === 'PROCESSING') {
          fundingTx.status = 'processing';
          await Transaction.findOneAndUpdate(
            { reference: fundingTx.reference, user: req.user._id },
            { status: 'processing', processedAt: new Date() }
          );
        }
        if (switchStatus === 'COMPLETED') {
          fundingTx.status = 'completed';
          await fundingTx.save();
          // Phase 5 settlement accounting: Idempotent balance credit
          await ledgerService.creditFundingDeposit(fundingTx);
        } else {
          if (switchStatus === 'FAILED') {
            fundingTx.status = 'failed';
            await Transaction.findOneAndUpdate(
              { reference: fundingTx.reference, user: req.user._id },
              { status: 'failed', failedAt: new Date() }
            );
          }
          if (switchStatus === 'REVERSED') {
            fundingTx.status = 'reversed';
            await Transaction.findOneAndUpdate(
              { reference: fundingTx.reference, user: req.user._id },
              { status: 'failed', failedAt: new Date() }
            );
          }
          await fundingTx.save();
        }
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

/**
 * @route   GET /api/wallet/solana/deposit-instructions
 * @desc    Get verified direct Solana USDC deposit instructions and recipient address
 * @access  Private
 */
router.get('/solana/deposit-instructions', protect, catchAsync(async (req, res) => {
  const instructions = await solanaDepositService.getDepositInstructions(req.user._id);
  res.json({
    success: true,
    data: instructions
  });
}));

/**
 * @route   POST /api/wallet/solana/verify-deposit
 * @desc    Verify on-chain Solana USDC transfer server-side and credit balance exactly once
 * @access  Private
 */
router.post('/solana/verify-deposit', protect, catchAsync(async (req, res) => {
  const { signature, mockData } = req.body;

  if (!signature || typeof signature !== 'string' || signature.trim().length < 32) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid Solana transaction signature'
    });
  }

  // Allow mockData only in non-production test/sandbox environments
  const isTestEnv = process.env.NODE_ENV === 'test' || process.env.SOLANA_NETWORK === 'sandbox';
  const simulation = isTestEnv && mockData ? mockData : null;

  try {
    const result = await solanaDepositService.verifyAndCreditDeposit(
      req.user._id,
      signature.trim(),
      simulation
    );

    res.status(result.alreadyCredited ? 200 : 201).json(result);
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message || 'Failed to verify Solana transaction'
    });
  }
}));

/**
 * @route   GET /api/wallet/solana/deposits
 * @desc    Get user's direct Solana USDC deposit history
 * @access  Private
 */
router.get('/solana/deposits', protect, catchAsync(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;

  const result = await solanaDepositService.getUserDeposits(req.user._id, page, limit);

  res.json({
    success: true,
    data: result
  });
}));

/**
 * @route   POST /api/wallet/withdraw/solana
 * @desc    Direct Solana USDC withdrawal to external user wallet address
 * @access  Private
 */
router.post('/withdraw/solana', protect, catchAsync(async (req, res) => {
  const { amount, solanaAddress } = req.body;
  const numAmount = parseFloat(Number(amount).toFixed(6));

  const minWithdrawal = parseFloat(process.env.MINIMUM_WITHDRAWAL) || 1;
  if (isNaN(numAmount) || numAmount < minWithdrawal) {
    return res.status(400).json({
      success: false,
      error: `Please provide a valid withdrawal amount of at least ${minWithdrawal} USDC`
    });
  }

  const cleanAddress = String(solanaAddress || '').trim();
  if (!cleanAddress || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(cleanAddress)) {
    return res.status(400).json({
      success: false,
      error: 'Please provide a valid Solana wallet address (32-44 base58 characters)'
    });
  }

  // 1. Atomically reserve balance (throws if availableBalance < numAmount)
  await ledgerService.reserveWithdrawalBalance(req.user._id, numAmount);

  // 2. Generate unique reference and transaction ID
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  const transactionId = `TXN-SOL-WTH-${timestamp}-${random}`;
  const reference = crypto.randomUUID();

  // 3. Atomically finalize balance debit and clear pending reservation
  const updatedUser = await User.findOneAndUpdate(
    {
      _id: req.user._id,
      $expr: {
        $and: [
          { $gte: [{ $ifNull: ['$wallet.balance', '$balance'] }, numAmount] },
          { $gte: [{ $ifNull: ['$wallet.pendingWithdrawal', 0] }, numAmount] }
        ]
      }
    },
    {
      $inc: {
        'wallet.balance': -numAmount,
        'balance': -numAmount,
        'wallet.pendingWithdrawal': -numAmount,
        'pendingWithdrawal': -numAmount
      },
      $set: {
        'wallet.lastUpdated': new Date(),
        'lastUpdated': new Date()
      }
    },
    { new: true }
  );

  // 4. Create authoritative completed transaction record in ledger
  const ledgerTx = await Transaction.create({
    transactionId,
    user: req.user._id,
    type: 'withdrawal',
    amount: numAmount,
    netAmount: numAmount,
    currency: 'USDC',
    status: 'completed',
    reference,
    paymentMethod: 'crypto',
    description: `Direct Solana USDC Withdrawal to ${cleanAddress.slice(0, 4)}...${cleanAddress.slice(-4)}`,
    blockchainNetwork: 'SOLANA',
    toAddress: cleanAddress,
    metadata: {
      provider: 'solana_direct',
      destinationAddress: cleanAddress,
      network: 'SOLANA',
      token: 'USDC'
    },
    completedAt: new Date()
  });

  const finalBal = updatedUser?.wallet?.balance !== undefined ? updatedUser.wallet.balance : updatedUser?.balance;

  res.status(201).json({
    success: true,
    message: `Successfully withdrew ${numAmount} USDC to Solana wallet`,
    data: {
      reference,
      transactionId,
      amount: numAmount,
      currency: 'USDC',
      toAddress: cleanAddress,
      status: 'completed',
      balance: finalBal,
      ledgerTx
    }
  });
}));

module.exports = router;
