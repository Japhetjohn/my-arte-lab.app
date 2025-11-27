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
 * Creates user, wallet, and virtual account for deposits
 * Called during user registration
 */
exports.initializeBreadAccount = async (userId, userName, userEmail) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Skip if already initialized
    if (user.wallet.breadUserId && user.wallet.breadWalletId) {
      console.log(`bread.africa account already initialized for user ${userId}`);
      return {
        breadUserId: user.wallet.breadUserId,
        breadWalletId: user.wallet.breadWalletId,
        virtualAccount: user.wallet.virtualAccount
      };
    }

    // Step 1: Create bread.africa user
    const breadUser = await breadService.createUser(
      userId.toString(),  // Use platform user ID as reference
      userName,
      userEmail
    );

    // Step 2: Create bread.africa wallet (returns virtual account for deposits)
    const breadWallet = await breadService.createWallet(
      userId.toString(),
      'basic'  // Basic wallet type for deposits and withdrawals
    );

    // Step 3: Update user model with bread.africa details
    user.wallet.breadUserId = breadUser.userId;
    user.wallet.breadWalletId = breadWallet.walletId;

    if (breadWallet.virtualAccount) {
      user.wallet.virtualAccount = {
        accountNumber: breadWallet.virtualAccount.accountNumber,
        accountName: breadWallet.virtualAccount.accountName,
        bankName: breadWallet.virtualAccount.bankName,
        bankCode: breadWallet.virtualAccount.bankCode,
        currency: breadWallet.virtualAccount.currency
      };
    }

    await user.save({ validateBeforeSave: false });

    console.log(`bread.africa account initialized for user ${userId}: wallet ${breadWallet.walletId}`);

    return {
      breadUserId: breadUser.userId,
      breadWalletId: breadWallet.walletId,
      virtualAccount: user.wallet.virtualAccount
    };

  } catch (error) {
    console.error('Failed to initialize bread.africa account:', error.message);
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

// ============= bread.africa Onramp Methods =============

/**
 * Get virtual account details for deposits (onramp)
 * Users deposit NGN to this account, bread.africa auto-converts to USDC
 */
exports.getVirtualAccount = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  if (!user.wallet.virtualAccount) {
    return next(new ErrorHandler('Virtual account not initialized. Please contact support.', 400));
  }

  successResponse(res, 200, 'Virtual account retrieved successfully', {
    virtualAccount: user.wallet.virtualAccount,
    instructions: {
      step1: 'Transfer NGN to the account details above from your bank app',
      step2: 'bread.africa will automatically convert NGN to USDC',
      step3: 'Your wallet balance will be credited within minutes',
      minimumDeposit: 'NGN 1,000',
      note: 'Use your bank app or USSD to transfer funds'
    }
  });
});

/**
 * Get offramp exchange rate (crypto to fiat)
 */
exports.getExchangeRate = catchAsync(async (req, res, next) => {
  const { asset = 'USDC', currency = 'NGN', amount } = req.query;

  if (!amount) {
    return next(new ErrorHandler('amount parameter is required', 400));
  }

  try {
    const rateData = await breadService.getOfframpRate(asset, currency, parseFloat(amount));

    successResponse(res, 200, 'Exchange rate retrieved successfully', {
      asset,
      currency,
      amount: parseFloat(amount),
      rate: rateData.rate,
      estimatedOutput: parseFloat(amount) * rateData.rate,
      expiresAt: rateData.expiresAt
    });

  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});

// ============= bread.africa Offramp Methods =============

exports.requestBankWithdrawal = catchAsync(async (req, res, next) => {
  const { amountUSDC, bankCode, accountNumber } = req.body;
  const user = await User.findById(req.user._id);

  // Validation
  if (user.role !== 'creator') {
    return next(new ErrorHandler('Only creators can withdraw funds', 403));
  }

  const validation = breadConfig.validateOfframpAmount(amountUSDC);
  if (!validation.valid) {
    return next(new ErrorHandler(validation.error, 400));
  }

  if (user.wallet.balance < amountUSDC) {
    return next(new ErrorHandler('Insufficient balance', 400));
  }

  if (!bankCode || !accountNumber) {
    return next(new ErrorHandler('Bank code and account number are required', 400));
  }

  if (!user.wallet.breadWalletId) {
    return next(new ErrorHandler('bread.africa wallet not initialized. Please contact support.', 400));
  }

  try {
    // Step 1: Verify bank account and get account name
    const accountInfo = await breadService.lookupAccount(bankCode, accountNumber);

    // Step 2: Ensure user has identity (KYC)
    const identityId = await ensureBreadIdentity(user);

    // Step 3: Check if beneficiary already exists
    let beneficiary = user.wallet.beneficiaries?.find(
      b => b.type === 'bank_account' &&
           b.accountNumber === accountNumber &&
           b.bankCode === bankCode &&
           b.breadBeneficiaryId
    );

    // Step 4: Create beneficiary if not exists
    if (!beneficiary || !beneficiary.breadBeneficiaryId) {
      const breadBeneficiary = await breadService.createBeneficiary(
        identityId,
        'NGN',
        accountNumber,
        bankCode
      );

      // Save beneficiary to user model
      if (!user.wallet.beneficiaries) {
        user.wallet.beneficiaries = [];
      }

      const newBeneficiary = {
        breadBeneficiaryId: breadBeneficiary.beneficiaryId,
        type: 'bank_account',
        accountNumber: breadBeneficiary.accountNumber,
        accountName: breadBeneficiary.accountName,
        bankCode: breadBeneficiary.bankCode,
        bankName: breadBeneficiary.bankName,
        isDefault: user.wallet.beneficiaries.length === 0
      };

      user.wallet.beneficiaries.push(newBeneficiary);
      await user.save({ validateBeforeSave: false });

      beneficiary = newBeneficiary;
    }

    // Step 5: Get exchange rate quote
    const quote = await breadService.getOfframpQuote(
      user.wallet.breadWalletId,
      amountUSDC,
      'USDC',
      beneficiary.breadBeneficiaryId
    );

    // Step 6: Execute offramp
    const offrampResult = await breadService.executeOfframp(
      user.wallet.breadWalletId,
      amountUSDC,
      'USDC',
      beneficiary.breadBeneficiaryId,
      quote.quoteId
    );

    // Step 7: Create transaction record
    const transaction = await Transaction.create({
      user: user._id,
      type: 'offramp',
      amount: amountUSDC,
      currency: 'USDC',
      fiatAmount: quote.outputAmount,
      fiatCurrency: 'NGN',
      exchangeRate: quote.rate,
      paymentMethod: 'bank_transfer',
      status: 'processing',
      breadTransactionId: offrampResult.transactionId,
      breadQuoteId: quote.quoteId,
      breadWalletId: user.wallet.breadWalletId,
      breadBeneficiaryId: beneficiary.breadBeneficiaryId,
      description: 'Bank withdrawal',
      fromAddress: user.wallet.address,
      paymentDetails: {
        beneficiaryAccountNumber: beneficiary.accountNumber,
        beneficiaryAccountName: beneficiary.accountName,
        beneficiaryBankName: beneficiary.bankName,
        beneficiaryBankCode: beneficiary.bankCode,
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
      amountNGN: quote.outputAmount,
      exchangeRate: quote.rate,
      fee: quote.fee,
      beneficiary: {
        accountName: beneficiary.accountName,
        accountNumber: beneficiary.accountNumber,
        bankName: beneficiary.bankName
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

  try {
    const accountInfo = await breadService.lookupAccount(bankCode, accountNumber);

    successResponse(res, 200, 'Bank account verified successfully', {
      accountName: accountInfo.accountName,
      accountNumber: accountInfo.accountNumber,
      bankName: accountInfo.bankName,
      bankCode: accountInfo.bankCode
    });

  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});
