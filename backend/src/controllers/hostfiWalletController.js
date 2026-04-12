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
 * BALANCE CALCULATION: We calculate balance from transaction records, NOT from HostFi API
 * because HostFi returns demo/default values that are the same for all users.
 */
exports.getWallet = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  
  if (!user) {
    return next(new ErrorHandler('User not found', 404));
  }

  // Initialize wallets if needed (for new users)
  if (!user.wallet.hostfiWalletAssets || user.wallet.hostfiWalletAssets.length === 0) {
    await hostfiWalletService.initializeUserWallets(req.user._id);
    // Re-fetch user after initialization
    const refreshedUser = await User.findById(req.user._id);
    Object.assign(user, refreshedUser.toObject());
  }

  // Calculate USDC balance from user's actual transactions
  // IMPORTANT: HostFi B2B returns SHARED balance (same for all users)
  // We must track per-user balances internally based on their real deposits/payments
  let calculatedUsdcBalance = 0;
  try {
    console.log(`[Wallet] Calculating USDC balance from transactions for user ${req.user._id}...`);
    
    // Get user's real USDC transactions (verified only)
    const userTransactions = await Transaction.find({
      user: req.user._id,
      currency: 'USDC',
      status: { $in: ['completed', 'success', 'confirmed'] }
    });
    
    console.log(`[Wallet] Found ${userTransactions.length} USDC transactions`);
    
    // Calculate balance (skip suspicious amounts > 1000 USDC)
    let credits = 0;
    let debits = 0;
    
    userTransactions.forEach(tx => {
      const amount = parseFloat(tx.amount) || 0;
      
      // Skip test/suspicious data
      if (amount > 1000) {
        console.log(`[Wallet] SKIPPED suspicious amount: ${amount} USDC (ID: ${tx.transactionId})`);
        return;
      }
      
      // Credits (money in)
      if (['deposit', 'earning', 'refund', 'bonus', 'reversal', 'onramp'].includes(tx.type)) {
        credits += amount;
        console.log(`[Wallet] CREDIT: +${amount} USDC from ${tx.type}`);
      } 
      // Debits (money out)
      else if (['withdrawal', 'payment', 'platform_fee', 'offramp'].includes(tx.type)) {
        debits += amount;
        console.log(`[Wallet] DEBIT: -${amount} USDC from ${tx.type}`);
      }
    });
    
    calculatedUsdcBalance = Math.max(0, credits - debits);
    console.log(`[Wallet] Credits: ${credits}, Debits: ${debits}, Net: ${calculatedUsdcBalance} USDC`);
    
    // Update stored balance
    const usdcAsset = user.wallet.hostfiWalletAssets?.find(a => a.currency === 'USDC');
    if (usdcAsset) {
      usdcAsset.balance = calculatedUsdcBalance;
      usdcAsset.lastSynced = new Date();
      await user.save({ validateBeforeSave: false });
    }
  } catch (err) {
    console.error('[Wallet] Failed to calculate balance:', err.message);
    // Fallback to stored balance
    const storedAsset = user.wallet.hostfiWalletAssets?.find(a => a.currency === 'USDC');
    calculatedUsdcBalance = storedAsset ? parseFloat(storedAsset.balance) || 0 : 0;
  }
  
  // Use calculated balance from transactions
  const calculatedBalance = parseFloat(calculatedUsdcBalance.toFixed(2));

  // Calculate pending balance from active bookings (for clients - money they've paid that's held)
  const clientPendingBookings = await Booking.find({
    client: req.user._id,
    status: { $in: ['confirmed', 'in_progress', 'delivered'] },
    paymentStatus: 'paid'
  });
  
  const calculatedPendingBalance = clientPendingBookings.reduce((sum, booking) => 
    sum + (parseFloat(booking.amount) || 0), 0
  );
  
  // Calculate incoming earnings for creators (money they'll receive when work is completed)
  const creatorPendingBookings = await Booking.find({
    creator: req.user._id,
    status: { $in: ['confirmed', 'in_progress', 'delivered'] },
    paymentStatus: 'paid',
    fundsReleased: false
  });
  
  const incomingEarnings = creatorPendingBookings.reduce((sum, booking) => 
    sum + (parseFloat(booking.creatorAmount) || 0), 0
  );

  // Available balance = calculated balance - pending bookings (for clients)
  const calculatedAvailableBalance = Math.max(0, parseFloat((calculatedBalance - calculatedPendingBalance).toFixed(2)));
  
  console.log(`[Wallet] User ${req.user._id} - Balance: ${calculatedBalance}, Pending: ${calculatedPendingBalance}, Available: ${calculatedAvailableBalance}`);
  
  // Sync stored balance if it differs from calculated
  if (Math.abs(user.wallet.balance - calculatedAvailableBalance) > 0.01) {
    console.log(`[Wallet] Correcting balance for user ${req.user._id}: ${user.wallet.balance} -> ${calculatedAvailableBalance}`);
    user.wallet.balance = calculatedAvailableBalance;
    user.balance = calculatedAvailableBalance;
    user.wallet.pendingBalance = calculatedPendingBalance;
    await user.save({ validateBeforeSave: false });
  }

  // Build assets list with user's actual balance (NOT from HostFi which returns same data for all users)
  const assetsWithUsd = user.wallet.hostfiWalletAssets?.map(asset => ({
    ...(asset.toObject ? asset.toObject() : asset),
    usdEquivalent: calculatedAvailableBalance // Use calculated balance instead of HostFi
  })) || [];

  successResponse(res, 200, 'Wallet retrieved successfully', {
    wallet: {
      assets: assetsWithUsd,
      balance: calculatedAvailableBalance,
      usdcBalance: calculatedAvailableBalance, // Use calculated available balance
      pendingBalance: calculatedPendingBalance, // For clients: money held in escrow
      escrowBalance: calculatedPendingBalance, // Amount held in escrow (client view)
      incomingEarnings: incomingEarnings, // For creators: money they'll receive
      hostFiBalance: calculatedBalance, // Use calculated instead of raw HostFi
      totalEarnings: user.wallet.totalEarnings || 0,
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

  // Fetch exchange rates for all non-USD assets
  const assetsWithUsd = await Promise.all(user.wallet.hostfiWalletAssets.map(async (asset) => {
    let usdEquivalent = 0;
    const currency = asset.currency.toUpperCase();

    if (['USD', 'USDC', 'USDT', 'DAI', 'BUSD'].includes(currency)) {
      usdEquivalent = asset.balance;
    } else {
      try {
        let rateData;
        try {
          rateData = await hostfiService.getCurrencyRates(currency, 'USD', true);
        } catch (usdError) {
          rateData = await hostfiService.getCurrencyRates(currency, 'USDT');
        }

        const rate = rateData.rate || rateData.data?.rate || 0;
        usdEquivalent = asset.balance * rate;
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[BalanceSummary] Optional rate fetch failed for ${currency}: ${error.message}`);
        }
      }
    }

    return {
      ...(asset.toObject ? asset.toObject() : asset),
      usdEquivalent: parseFloat(usdEquivalent.toFixed(2))
    };
  }));

  const totalBalanceUsd = assetsWithUsd.reduce((sum, asset) => sum + asset.usdEquivalent, 0);

  successResponse(res, 200, 'Balance summary retrieved successfully', {
    wallet: {
      assets: assetsWithUsd,
      balance: totalBalanceUsd,
      pendingBalance: user.wallet.pendingBalance || 0,
      totalEarnings: user.wallet.totalEarnings || 0,
      currency: 'USD',
      balanceUsd: totalBalanceUsd,
      tsaraAddress: user.wallet.tsaraAddress,
      tsaraBalance: user.wallet.balance
    },
    summary
  });
});

/**
 * Get transaction by reference
 */
exports.getTransactionByReference = catchAsync(async (req, res, next) => {
  const { reference } = req.params;
  const mongoose = require('mongoose');

  let query = { reference };

  // If reference is a valid MongoDB ObjectId, search by _id as well
  if (mongoose.Types.ObjectId.isValid(reference)) {
    query = {
      $or: [
        { reference },
        { _id: reference }
      ]
    };
  }

  const transaction = await Transaction.findOne(query);

  if (!transaction) {
    return next(new ErrorHandler('Transaction not found', 404));
  }

  if (transaction.user.toString() !== req.user._id.toString()) {
    return next(new ErrorHandler('Unauthorized access to transaction', 403));
  }

  successResponse(res, 200, 'Transaction retrieved successfully', {
    transaction
  });
});

/**
 * Get supported currencies
 */
exports.getSupportedCurrencies = catchAsync(async (req, res, next) => {
  console.log('[Controller:getSupportedCurrencies] Fetching...');
  const currencies = await hostfiService.getSupportedCurrencies();

  // Extract currency codes or objects based on frontend expectation
  const formattedCurrencies = Array.isArray(currencies) ? currencies : [];
  console.log(`[Controller:getSupportedCurrencies] Found ${formattedCurrencies.length} currencies`);

  // Log first few to see structure for debugging
  if (formattedCurrencies.length > 0) {
    console.log('[Controller:getSupportedCurrencies] Sample asset:', JSON.stringify(formattedCurrencies[0]));
  }

  successResponse(res, 200, 'Supported currencies retrieved successfully', {
    currencies: formattedCurrencies
  });
});

// ============================================
// COLLECTIONS (ON-RAMP) - User Receives Money
// ============================================

/**
 * Create crypto collection address (for receiving crypto deposits)
 * User gets a HostFi Solana address to receive USDC
 * All deposits go through HostFi - no local wallet management
 */
exports.createCryptoAddress = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  const currency = 'USDC';
  const network = 'SOL';

  // Get wallet asset ID for USDC
  const assetId = await hostfiWalletService.getWalletAssetId(req.user._id, currency);
  if (!assetId) {
    return next(new ErrorHandler(`Wallet for currency ${currency} not found. Please contact support.`, 404));
  }

  // Check if user already has a crypto address for this currency in HostFi
  try {
    const existingAddresses = await hostfiService.getCryptoCollectionAddresses({
      currency,
      network,
      customId: req.user._id.toString()
    });

    if (existingAddresses && existingAddresses.length > 0) {
      const existingAddress = existingAddresses[0];
      
      // Save to user record for quick reference
      user.wallet.address = existingAddress.address;
      user.wallet.network = 'Solana';
      user.wallet.lastUpdated = new Date();
      await user.save();
      
      return successResponse(res, 200, 'Solana USDC address retrieved', {
        address: {
          address: existingAddress.address,
          currency: existingAddress.currency || currency,
          network: existingAddress.network || network,
          reference: existingAddress.id || existingAddress.reference,
          instructions: `Send ${currency} on ${network} network to this address. Your wallet will be credited automatically.`
        }
      });
    }
  } catch (err) {
    console.log('[HostFi] No existing addresses found, creating new one:', err.message);
  }

  // Create new crypto collection address via HostFi
  try {
    console.log('[HostFi] Creating new crypto address for user:', req.user._id.toString());
    
    const addressResponse = await hostfiService.createCryptoCollectionAddress({
      assetId,
      currency,
      network,
      customId: req.user._id.toString()
    });

    console.log('[HostFi] Crypto address response:', JSON.stringify(addressResponse, null, 2));

    // Handle async response - HostFi may return a job ID or the address directly
    let address = addressResponse;
    
    // If create response already has address, use it directly
    if (address && address.address) {
      console.log('[HostFi] Address created successfully:', address.address);
    } else if (address && address.id) {
      // If response has ID but no address, poll for it using list endpoint
      console.log('[HostFi] Async address creation detected, addressId:', address.id);
      
      // Poll for address (max 15 attempts, 2 seconds apart = 30 seconds total)
      for (let i = 0; i < 15; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          // Use listing endpoint - GET by ID returns "Sub address not found" error
          const addresses = await hostfiService.getCryptoCollectionAddresses({
            currency,
            network,
            customId: req.user._id.toString()
          });
          
          // Find by ID or find any address for this user/currency/network
          const found = addresses.find(a => a.id === address.id || 
            (a.currency === currency && a.network === network));
          
          if (found && found.address) {
            address = found;
            console.log('[HostFi] Found address after polling:', address.address);
            break;
          }
          
          console.log(`[HostFi] Poll attempt ${i + 1}/15: no address yet`);
        } catch (pollErr) {
          console.log(`[HostFi] Poll attempt ${i + 1} failed:`, pollErr.message);
        }
      }
    }

    if (!address || !address.address) {
      console.error('[HostFi] Failed to get address after all polling attempts');
      throw new Error('Failed to generate address: No address returned from provider');
    }

    console.log('[HostFi] Successfully got address:', address.address);

    // Save address to user wallet for quick access
    user.wallet.address = address.address;
    user.wallet.network = 'Solana';
    user.wallet.lastUpdated = new Date();
    await user.save();

    successResponse(res, 201, 'Solana USDC address created successfully', {
      address: {
        address: address.address,
        currency,
        network,
        qrCode: address.qrCode,
        reference: address.id || address.reference,
        instructions: `Send ${currency} on ${network} network to this address. Your wallet will be credited automatically.`
      }
    });
  } catch (error) {
    console.error('[HostFi] Failed to create crypto address:', error.message);
    return next(new ErrorHandler('Failed to generate deposit address. Please try again later.', 500));
  }
});

/**
 * Get crypto collection addresses for user
 */
exports.getCryptoAddresses = catchAsync(async (req, res, next) => {
  const addresses = await hostfiService.getCryptoCollectionAddresses({
    customId: req.user._id.toString()
  });

  successResponse(res, 200, 'Crypto addresses retrieved successfully', {
    addresses
  });
});

/**
 * Create fiat collection channel (bank account for deposits)
 * User gets bank account details to send fiat money
 * Strategy: Try to create new channel first, fallback to existing channels if creation fails
 */
exports.createFiatChannel = catchAsync(async (req, res, next) => {
  const { currency = 'NGN' } = req.body;
  const FiatChannel = require('../models/FiatChannel');

  console.log(`[Controller:createFiatChannel] Getting channel for user=${req.user._id}, currency=${currency}`);

  // Step 1: CHECK DATABASE FIRST
  let savedChannel = await FiatChannel.findOne({
    userId: req.user._id,
    currency: currency
  });

  if (savedChannel) {
    console.log(`[Controller:createFiatChannel] Found channel in database: ${savedChannel.channelId}. Verifying with HostFi...`);

    // VERIFY IF STILL ACTIVE IN HOSTFI (Dynamic channels expire)
    try {
      const activeChannels = await hostfiService.getFiatCollectionChannels({
        currency: currency
      });

      const records = activeChannels.records || activeChannels || [];
      const stillActive = records.find(c => c.id === savedChannel.channelId && c.active !== false);

      if (stillActive) {
        console.log(`[Controller:createFiatChannel] Channel ${savedChannel.channelId} is still active in HostFi.`);
        return successResponse(res, 200, 'Fiat channel retrieved successfully', {
          channel: {
            id: savedChannel.channelId,
            reference: savedChannel.reference,
            accountNumber: savedChannel.accountNumber,
            accountName: savedChannel.accountName,
            bankName: savedChannel.bankName,
            bankId: savedChannel.bankId,
            currency: savedChannel.currency,
            type: savedChannel.type,
            method: savedChannel.method,
            countryCode: savedChannel.countryCode,
            active: savedChannel.active,
            createdAt: savedChannel.createdAt
          }
        });
      } else {
        console.log(`[Controller:createFiatChannel] Channel ${savedChannel.channelId} has expired or is inactive in HostFi. Refreshing...`);
        // Delete expired channel to allow creation of new one
        await FiatChannel.findByIdAndDelete(savedChannel._id);
        savedChannel = null;
      }
    } catch (verifyError) {
      console.error('[Controller:createFiatChannel] Failed to verify channel with HostFi:', verifyError.message);
      // If verification fails, proceed with existing channel if it's the only one we have, 
      // or try to refresh if it's a critical error. For now, let's keep it if we can't confirm it's dead.
    }
  }

  // Step 2: GET WALLET ASSET ID
  const assetId = await hostfiWalletService.getWalletAssetId(req.user._id, currency);

  if (!assetId) {
    return next(new ErrorHandler(`Wallet for currency ${currency} not found`, 404));
  }

  // Step 3: CREATE NEW CHANNEL IN HOSTFI
  // Per HostFi support: Dynamic accounts require a UNIQUE reference (customId) per request
  // and cannot reuse IDs to prevent duplicate deposits.
  const fiatCustomId = `${req.user._id.toString()}-FIAT-${Date.now()}`;

  try {
    console.log('[Controller:createFiatChannel] Creating new channel in HostFi...');

    const config = hostfiService.getCurrencyConfig(currency);
    const countryCode = config.country;
    const methodId = config.method;

    const channel = await hostfiService.createFiatCollectionChannel({
      assetId,
      currency,
      customId: fiatCustomId,
      type: 'DYNAMIC',
      method: methodId,
      countryCode
    });

    console.log('[Controller:createFiatChannel] Channel created successfully in HostFi');

    console.log('[Controller:createFiatChannel] HostFi response:', JSON.stringify(channel, null, 2));

    // Step 4: SAVE TO DATABASE
    savedChannel = await FiatChannel.create({
      userId: req.user._id,
      currency: currency,
      channelId: channel.id,
      reference: channel.reference,
      customId: fiatCustomId,
      type: (channel.type === 'BANK_TRANSFER' ? 'STATIC' : channel.type) || 'STATIC',
      method: channel.method || 'BANK_TRANSFER',
      accountNumber: channel.accountNumber,
      accountName: channel.accountName,
      bankName: channel.bankName,
      bankId: channel.bankId,
      countryCode: channel.country || countryCode,
      assetId: assetId,
      active: channel.active !== false,
      hostfiResponse: channel
    });

    console.log(`[Controller:createFiatChannel] Channel saved to database: ${savedChannel._id}`);

    return successResponse(res, 201, 'Fiat channel created successfully', {
      channel: {
        id: savedChannel.channelId,
        reference: savedChannel.reference,
        accountNumber: savedChannel.accountNumber,
        accountName: savedChannel.accountName,
        bankName: savedChannel.bankName,
        bankId: savedChannel.bankId,
        currency: savedChannel.currency,
        type: savedChannel.type,
        method: savedChannel.method,
        countryCode: savedChannel.countryCode,
        active: savedChannel.active,
        createdAt: savedChannel.createdAt
      }
    });

  } catch (createError) {
    console.error('[Controller:createFiatChannel] Failed to create channel:', createError.message);

    // Check if this is an "already exists" error
    const isDuplicateError = createError.message && createError.message.toLowerCase().includes('already exists');

    if (isDuplicateError) {
      // Channel exists in HostFi but not in our DB (edge case)
      // This shouldn't happen often, but handle it gracefully
      return next(new ErrorHandler(
        `Your ${currency} deposit account already exists in HostFi but is not synced to our database. Please contact support to resolve this issue.`,
        409
      ));
    }

    return next(new ErrorHandler(
      `Unable to create ${currency} deposit account. ${createError.message}`,
      500
    ));
  }
});

/**
 * Get fiat collection channels for user
 */
exports.getFiatChannels = catchAsync(async (req, res, next) => {
  const { currency } = req.query;
  const FiatChannel = require('../models/FiatChannel');

  const query = { userId: req.user._id };
  if (currency) query.currency = currency;

  const channels = await FiatChannel.find(query);

  successResponse(res, 200, 'Fiat channels retrieved successfully', {
    channels
  });
});

// ============================================
// PAYMENTS (OFF-RAMP) - User Sends Money Out
// ============================================

/**
 * Get withdrawal methods
 */
exports.getWithdrawalMethods = catchAsync(async (req, res, next) => {
  const { sourceCurrency = 'USDC', targetCurrency = 'NGN' } = req.query;

  const methods = await hostfiService.getWithdrawalMethods(sourceCurrency, targetCurrency);

  successResponse(res, 200, 'Withdrawal methods retrieved successfully', {
    methods
  });
});

/**
 * Get banks list for a country
 */
exports.getBanksList = catchAsync(async (req, res, next) => {
  const { countryCode = 'NG' } = req.params;
  
  console.log(`[Controller] Getting banks list for country: ${countryCode}`);

  const banks = await hostfiService.getBanksList(countryCode);
  
  console.log(`[Controller] Returning ${banks?.length || 0} banks to client`);

  successResponse(res, 200, 'Banks list retrieved successfully', {
    banks
  });
});

/**
 * Verify bank account
 */
exports.verifyBankAccount = catchAsync(async (req, res, next) => {
  const { country = 'NG', bankId, accountNumber } = req.body;

  if (!bankId || !accountNumber) {
    return next(new ErrorHandler('Bank ID and account number are required', 400));
  }

  const accountInfo = await hostfiService.lookupBankAccount({
    country,
    bankId,
    accountNumber
  });

  successResponse(res, 200, 'Bank account verified successfully', {
    account: accountInfo
  });
});

/**
 * Initiate withdrawal - Clean implementation without hardcoded fees
 */
exports.initiateWithdrawal = catchAsync(async (req, res, next) => {
  const {
    amount,
    currency = 'USDC',
    targetCurrency,
    methodId,
    recipient
  } = req.body;

  const config = hostfiService.getCurrencyConfig(targetCurrency || currency);
  const effectiveMethodId = methodId || config.method;
  const isCrypto = (methodId || config.method) === 'CRYPTO' || (methodId || config.method) === 'SOL';
  const effectiveTargetCurrency = isCrypto ? currency : (targetCurrency || config.fiatCurrency || currency);

  // 1. SYNC BALANCES FIRST
  console.log(`[Withdrawal] Starting withdrawal: ${amount} ${currency} -> ${effectiveTargetCurrency}, method=${effectiveMethodId}`);
  const user = await hostfiWalletService.syncWalletBalances(req.user._id);

  // Validation
  if (!amount || amount <= 0) {
    return next(new ErrorHandler('Valid amount is required', 400));
  }

  // Basic validation
  if (!recipient) {
    return next(new ErrorHandler('Recipient details are required', 400));
  }

  if (isCrypto && !recipient.walletAddress) {
    return next(new ErrorHandler('Recipient wallet address is required', 400));
  } else if (!isCrypto) {
    if (effectiveMethodId === 'MOBILE_MONEY' && !recipient.accountNumber) {
      return next(new ErrorHandler('Recipient Mobile Money number is required', 400));
    } else if ((effectiveMethodId === 'BANK_TRANSFER' || effectiveMethodId === 'EFT') && (!recipient.accountNumber || !recipient.accountName)) {
      return next(new ErrorHandler('Recipient bank details (Account Number & Name) are required', 400));
    }
  }

  // Convert withdrawal amount to primary currency for balance check
  let amountInPrimary = amount;
  if (currency !== user.wallet.currency) {
    try {
      const rateData = await hostfiService.getCurrencyRates(currency, user.wallet.currency, true);
      const rate = rateData.rate || rateData.data?.rate || 0;
      amountInPrimary = amount * rate;
    } catch (error) {
      console.error(`[Withdrawal] Rate conversion failed:`, error.message);
      return next(new ErrorHandler(`Unable to verify balance for ${currency}. Rate API error.`, 500));
    }
  }

  const sourceCurr = currency.toUpperCase();
  const targetCurr = effectiveTargetCurrency.toUpperCase();

  // Get wallet asset ID
  const assetId = await hostfiWalletService.getWalletAssetId(req.user._id, currency);
  if (!assetId) {
    return next(new ErrorHandler(`Wallet for currency ${currency} not found`, 404));
  }

  // Get actual USDC balance (not aggregate)
  const walletAssets = await hostfiWalletService.getUserWalletAssets(req.user._id);
  const usdcAsset = walletAssets.find(a => a.currency === currency);
  const actualUsdcBalance = usdcAsset ? (usdcAsset.balance || 0) : 0;
  
  // Check pending/escrowed balance - prevent double-spending
  const pendingEscrowBalance = user.wallet.pendingBalance || 0;
  const availableBalance = Math.max(0, actualUsdcBalance - pendingEscrowBalance);
  
  console.log(`[Withdrawal] User aggregate balance: ${user.wallet.balance} ${user.wallet.currency}`);
  console.log(`[Withdrawal] Actual ${currency} balance: ${actualUsdcBalance}`);
  console.log(`[Withdrawal] Pending/escrowed balance: ${pendingEscrowBalance}`);
  console.log(`[Withdrawal] Available for withdrawal: ${availableBalance}`);

  // For fiat withdrawals (USDC -> NGN): Always swap, then payout
  if (!isCrypto && sourceCurr !== targetCurr) {
    console.log(`[Withdrawal] Will swap ${amount} ${sourceCurr} to ${targetCurr} then payout`);
    
    // Round to 6 decimal places (USDC precision) to avoid floating point issues
    const roundedAvailableBalance = Math.floor(availableBalance * 1000000) / 1000000;
    const roundedRequestAmount = Math.floor(amount * 1000000) / 1000000;
    
    // Check if enough USDC for the swap (considering escrowed funds)
    if (roundedAvailableBalance < roundedRequestAmount) {
      return next(new ErrorHandler(
        `Insufficient available USDC. You have ${actualUsdcBalance.toFixed(6)} USDC total, ` +
        `but ${pendingEscrowBalance.toFixed(6)} USDC is held in escrow for active bookings. ` +
        `Available for withdrawal: ${roundedAvailableBalance.toFixed(6)} USDC.`,
        400
      ));
    }
  }

  // For crypto withdrawals: Also check available balance (not locked in escrow)
  if (isCrypto) {
    const roundedAvailableBalance = Math.floor(availableBalance * 1000000) / 1000000;
    const roundedRequestAmount = Math.floor(amount * 1000000) / 1000000;
    
    if (roundedAvailableBalance < roundedRequestAmount) {
      return next(new ErrorHandler(
        `Insufficient available USDC. You have ${actualUsdcBalance.toFixed(6)} USDC total, ` +
        `but ${pendingEscrowBalance.toFixed(6)} USDC is held in escrow for active bookings. ` +
        `Available for withdrawal: ${roundedAvailableBalance.toFixed(6)} USDC.`,
        400
      ));
    }
  }

  const clientReference = `WD-${uuidv4()}`;
  console.log(`[Withdrawal] Processing ${amount} ${currency} for user ${req.user._id}`);

  // Deduct amount from balance
  user.wallet.balance -= amountInPrimary;
  user.wallet.pendingBalance = (user.wallet.pendingBalance || 0) + amountInPrimary;
  user.wallet.lastUpdated = new Date();
  await user.save();

  try {
    // Use HostFi for ALL withdrawals (crypto and fiat)
    // The service will handle swapping USDC to NGN first, then payout
    // Just pass the methodId directly - BANK_TRANSFER or CRYPTO
    console.log(`[Withdrawal] Initiating HostFi withdrawal for user ${req.user._id}, method: ${effectiveMethodId}`);

    const withdrawal = await hostfiService.initiateWithdrawal({
      walletAssetId: assetId,
      amount: amount,
      currency: currency, // Source currency (e.g. USDC)
      methodId: effectiveMethodId,
      recipient: {
        type: recipient.type || (effectiveMethodId === 'BANK_TRANSFER' ? 'BANK' : (effectiveMethodId === 'MOBILE_MONEY' ? 'MOMO' : (effectiveMethodId === 'EFT' ? 'BANK' : 'CRYPTO'))),
        method: effectiveMethodId,
        currency: effectiveTargetCurrency, // Target currency (e.g. NGN)
        accountNumber: recipient.accountNumber || recipient.walletAddress,
        accountName: (recipient.accountName === 'undefined' || !recipient.accountName) ? 'Verified Recipient' : recipient.accountName,
        bankId: recipient.bankId,
        bankName: recipient.bankName,
        country: recipient.country || config.country || 'NG',
        accountType: recipient.accountType || 'SAVINGS',
        walletAddress: recipient.walletAddress,
        address: recipient.walletAddress || recipient.address
      },
      clientReference,
      memo: `Withdrawal of ${amount} ${currency}`
    });

    // Create transaction record
    const recipientDisplay = (recipient.walletAddress || recipient.accountNumber || '');
    const shortRecipient = recipientDisplay.length > 8 ? `${recipientDisplay.slice(0, 4)}...${recipientDisplay.slice(-4)}` : recipientDisplay;
    const txDescription = (methodId === 'CRYPTO' || methodId === 'SOL')
      ? `Sent ${amount} USDC to ${shortRecipient}`
      : `Bank withdrawal to ${recipient.accountName || 'beneficiary'}`;

    const transaction = await Transaction.create({
      transactionId: `WD-${uuidv4()}`,
      user: req.user._id,
      type: 'withdrawal',
      amount,
      currency,
      status: 'pending',
      description: txDescription,
      paymentMethod: methodId?.toLowerCase() || effectiveMethodId.toLowerCase(),
      platformFee: 0,
      gasFee: 0,
      netAmount: amount,
      fromAddress: user.wallet.address,
      toAddress: recipient.walletAddress || recipient.accountNumber,
      blockchainNetwork: (methodId === 'CRYPTO' || methodId === 'SOL') ? 'Solana' : null,
      paymentDetails: {
        beneficiaryAccountNumber: recipient.accountNumber || recipient.walletAddress,
        beneficiaryAccountName: recipient.accountName || 'Verified Recipient',
        beneficiaryBankName: recipient.bankName || (methodId === 'CRYPTO' ? 'Solana Blockchain' : 'HostFi'),
        beneficiaryBankCode: recipient.bankId,
        targetCurrency: effectiveTargetCurrency,
        targetAmount: typeof withdrawal.amount === 'object' ? withdrawal.amount?.value : (withdrawal.amount || amount),
        reference: clientReference,
        signature: withdrawal.reference
      },
      reference: clientReference,
      transactionHash: withdrawal.reference,
      metadata: {
        hostfiReference: withdrawal.reference,
        provider: 'hostfi',
        methodId: effectiveMethodId,
        feeBreakdown: { platformFee: 0, networkFee: 0 },
        country: recipient.country || config.country || 'NG',
        explorerUrl: (methodId === 'CRYPTO' || methodId === 'SOL') ? `https://explorer.solana.com/tx/${withdrawal.reference}` : null
      }
    });

    successResponse(res, 201, 'Withdrawal initiated successfully', {
      withdrawal: {
        reference: clientReference,
        amount,
        currency,
        platformFee: 0,
        networkFee: 0,
        netAmount: amount,
        status: 'pending',
        recipient: {
          accountName: recipient.accountName,
          accountNumber: recipient.accountNumber || recipient.walletAddress,
          bankName: recipient.bankName || (methodId === 'CRYPTO' ? 'Solana' : 'HostFi')
        }
      },
      transaction: {
        id: transaction._id,
        transactionId: transaction.transactionId
      }
    });
  } catch (error) {
    // Handle different error scenarios
    console.error(`[Withdrawal Failed] Error: ${error.message}`);
    
    // Special handling: if swap succeeded but payout failed
    if (error.swapCompleted) {
      console.error(`[Withdrawal Failed] Swap completed but payout failed!`);
      console.error(`[Withdrawal Failed] Funds are safe in ${error.swapDetails?.targetCurrency} wallet`);
      
      // Don't refund the original balance - the funds were swapped successfully
      // Just remove from pending since the swap is done
      user.wallet.pendingBalance = Math.max(0, user.wallet.pendingBalance - amountInPrimary);
      await user.save();
      
      // Return a specific error message to the user
      return next(new ErrorHandler(
        error.message,
        502 // Bad Gateway - indicates external service issue
      ));
    }
    
    // Standard failure: refund balance
    console.error(`[Withdrawal Failed] Refunding ${amountInPrimary} ${user.wallet.currency} to user ${user._id}`);
    user.wallet.balance += amountInPrimary;
    user.wallet.pendingBalance = Math.max(0, user.wallet.pendingBalance - amountInPrimary);
    await user.save();

    throw error;
  }
});

/**
 * Get withdrawal status by reference
 */
exports.getWithdrawalStatus = catchAsync(async (req, res, next) => {
  const { reference } = req.params;

  const withdrawal = await hostfiService.getWithdrawalByReference(reference);

  successResponse(res, 200, 'Withdrawal status retrieved successfully', {
    withdrawal
  });
});

// ============================================
// BENEFICIARIES
// ============================================

/**
 * Get beneficiaries
 */
exports.getBeneficiaries = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  successResponse(res, 200, 'Beneficiaries retrieved successfully', {
    beneficiaries: user.wallet.beneficiaries || []
  });
});

/**
 * Add beneficiary
 */
exports.addBeneficiary = catchAsync(async (req, res, next) => {
  const { type, accountNumber, accountName, bankCode, bankName, phoneNumber, provider, country, isDefault } = req.body;
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
    country: country || 'NG',
    isDefault: isDefault || false
  };

  user.wallet.beneficiaries.push(newBeneficiary);
  await user.save();

  successResponse(res, 201, 'Beneficiary added successfully', {
    beneficiary: user.wallet.beneficiaries[user.wallet.beneficiaries.length - 1]
  });
});

/**
 * Remove beneficiary
 */
exports.removeBeneficiary = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const user = await User.findById(req.user._id);

  if (!user.wallet.beneficiaries) {
    return next(new ErrorHandler('No beneficiaries found', 404));
  }

  const initialLength = user.wallet.beneficiaries.length;
  user.wallet.beneficiaries = user.wallet.beneficiaries.filter(b => b.id !== id);

  if (user.wallet.beneficiaries.length === initialLength) {
    return next(new ErrorHandler('Beneficiary not found', 404));
  }

  await user.save();

  successResponse(res, 200, 'Beneficiary removed successfully');
});

// ============================================
// RATES & FEES
// ============================================

/**
 * Get exchange rates
 */
exports.getExchangeRates = catchAsync(async (req, res, next) => {
  // Support multiple parameter name formats
  const fromCurrency = req.query.fromCurrency || req.query.from;
  const toCurrency = req.query.toCurrency || req.query.to;

  if (!fromCurrency || !toCurrency) {
    return next(new ErrorHandler('From and to currency are required', 400));
  }

  const rates = await hostfiService.getCurrencyRates(fromCurrency, toCurrency);

  successResponse(res, 200, 'Exchange rates retrieved successfully', {
    rates
  });
});

exports.swapAssets = catchAsync(async (req, res, next) => {
  const { fromAsset, toAsset, amount } = req.body;

  if (!fromAsset || !toAsset || !amount || amount <= 0) {
    return next(new ErrorHandler('From asset, to asset and valid amount are required', 400));
  }

  // Parse asset strings like "solana:usdc"
  const [fromNetwork, fromCurrency] = fromAsset.split(':');
  const [toNetwork, toCurrency] = toAsset.split(':');

  if (!fromCurrency || !toCurrency) {
    return next(new ErrorHandler('Invalid asset format. Use network:currency (e.g. solana:usdc)', 400));
  }

  const fromAssetId = await hostfiWalletService.getWalletAssetId(req.user._id, fromCurrency.toUpperCase());
  const toAssetId = await hostfiWalletService.getWalletAssetId(req.user._id, toCurrency.toUpperCase());

  if (!fromAssetId) return next(new ErrorHandler(`Source wallet for ${fromCurrency} not found`, 404));
  if (!toAssetId) return next(new ErrorHandler(`Destination wallet for ${toCurrency} not found`, 404));

  const result = await hostfiService.swapAssets({
    fromAssetId,
    toAssetId,
    amount,
    customId: req.user._id.toString()
  });

  successResponse(res, 200, 'Swap initiated successfully', {
    swap: result
  });
});

/**
 * Get exchange fees
 */
exports.getExchangeFees = catchAsync(async (req, res, next) => {
  // Support multiple parameter name formats
  const sourceCurrency = req.query.sourceCurrency || req.query.from;
  const targetCurrency = req.query.targetCurrency || req.query.to;
  const type = req.query.type || 'exchange';

  if (!sourceCurrency || !targetCurrency) {
    return next(new ErrorHandler('Source and target currency are required', 400));
  }

  const fees = await hostfiService.getExchangeFees(sourceCurrency, targetCurrency, type);

  // Platform fee is 0% - HostFi handles all network fees
  successResponse(res, 200, 'Exchange fees retrieved successfully', {
    fees,
    platformFee: {
      percent: 0,
      description: 'No platform fees - HostFi handles network fees'
    }
  });
});

/**
 * Get supported currency swap/conversion pairs
 * GET /v1/hostfi/currency/swap-pairs?currency=ETH
 */
exports.getCurrencySwapPairs = catchAsync(async (req, res, next) => {
  const currency = req.query.currency;

  const pairs = await hostfiService.getCurrencySwapPairs(currency);

  successResponse(res, 200, 'Currency swap pairs retrieved successfully', {
    currency: currency || 'all',
    pairs
  });
});
