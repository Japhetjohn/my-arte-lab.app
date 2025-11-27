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

// ============= bread.africa Onramp Methods =============

exports.initiateBankTransferOnramp = catchAsync(async (req, res, next) => {
  const { amountNGN } = req.body;
  const user = await User.findById(req.user._id);

  const validation = breadConfig.validateOnrampAmount(amountNGN);
  if (!validation.valid) {
    return next(new ErrorHandler(validation.error, 400));
  }

  try {
    const onrampResult = await breadService.initiateBankTransferOnramp({
      userId: user._id.toString(),
      amountNGN,
      userEmail: user.email,
      userName: user.name
    });

    const transaction = await Transaction.create({
      user: user._id,
      type: 'onramp',
      amount: onrampResult.amountUSDC,
      currency: 'USDC',
      fiatAmount: amountNGN,
      fiatCurrency: 'NGN',
      exchangeRate: onrampResult.exchangeRate,
      paymentMethod: 'bank_transfer',
      status: 'pending',
      breadPaymentId: onrampResult.paymentId,
      description: 'Bank transfer deposit',
      paymentDetails: {
        accountNumber: onrampResult.paymentInstructions.accountNumber,
        accountName: onrampResult.paymentInstructions.accountName,
        bankName: onrampResult.paymentInstructions.bankName,
        reference: onrampResult.paymentInstructions.reference
      }
    });

    successResponse(res, 200, 'Bank transfer initiated successfully', {
      transaction,
      paymentInstructions: onrampResult.paymentInstructions,
      amountNGN,
      amountUSDC: onrampResult.amountUSDC,
      exchangeRate: onrampResult.exchangeRate
    });

  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});

exports.initiateMobileMoneyOnramp = catchAsync(async (req, res, next) => {
  const { amountNGN, provider, phoneNumber } = req.body;
  const user = await User.findById(req.user._id);

  const validation = breadConfig.validateOnrampAmount(amountNGN);
  if (!validation.valid) {
    return next(new ErrorHandler(validation.error, 400));
  }

  if (!provider || !phoneNumber) {
    return next(new ErrorHandler('Provider and phone number are required', 400));
  }

  try {
    const onrampResult = await breadService.initiateMobileMoneyOnramp({
      userId: user._id.toString(),
      amountNGN,
      provider,
      phoneNumber,
      userEmail: user.email,
      userName: user.name
    });

    const transaction = await Transaction.create({
      user: user._id,
      type: 'onramp',
      amount: onrampResult.amountUSDC,
      currency: 'USDC',
      fiatAmount: amountNGN,
      fiatCurrency: 'NGN',
      exchangeRate: onrampResult.exchangeRate,
      paymentMethod: 'mobile_money',
      status: 'pending',
      breadPaymentId: onrampResult.paymentId,
      description: `${provider} mobile money deposit`,
      paymentDetails: {
        phoneNumber: onrampResult.paymentInstructions.phoneNumber,
        provider: provider,
        reference: onrampResult.paymentInstructions.reference,
        ussdCode: onrampResult.paymentInstructions.ussdCode
      }
    });

    successResponse(res, 200, 'Mobile money deposit initiated successfully', {
      transaction,
      paymentInstructions: onrampResult.paymentInstructions,
      amountNGN,
      amountUSDC: onrampResult.amountUSDC,
      exchangeRate: onrampResult.exchangeRate
    });

  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});

exports.getExchangeRate = catchAsync(async (req, res, next) => {
  const { from, to, amount } = req.query;

  if (!from || !to || !amount) {
    return next(new ErrorHandler('from, to, and amount parameters are required', 400));
  }

  try {
    const rateData = await breadService.getExchangeRate(from, to, parseFloat(amount));

    successResponse(res, 200, 'Exchange rate retrieved successfully', rateData);

  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});

// ============= bread.africa Offramp Methods =============

exports.requestBankWithdrawal = catchAsync(async (req, res, next) => {
  const { amountUSDC, bankCode, accountNumber, accountName } = req.body;
  const user = await User.findById(req.user._id);

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

  if (!bankCode || !accountNumber || !accountName) {
    return next(new ErrorHandler('Bank code, account number, and account name are required', 400));
  }

  try {
    const offrampResult = await breadService.initiateOfframp({
      userId: user._id.toString(),
      amountUSDC,
      bankCode,
      accountNumber,
      accountName,
      userEmail: user.email,
      userName: user.name
    });

    const transaction = await Transaction.create({
      user: user._id,
      type: 'offramp',
      amount: amountUSDC,
      currency: 'USDC',
      fiatAmount: offrampResult.amountNGN,
      fiatCurrency: 'NGN',
      exchangeRate: offrampResult.exchangeRate,
      paymentMethod: 'bank_transfer',
      status: 'processing',
      breadPaymentId: offrampResult.withdrawalId,
      description: 'Bank withdrawal',
      fromAddress: user.wallet.address,
      paymentDetails: {
        accountNumber: offrampResult.bankDetails.accountNumber,
        accountName: offrampResult.bankDetails.accountName,
        bankName: offrampResult.bankDetails.bankName,
        bankCode: offrampResult.bankDetails.bankCode
      }
    });

    user.wallet.balance -= amountUSDC;
    user.wallet.pendingBalance += amountUSDC;
    await user.save({ validateBeforeSave: false });

    adminNotificationService.notifyWithdrawal(user, amountUSDC, 'USDC')
      .catch(err => console.error('Admin notification failed:', err));

    successResponse(res, 200, 'Bank withdrawal request submitted successfully', {
      transaction,
      amountUSDC,
      amountNGN: offrampResult.amountNGN,
      exchangeRate: offrampResult.exchangeRate,
      estimatedTime: offrampResult.estimatedTime
    });

  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});

exports.requestMobileMoneyWithdrawal = catchAsync(async (req, res, next) => {
  const { amountUSDC, provider, phoneNumber } = req.body;
  const user = await User.findById(req.user._id);

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

  if (!provider || !phoneNumber) {
    return next(new ErrorHandler('Provider and phone number are required', 400));
  }

  try {
    const offrampResult = await breadService.initiateMobileMoneyOfframp({
      userId: user._id.toString(),
      amountUSDC,
      provider,
      phoneNumber,
      userEmail: user.email,
      userName: user.name
    });

    const transaction = await Transaction.create({
      user: user._id,
      type: 'offramp',
      amount: amountUSDC,
      currency: 'USDC',
      fiatAmount: offrampResult.amountNGN,
      fiatCurrency: 'NGN',
      exchangeRate: offrampResult.exchangeRate,
      paymentMethod: 'mobile_money',
      status: 'processing',
      breadPaymentId: offrampResult.withdrawalId,
      description: `${provider} mobile money withdrawal`,
      fromAddress: user.wallet.address,
      paymentDetails: {
        phoneNumber: phoneNumber,
        provider: provider
      }
    });

    user.wallet.balance -= amountUSDC;
    user.wallet.pendingBalance += amountUSDC;
    await user.save({ validateBeforeSave: false });

    adminNotificationService.notifyWithdrawal(user, amountUSDC, 'USDC')
      .catch(err => console.error('Admin notification failed:', err));

    successResponse(res, 200, 'Mobile money withdrawal request submitted successfully', {
      transaction,
      amountUSDC,
      amountNGN: offrampResult.amountNGN,
      exchangeRate: offrampResult.exchangeRate,
      estimatedTime: offrampResult.estimatedTime
    });

  } catch (error) {
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
    const banks = await breadService.getSupportedBanks();

    successResponse(res, 200, 'Banks retrieved successfully', {
      banks
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
    const verification = await breadService.verifyBankAccount(bankCode, accountNumber);

    successResponse(res, 200, 'Bank account verified successfully', verification);

  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
});
