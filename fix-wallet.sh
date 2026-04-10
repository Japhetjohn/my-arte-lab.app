#!/bin/bash
# Script to fix the corrupted hostfiWalletController.js on the server

ssh root@72.61.97.210 << 'REMOTECOMMANDS'
cd /var/www/myartelab/backend/src/controllers

# Backup the corrupted file
cp hostfiWalletController.js hostfiWalletController.js.bak.$(date +%s)

# Write the fixed file
cat > hostfiWalletController.js << 'EOF'
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Booking = require('../models/Booking');
const { successResponse } = require('../utils/apiResponse');
const { ErrorHandler, catchAsync } = require('../utils/errorHandler');
const hostfiService = require('../services/hostfiService');
const hostfiWalletService = require('../services/hostfiWalletService');
const { v4: uuidv4 } = require('uuid');

// ============================================
// WALLET MANAGEMENT
// ============================================

/**
 * Get wallet information (HostFi wallets)
 */
exports.getWallet = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  
  if (!user) {
    return next(new ErrorHandler('User not found', 404));
  }

  // Initialize wallets if needed (for new users)
  if (!user.wallet.hostfiWalletAssets || user.wallet.hostfiWalletAssets.length === 0) {
    await hostfiWalletService.initializeUserWallets(req.user._id);
    const refreshedUser = await User.findById(req.user._id);
    Object.assign(user, refreshedUser.toObject());
  }

  // Get actual balance from HostFi API
  let hostfiBalance = 0;
  try {
    const walletAssets = await hostfiService.getUserWallets();
    hostfiBalance = walletAssets.reduce((sum, asset) => {
      const currency = (asset.currency?.code || asset.currency || '').toUpperCase();
      if (['USD', 'USDC', 'USDT', 'DAI'].includes(currency)) {
        return sum + (parseFloat(asset.balance) || 0);
      }
      return sum;
    }, 0);
  } catch (err) {
    console.error('[Wallet] Failed to fetch HostFi balance:', err.message);
    hostfiBalance = user.wallet.balance || 0;
  }

  // Calculate pending balance from active bookings
  const pendingBookings = await Booking.find({
    client: req.user._id,
    status: { $in: ['confirmed', 'in_progress', 'delivered'] },
    paymentStatus: 'paid'
  });
  
  const calculatedPendingBalance = pendingBookings.reduce((sum, booking) => 
    sum + (parseFloat(booking.amount) || 0), 0
  );

  // Available balance = HostFi balance - pending bookings
  const calculatedAvailableBalance = Math.max(0, parseFloat((hostfiBalance - calculatedPendingBalance).toFixed(2)));

  // Sync stored balance
  if (Math.abs(user.wallet.balance - calculatedAvailableBalance) > 0.01) {
    user.wallet.balance = calculatedAvailableBalance;
    user.balance = calculatedAvailableBalance;
    user.wallet.pendingBalance = calculatedPendingBalance;
    await user.save({ validateBeforeSave: false });
  }

  // Build assets list
  const assetsWithUsd = user.wallet.hostfiWalletAssets.map(asset => ({
    ...(asset.toObject ? asset.toObject() : asset),
    usdEquivalent: asset.balance || 0
  }));

  const usdcAsset = assetsWithUsd.find(a => a.currency === 'USDC');
  const usdcBalance = usdcAsset ? usdcAsset.balance : 0;

  successResponse(res, 200, 'Wallet retrieved successfully', {
    wallet: {
      assets: assetsWithUsd,
      balance: calculatedAvailableBalance,
      usdcBalance: usdcBalance,
      pendingBalance: calculatedPendingBalance,
      totalEarnings: user.wallet.totalEarnings || 0,
      hostFiBalance: hostfiBalance,
      currency: user.wallet.currency || 'USDC',
      network: user.wallet.network || 'Solana',
      address: user.wallet.address,
      tsaraAddress: user.wallet.tsaraAddress,
      tsaraBalance: user.wallet.tsaraBalance,
      lastUpdated: new Date()
    }
  });
});

/**
 * Get wallet transactions
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
 * Get balance summary
 */
exports.getBalanceSummary = catchAsync(async (req, res, next) => {
  const user = await hostfiWalletService.syncWalletBalances(req.user._id);
  const summary = await Transaction.getUserBalanceSummary(user._id);

  successResponse(res, 200, 'Balance summary retrieved', {
    balance: user.wallet.balance,
    pendingBalance: user.wallet.pendingBalance,
    totalEarnings: user.wallet.totalEarnings,
    currency: user.wallet.currency,
    summary
  });
});

// ============================================
// DEPOSIT & WITHDRAWAL
// ============================================

/**
 * Get deposit address for a currency
 */
exports.getDepositAddress = catchAsync(async (req, res, next) => {
  const { currency, network } = req.query;

  if (!currency) {
    return next(new ErrorHandler('Currency is required', 400));
  }

  const address = await hostfiWalletService.getOrCreateCollectionAddress(
    req.user._id,
    currency.toUpperCase(),
    network || 'SOL'
  );

  successResponse(res, 200, 'Deposit address retrieved', { address });
});

/**
 * Initiate withdrawal
 */
exports.withdraw = catchAsync(async (req, res, next) => {
  const { amount, currency, address, network } = req.body;

  if (!amount || !currency || !address) {
    return next(new ErrorHandler('Amount, currency and address are required', 400));
  }

  const result = await hostfiService.initiateWithdrawal({
    userId: req.user._id,
    amount: parseFloat(amount),
    currency: currency.toUpperCase(),
    address,
    network: network || 'SOL'
  });

  successResponse(res, 200, 'Withdrawal initiated', result);
});

/**
 * Get withdrawal methods
 */
exports.getWithdrawalMethods = catchAsync(async (req, res, next) => {
  const methods = await hostfiService.getWithdrawalMethods();

  successResponse(res, 200, 'Withdrawal methods retrieved', { methods });
});

// ============================================
// WEBHOOK HANDLING
// ============================================

/**
 * Handle HostFi webhooks
 */
exports.handleWebhook = catchAsync(async (req, res, next) => {
  const event = req.body;

  console.log('[HostFi Webhook] Received:', event);

  // Verify webhook signature if needed
  // Process different event types
  switch (event.type) {
    case 'deposit.confirmed':
      await handleDepositConfirmed(event.data);
      break;
    case 'withdrawal.completed':
      await handleWithdrawalCompleted(event.data);
      break;
    default:
      console.log('[HostFi Webhook] Unhandled event type:', event.type);
  }

  successResponse(res, 200, 'Webhook processed');
});

async function handleDepositConfirmed(data) {
  console.log('[HostFi Webhook] Deposit confirmed:', data);
  // Update user balance, create transaction record, etc.
}

async function handleWithdrawalCompleted(data) {
  console.log('[HostFi Webhook] Withdrawal completed:', data);
  // Update transaction status, notify user, etc.
}
EOF

pm2 restart myartelab
echo "File restored and server restarted"
REMOTECOMMANDS
