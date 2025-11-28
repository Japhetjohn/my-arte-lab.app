const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { successResponse } = require('../utils/apiResponse');
const { ErrorHandler, catchAsync } = require('../utils/errorHandler');
const breadService = require('../services/breadService');
const breadConfig = require('../config/bread');
const adminNotificationService = require('../services/adminNotificationService');

exports.getWallet = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  // Wallet balance is managed through bread.africa webhooks
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
// Users should now use bread.africa offramp methods (bank or mobile money)
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

// ============= bread.africa Account Initialization =============

/**
 * Initialize bread.africa account for a user
 * Creates wallet for withdrawals (offramp only)
 * Called during user registration
 *
 * NOTE: bread.africa user creation is for service accounts, not end users
 * We use our service key and create wallets with user references
 */
exports.initializeBreadAccount = async (userId, userName, userEmail) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Skip if already initialized
    if (user.wallet.breadWalletId) {
      console.log(`bread.africa wallet already initialized for user ${userId}`);
      return {
        breadWalletId: user.wallet.breadWalletId
      };
    }

    // Create bread.africa wallet with user ID as reference
    const breadWallet = await breadService.createWallet(
      userId.toString(),
      'basic'  // Basic wallet type for withdrawals
    );

    // Update user model with bread.africa details
    user.wallet.breadWalletId = breadWallet.walletId;

    await user.save({ validateBeforeSave: false });

    console.log(`bread.africa wallet initialized for user ${userId}: ${breadWallet.walletId}`);

    return {
      breadWalletId: breadWallet.walletId,
      evmAddress: breadWallet.evmAddress,
      svmAddress: breadWallet.svmAddress
    };

  } catch (error) {
    console.error('Failed to initialize bread.africa wallet:', error.message);
    // Don't throw - allow registration to proceed even if bread initialization fails
    // User can retry later or admin can manually initialize
    return null;
  }
};

/**
 * Ensure user has bread.africa identity (KYC)
 * For MVP: Creates basic identity without BVN/NIN
 * TODO: Add proper KYC flow with BVN/NIN verification
 */
const ensureBreadIdentity = async (user) => {
  if (user.wallet.breadIdentityId) {
    return user.wallet.breadIdentityId;
  }

  try {
    // Create basic identity (link type - no BVN/NIN required for MVP)
    const identity = await breadService.createIdentity('link', user.name, {
      email: user.email
    });

    user.wallet.breadIdentityId = identity.identityId;
    await user.save({ validateBeforeSave: false });

    console.log(`bread.africa identity created for user ${user._id}: ${identity.identityId}`);
    return identity.identityId;

  } catch (error) {
    console.error('Failed to create bread.africa identity:', error.message);
    throw new Error('Failed to initialize identity. Please contact support.');
  }
};

// ============= bread.africa Exchange Rate =============

/**
 * Get exchange rate for offramp (crypto to fiat)
 */
exports.getExchangeRate = catchAsync(async (req, res, next) => {
  const { currency = 'NGN' } = req.query;

  try {
    // Crypto to fiat rate for offramp
    const rateData = await breadService.getOfframpRate(currency);

    successResponse(res, 200, 'Exchange rate retrieved successfully', {
      type: 'offramp',
      currency,
      rate: rateData.rate,
      note: `1 ${currency} ≈ ${(1 / rateData.rate).toFixed(6)} USDC`
    });

  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});

/**
 * Get offramp quote (real-time estimate with fees)
 * This is a lightweight estimate endpoint that doesn't create resources
 * Uses exchange rate API for quick calculations
 */
exports.getOfframpQuote = catchAsync(async (req, res, next) => {
  const { amount, currency = 'NGN' } = req.body;

  if (!amount || amount < 1) {
    return next(new ErrorHandler('Valid amount is required (minimum $1 USDC)', 400));
  }

  try {
    // Get current exchange rate from bread.africa
    const rateData = await breadService.getOfframpRate(currency);

    // Calculate estimated output amount
    // Note: This is an estimate. Actual amount may vary due to fees and rate fluctuations
    const estimatedOutput = amount * rateData.rate;

    // Estimate fee (bread.africa typically charges ~1-2% for offramp)
    const estimatedFee = amount * 0.015; // 1.5% estimated fee
    const estimatedOutputAfterFees = (amount - estimatedFee) * rateData.rate;

    successResponse(res, 200, 'Estimate retrieved successfully', {
      inputAmount: amount,
      outputAmount: estimatedOutputAfterFees,
      estimatedBeforeFees: estimatedOutput,
      currency,
      rate: rateData.rate,
      estimatedFee: estimatedFee,
      note: 'This is an estimate. Final amount will be calculated at withdrawal time.'
    });

  } catch (error) {
    console.error('Failed to get estimate:', error.message);
    return next(new ErrorHandler(error.message, 500));
  }
});

// ============= bread.africa Offramp Methods =============

exports.requestBankWithdrawal = catchAsync(async (req, res, next) => {
  const { amountUSDC, currency = 'NGN', country = 'NG', bankDetails } = req.body;
  const user = await User.findById(req.user._id);

  // Both creators AND clients can withdraw funds

  // Validation
  const validation = breadConfig.validateOfframpAmount(amountUSDC);
  if (!validation.valid) {
    return next(new ErrorHandler(validation.error, 400));
  }

  if (user.wallet.balance < amountUSDC) {
    return next(new ErrorHandler('Insufficient balance', 400));
  }

  // Validate country support
  if (!breadConfig.isCountrySupported(country)) {
    return next(new ErrorHandler(`Country ${country} is not supported`, 400));
  }

  const countryConfig = breadConfig.getCountryConfig(country);

  // Validate bank details based on country
  if (!bankDetails || typeof bankDetails !== 'object') {
    return next(new ErrorHandler(`Bank details are required. Required fields for ${countryConfig.name}: ${countryConfig.fields.join(', ')}`, 400));
  }

  // Check required fields for country
  const missingFields = countryConfig.fields.filter(field => !bankDetails[field]);
  if (missingFields.length > 0) {
    return next(new ErrorHandler(`Missing required fields for ${countryConfig.name}: ${missingFields.join(', ')}`, 400));
  }

  if (!user.wallet.breadWalletId) {
    return next(new ErrorHandler('bread.africa wallet not initialized. Please contact support.', 400));
  }

  try {
    // Step 1: Verify bank account (if applicable for the country)
    let accountInfo;
    if (country === 'NG' && bankDetails.bank_code && bankDetails.account_number) {
      accountInfo = await breadService.lookupAccount(bankDetails.bank_code, bankDetails.account_number);
    }

    // Step 2: Ensure user has identity (KYC)
    const identityId = await ensureBreadIdentity(user);

    // Step 3: Create unique fingerprint for beneficiary based on bank details
    const beneficiaryFingerprint = JSON.stringify({ country, currency, ...bankDetails });

    // Step 4: Check if beneficiary already exists
    let beneficiary = user.wallet.beneficiaries?.find(
      b => b.country === country &&
           b.currency === currency &&
           JSON.stringify(b.bankDetails) === JSON.stringify(bankDetails) &&
           b.breadBeneficiaryId
    );

    // Step 5: Create beneficiary if not exists
    if (!beneficiary || !beneficiary.breadBeneficiaryId) {
      const breadBeneficiary = await breadService.createBeneficiary(
        identityId,
        currency,
        bankDetails
      );

      // Save beneficiary to user model
      if (!user.wallet.beneficiaries) {
        user.wallet.beneficiaries = [];
      }

      const newBeneficiary = {
        breadBeneficiaryId: breadBeneficiary.beneficiaryId,
        type: 'bank_account',
        country,
        currency,
        bankDetails: breadBeneficiary.details || bankDetails,
        accountName: accountInfo?.accountName || breadBeneficiary.accountName || bankDetails.account_name,
        accountNumber: bankDetails.account_number,
        isDefault: user.wallet.beneficiaries.length === 0
      };

      user.wallet.beneficiaries.push(newBeneficiary);
      await user.save({ validateBeforeSave: false });

      beneficiary = newBeneficiary;
    }

    // Step 6: Get exchange rate quote
    const quote = await breadService.getOfframpQuote(
      user.wallet.breadWalletId,
      amountUSDC,
      'base:usdc',  // Use asset ID format
      beneficiary.breadBeneficiaryId,
      currency
    );

    // Step 7: Execute offramp
    const offrampResult = await breadService.executeOfframp(
      user.wallet.breadWalletId,
      amountUSDC,
      'base:usdc',  // Use asset ID format
      beneficiary.breadBeneficiaryId,
      currency
    );

    // Step 8: Create transaction record
    const transaction = await Transaction.create({
      user: user._id,
      type: 'offramp',
      amount: amountUSDC,
      currency: 'USDC',
      fiatAmount: quote.outputAmount,
      fiatCurrency: currency,
      exchangeRate: quote.rate,
      paymentMethod: 'bank_transfer',
      status: 'processing',
      breadTransactionId: offrampResult.transactionId,
      breadQuoteId: quote.quoteId,
      breadWalletId: user.wallet.breadWalletId,
      breadBeneficiaryId: beneficiary.breadBeneficiaryId,
      description: `Bank withdrawal to ${countryConfig.name}`,
      fromAddress: user.wallet.address,
      paymentDetails: {
        country: countryConfig.name,
        currency,
        bankDetails: beneficiary.bankDetails,
        beneficiaryAccountName: beneficiary.accountName,
        reference: offrampResult.reference
      }
    });

    // Step 8: Update user balance
    user.wallet.balance -= amountUSDC;
    user.wallet.pendingBalance += amountUSDC;
    await user.save({ validateBeforeSave: false });

    // Step 9: Notify admin
    adminNotificationService.notifyWithdrawal(user, amountUSDC, 'USDC')
      .catch(err => console.error('Admin notification failed:', err));

    successResponse(res, 200, 'Bank withdrawal request submitted successfully', {
      transaction,
      amountUSDC,
      fiatAmount: quote.outputAmount,
      fiatCurrency: currency,
      exchangeRate: quote.rate,
      fee: quote.fee,
      country: countryConfig.name,
      beneficiary: {
        accountName: beneficiary.accountName,
        accountNumber: beneficiary.accountNumber,
        country: countryConfig.name,
        currency
      }
    });

  } catch (error) {
    console.error('Bank withdrawal error:', error.message);
    return next(new ErrorHandler(error.message, 500));
  }
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

exports.getSupportedBanks = catchAsync(async (req, res, next) => {
  try {
    const banks = await breadService.getBanks('NGN');

    successResponse(res, 200, 'Banks retrieved successfully', {
      banks,
      count: banks.length
    });

  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});

exports.verifyBankAccount = catchAsync(async (req, res, next) => {
  const { bankCode, accountNumber } = req.body;

  if (!bankCode || !accountNumber) {
    return next(new ErrorHandler('Bank code and account number are required', 400));
  }

  // Validate account number format
  if (accountNumber.length !== 10) {
    return next(new ErrorHandler('Account number must be 10 digits', 400));
  }

  try {
    console.log(`Verifying account: ${accountNumber} with bank code: ${bankCode}`);
    const accountInfo = await breadService.lookupAccount(bankCode, accountNumber);

    successResponse(res, 200, 'Bank account verified successfully', {
      accountName: accountInfo.accountName,
      accountNumber: accountInfo.accountNumber,
      bankName: accountInfo.bankName,
      bankCode: accountInfo.bankCode
    });

  } catch (error) {
    console.error('Bank verification error:', error.response?.data || error.message);

    // Handle specific error responses from bread.africa
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.message;

      if (status === 404) {
        return next(new ErrorHandler('Account not found. Please check the account number and bank selected.', 404));
      } else if (status === 400) {
        return next(new ErrorHandler(message || 'Invalid account details provided.', 400));
      } else if (status === 401) {
        return next(new ErrorHandler('Authentication failed. Please contact support.', 500));
      }
    }

    return next(new ErrorHandler('Unable to verify account at this time. Please try again.', 500));
  }
});
