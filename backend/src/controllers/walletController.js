const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { successResponse } = require('../utils/apiResponse');
const { ErrorHandler, catchAsync } = require('../utils/errorHandler');
const tsaraService = require('../services/tsaraService');
const tsaraConfig = require('../config/tsara');
const adminNotificationService = require('../services/adminNotificationService');

exports.getWallet = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  try {
    const balance = await tsaraService.getWalletBalance(user.wallet.address);
    if (balance.balance !== user.wallet.balance) {
      user.wallet.balance = balance.balance;
      user.wallet.lastUpdated = new Date();
      await user.save({ validateBeforeSave: false });
    }
  } catch (error) {
    console.warn('Failed to sync wallet balance:', error.message);
  }

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

exports.requestWithdrawal = catchAsync(async (req, res, next) => {
  const { amount, externalAddress, currency } = req.body;

  const user = await User.findById(req.user._id);

  if (user.role !== 'creator') {
    return next(new ErrorHandler('Only creators can withdraw funds', 403));
  }

  if (user.wallet.balance < amount) {
    return next(new ErrorHandler('Insufficient balance', 400));
  }

  if (amount <= 0) {
    return next(new ErrorHandler('Withdrawal amount must be greater than 0', 400));
  }

  const transaction = await Transaction.create({
    user: user._id,
    type: 'withdrawal',
    amount,
    currency: currency || user.wallet.currency,
    status: 'processing',
    fromAddress: user.wallet.address,
    toAddress: externalAddress,
    description: 'Withdrawal request',
    metadata: {
      requestedAt: new Date()
    }
  });

  try {
    const withdrawalResult = await tsaraService.processWithdrawal({
      fromAddress: user.wallet.address,
      toAddress: externalAddress,
      amount,
      currency: currency || user.wallet.currency,
      memo: `Withdrawal for user ${user.name}`
    });

    transaction.tsaraPaymentId = withdrawalResult.withdrawalId;
    transaction.status = withdrawalResult.status || 'processing';
    await transaction.save();

    user.wallet.balance -= amount;
    user.wallet.pendingBalance += amount;
    await user.save({ validateBeforeSave: false });

    adminNotificationService.notifyWithdrawal(user, amount, currency || user.wallet.currency)
      .catch(err => console.error('Admin notification failed:', err));

    successResponse(res, 200, 'Withdrawal request submitted successfully', {
      transaction,
      estimatedTime: withdrawalResult.estimatedTime || '24-48 hours'
    });

  } catch (error) {
    transaction.status = 'failed';
    transaction.errorMessage = error.message;
    await transaction.save();

    return next(new ErrorHandler('Withdrawal request failed. Please try again', 500));
  }
});

exports.getBalanceSummary = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  const summary = await Transaction.getUserBalanceSummary(user._id);

  successResponse(res, 200, 'Balance summary retrieved successfully', {
    wallet: user.wallet,
    summary
  });
});
