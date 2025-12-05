const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { successResponse } = require('../utils/apiResponse');
const { ErrorHandler, catchAsync } = require('../utils/errorHandler');
const switchService = require('../services/switchService');
const switchConfig = require('../config/switch');
const adminNotificationService = require('../services/adminNotificationService');

exports.getWallet = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  
  // No need for manual sync as balance updates happen automatically via webhooks

  successResponse(res, 200, 'Wallet retrieved successfully', {
    wallet: user.wallet
  });
});

exports.getTransactions = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20 } = req.query;

  const transactions = await Transaction.getUserTransactions(
    req.user._id,
    parseInt(limit),
    (parseInt(page) - 1) * parseInt(limit)
  );

  const total = await Transaction.countDocuments({ user: req.user._id });

  successResponse(res, 200, 'Transactions retrieved successfully', {
    transactions,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
});

// Legacy crypto withdrawal endpoint - Deprecated

exports.requestWithdrawal = catchAsync(async (req, res, next) => {
  return next(new ErrorHandler(
    'Direct crypto withdrawals are no longer supported. Please use Bank Withdrawal or Mobile Money Withdrawal instead.',
    400
  ));
});

exports.getBalanceSummary = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  const summary = await Transaction.getUserBalanceSummary(user._id);

  successResponse(res, 200, 'Balance summary retrieved successfully', {
    wallet: user.wallet,
    summary
  });
});

// ============= Beneficiary Management =============

exports.getBeneficiaries = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  successResponse(res, 200, 'Beneficiaries retrieved successfully', {
    beneficiaries: user.wallet.beneficiaries || []
  });
});

exports.addBeneficiary = catchAsync(async (req, res, next) => {
  const { type, accountNumber, accountName, bankCode, bankName, phoneNumber, provider, isDefault } = req.body;
  const user = await User.findById(req.user._id);

  if (!type || !['bank_account', 'mobile_money'].includes(type)) {
    return next(new ErrorHandler('Valid beneficiary type is required (bank_account or mobile_money)', 400));
  }

  if (type === 'bank_account') {
    if (!accountNumber || !accountName || !bankCode) {
      return next(new ErrorHandler('Account number, account name, and bank code are required for bank accounts', 400));
    }
  } else if (type === 'mobile_money') {
    if (!phoneNumber || !provider) {
      return next(new ErrorHandler('Phone number and provider are required for mobile money', 400));
    }
  }

  if (!user.wallet.beneficiaries) {
    user.wallet.beneficiaries = [];
  }

  if (isDefault) {
    user.wallet.beneficiaries.forEach(b => b.isDefault = false);
  }

  const newBeneficiary = {
    type,
    accountNumber,
    accountName,
    bankCode,
    bankName,
    phoneNumber,
    provider,
    isDefault: isDefault || false
  };

  user.wallet.beneficiaries.push(newBeneficiary);
  await user.save();

  const addedBeneficiary = user.wallet.beneficiaries[user.wallet.beneficiaries.length - 1];

  successResponse(res, 201, 'Beneficiary added successfully', {
    beneficiary: addedBeneficiary
  });
});

exports.deleteBeneficiary = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const user = await User.findById(req.user._id);

  if (!user.wallet.beneficiaries || user.wallet.beneficiaries.length === 0) {
    return next(new ErrorHandler('No beneficiaries found', 404));
  }

  const beneficiaryIndex = user.wallet.beneficiaries.findIndex(b => b.id === id);

  if (beneficiaryIndex === -1) {
    return next(new ErrorHandler('Beneficiary not found', 404));
  }

  user.wallet.beneficiaries.splice(beneficiaryIndex, 1);
  await user.save();

  successResponse(res, 200, 'Beneficiary deleted successfully');
});

// ============= Utility Methods =============

// ============= Switch Global Offramp Methods =============

/**
 * Get all supported countries for offramp
 */
exports.getSwitchCountries = catchAsync(async (req, res, next) => {
  try {
    const coverage = await switchService.getCoverage('OFFRAMP');

    successResponse(res, 200, 'Countries fetched successfully', {
      countries: coverage,
      count: coverage.length
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});

/**
 * Get banks for a specific country
 */
exports.getSwitchBanksByCountry = catchAsync(async (req, res, next) => {
  const { country } = req.params;

  if (!country || country.length !== 2) {
    return next(new ErrorHandler('Invalid country code. Use ISO 3166-1 alpha-2 format (e.g., NG, US)', 400));
  }

  try {
    const institutions = await switchService.getInstitutions(country.toUpperCase());

    successResponse(res, 200, 'Banks fetched successfully', {
      country: country.toUpperCase(),
      banks: institutions,
      count: institutions.length
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});

/**
 * Get field requirements for a country
 */
exports.getSwitchRequirements = catchAsync(async (req, res, next) => {
  const { country, type = 'INDIVIDUAL', currency } = req.query;

  if (!country) {
    return next(new ErrorHandler('Country code is required', 400));
  }

  try {
    const requirements = await switchService.getRequirements(
      country.toUpperCase(),
      'OFFRAMP',
      type,
      currency
    );

    successResponse(res, 200, 'Requirements fetched successfully', {
      country: country.toUpperCase(),
      type,
      requirements
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});

/**
 * Get offramp quote via Switch
 */
exports.getSwitchOfframpQuote = catchAsync(async (req, res, next) => {
  const { amount, country, asset = 'solana:usdc', currency } = req.body;

  if (!amount || amount < 1) {
    return next(new ErrorHandler('Amount must be at least 1 USDC', 400));
  }

  if (!country) {
    return next(new ErrorHandler('Country code is required', 400));
  }

  try {
    const quote = await switchService.getOfframpQuote(
      amount,
      country.toUpperCase(),
      asset,
      currency
    );

    successResponse(res, 200, 'Quote retrieved successfully', quote);
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});

/**
 * Execute offramp withdrawal via Switch
 */
exports.requestSwitchOfframp = catchAsync(async (req, res, next) => {
  const {
    amount,
    country,
    currency,
    asset = 'solana:usdc',
    beneficiary
  } = req.body;

  // Validation
  if (!amount || amount < 1) {
    return next(new ErrorHandler('Amount must be at least 1 USDC', 400));
  }

  if (!country) {
    return next(new ErrorHandler('Country code is required', 400));
  }

  if (!beneficiary || !beneficiary.holderName || !beneficiary.accountNumber || !beneficiary.bankCode) {
    return next(new ErrorHandler('Complete beneficiary details are required', 400));
  }

  const user = await User.findById(req.user._id);

  // Check balance
  if (user.wallet.balance < amount) {
    return next(new ErrorHandler('Insufficient balance', 400));
  }

  try {
    // Generate unique reference
    const reference = `SWITCH_${Date.now()}_${user._id.toString().slice(-6)}`;

    // Execute offramp
    const result = await switchService.executeOfframp({
      amount,
      country: country.toUpperCase(),
      asset,
      currency,
      beneficiary,
      reference,
      callbackUrl: `${process.env.API_URL || 'http://localhost:5000'}/api/webhooks/switch/offramp`,
      senderName: user.name
    });

    // Deduct from balance (will be refunded if fails via webhook)
    await user.updateWalletBalance(amount, 'subtract');

    // Create transaction record
    const transaction = await Transaction.create({
      user: user._id,
      type: 'withdrawal',
      amount,
      currency: currency || 'Local',
      status: 'pending',
      reference,
      metadata: {
        provider: 'switch',
        country: country.toUpperCase(),
        asset,
        beneficiary: {
          holderName: beneficiary.holderName,
          accountNumber: beneficiary.accountNumber.slice(-4),
          bankCode: beneficiary.bankCode
        }
      }
    });

    // Notify admin
    adminNotificationService.notifyWithdrawal(user, transaction)
      .catch(err => console.error('Admin notification failed:', err));

    successResponse(res, 200, 'Withdrawal initiated successfully', {
      transaction: {
        id: transaction._id,
        reference,
        amount,
        currency: currency || 'Local',
        country: country.toUpperCase(),
        status: 'pending'
      },
      message: 'Your withdrawal is being processed. You will be notified once complete.'
    });
  } catch (error) {
    console.error('Switch offramp error:', error);
    return next(new ErrorHandler(error.message, 500));
  }
});

// ============= Switch Onramp (Deposit) =============

/**
 * Get onramp quote (fiat to crypto)
 */
exports.getSwitchOnrampQuote = catchAsync(async (req, res, next) => {
  const { amount, country, asset = 'solana:usdc', currency } = req.body;

  // Validation
  if (!amount || amount < 1) {
    return next(new ErrorHandler('Amount must be at least 1', 400));
  }

  if (!country) {
    return next(new ErrorHandler('Country code is required', 400));
  }

  try {
    const quote = await switchService.getOnrampQuote(
      amount,
      country.toUpperCase(),
      asset,
      currency
    );

    successResponse(res, 200, 'Onramp quote retrieved successfully', quote);
  } catch (error) {
    console.error('Switch onramp quote error:', error);
    return next(new ErrorHandler(error.message, 500));
  }
});

/**
 * Execute onramp deposit (fiat to crypto)
 * Creates virtual account for user to deposit fiat
 */
exports.requestSwitchOnramp = catchAsync(async (req, res, next) => {
  const { amount, country, currency, asset = 'solana:usdc' } = req.body;

  // Validation
  if (!amount || amount < 1) {
    return next(new ErrorHandler('Minimum deposit amount is 1', 400));
  }

  if (!country) {
    return next(new ErrorHandler('Country code is required', 400));
  }

  const user = await User.findById(req.user._id);

  // Use user's wallet address as recipient
  const walletAddress = user.wallet.address;

  if (!walletAddress || walletAddress.startsWith('pending_')) {
    return next(new ErrorHandler('Wallet not initialized. Please contact support.', 400));
  }

  try {
    // Generate unique reference
    const reference = `ONRAMP_${Date.now()}_${user._id.toString().slice(-6)}`;

    // Execute onramp - gets virtual account details
    const result = await switchService.executeOnramp({
      amount,
      country: country.toUpperCase(),
      asset,
      currency,
      walletAddress,
      reference,
      callbackUrl: `${process.env.API_URL || 'http://localhost:5000'}/api/webhooks/switch/onramp`,
      holderName: user.name
    });

    // Create transaction record (pending status)
    const transaction = await Transaction.create({
      user: user._id,
      type: 'deposit',
      amount: result.data?.destination?.amount || amount, // Crypto amount
      currency: currency || 'Local',
      status: 'pending',
      reference,
      metadata: {
        provider: 'switch',
        country: country.toUpperCase(),
        asset,
        fiatAmount: amount,
        fiatCurrency: currency || result.data?.source?.currency,
        virtualAccount: result.data?.deposit || {}
      }
    });

    // Notify admin
    adminNotificationService.notifyDeposit(user, transaction)
      .catch(err => console.error('Admin notification failed:', err));

    successResponse(res, 200, 'Deposit initiated successfully', {
      transaction: {
        id: transaction._id,
        reference,
        status: 'pending',
        country: country.toUpperCase()
      },
      virtualAccount: result.data?.deposit || {},
      instructions: 'Please transfer the exact amount to the account details provided. Your wallet will be credited once payment is confirmed.',
      quote: {
        fiatAmount: amount,
        fiatCurrency: currency || result.data?.source?.currency,
        cryptoAmount: result.data?.destination?.amount,
        asset: asset,
        rate: result.data?.rate
      }
    });
  } catch (error) {
    console.error('Switch onramp error:', error);
    return next(new ErrorHandler(error.message, 500));
  }
});
