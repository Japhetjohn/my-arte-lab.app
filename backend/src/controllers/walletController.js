const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { successResponse } = require('../utils/apiResponse');
const { ErrorHandler, catchAsync } = require('../utils/errorHandler');
const tsaraService = require('../services/tsaraService');
const tsaraConfig = require('../config/tsara');

/**
 * @route   GET /api/wallet
 * @desc    Get wallet balance and info
 * @access  Private
 */
exports.getWallet = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  // Optionally sync with Tsara
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

/**
 * @route   GET /api/wallet/transactions
 * @desc    Get wallet transaction history
 * @access  Private
 */
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

/**
 * @route   POST /api/wallet/withdraw
 * @desc    Request withdrawal (creators only)
 * @access  Private
 */
exports.requestWithdrawal = catchAsync(async (req, res, next) => {
  const { amount, externalAddress, currency } = req.body;

  const user = await User.findById(req.user._id);

  // Only creators can withdraw
  if (user.role !== 'creator') {
    return next(new ErrorHandler('Only creators can withdraw funds', 403));
  }

  // Check minimum withdrawal
  const minWithdrawal = parseFloat(process.env.MINIMUM_WITHDRAWAL) || 20;
  if (amount < minWithdrawal) {
    return next(new ErrorHandler(`Minimum withdrawal amount is ${minWithdrawal}`, 400));
  }

  // Check sufficient balance
  if (user.wallet.balance < amount) {
    return next(new ErrorHandler('Insufficient balance', 400));
  }

  // Create withdrawal transaction
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

  // Process withdrawal via Tsara
  try {
    const withdrawalResult = await tsaraService.processWithdrawal({
      userWalletAddress: user.wallet.address,
      externalAddress,
      amount,
      currency: currency || user.wallet.currency,
      userId: user._id
    });

    // Update transaction
    transaction.tsaraPaymentId = withdrawalResult.withdrawalId;
    transaction.status = withdrawalResult.status || 'processing';
    await transaction.save();

    // Update user wallet (pending)
    user.wallet.balance -= amount;
    user.wallet.pendingBalance += amount;
    await user.save({ validateBeforeSave: false });

    successResponse(res, 200, 'Withdrawal request submitted successfully', {
      transaction,
      estimatedTime: withdrawalResult.estimatedTime || '24-48 hours'
    });

  } catch (error) {
    // Mark transaction as failed
    transaction.status = 'failed';
    transaction.errorMessage = error.message;
    await transaction.save();

    return next(new ErrorHandler('Withdrawal request failed. Please try again', 500));
  }
});

/**
 * @route   GET /api/wallet/balance-summary
 * @desc    Get detailed balance summary
 * @access  Private
 */
exports.getBalanceSummary = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  const summary = await Transaction.getUserBalanceSummary(user._id);

  successResponse(res, 200, 'Balance summary retrieved successfully', {
    wallet: user.wallet,
    summary
  });
});
