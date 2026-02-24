const User = require('../models/User');
const Transaction = require('../models/Transaction');
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
  // Initialize or sync HostFi wallets
  const user = await hostfiWalletService.syncWalletBalances(req.user._id);

  // Fetch exchange rates for all non-USD assets to get total USD equivalent
  const assetsWithUsd = await Promise.all(user.wallet.hostfiWalletAssets.map(async (asset) => {
    let usdEquivalent = 0;
    const currency = asset.currency.toUpperCase();

    if (['USD', 'USDC', 'USDT', 'DAI', 'BUSD'].includes(currency)) {
      usdEquivalent = asset.balance;
    } else {
      try {
        // Try fetching rate dynamically. If USD fails, try USDT/USDC as bridge
        let rateData;
        try {
          rateData = await hostfiService.getCurrencyRates(currency, 'USD', true);
        } catch (usdError) {
          // Fallback to USDT which usually exists for all crypto
          rateData = await hostfiService.getCurrencyRates(currency, 'USDT');
        }

        const rate = rateData.rate || rateData.data?.rate || 0;
        usdEquivalent = asset.balance * rate;
      } catch (error) {
        // Use getValidConversionTarget to ensure we use a supported pair
        try {
          const validTarget = await hostfiService.getValidConversionTarget(currency, 'USDT');
          const rateData = await hostfiService.getCurrencyRates(currency, validTarget);
          const rate = rateData.rate || rateData.data?.rate || 0;
          usdEquivalent = asset.balance * rate;
        } catch (fallbackError) {
          // Only log in development to avoid flooding
          if (process.env.NODE_ENV === 'development') {
            console.warn(`[Wallet] Failed to get rate for ${currency}:`, fallbackError.message);
          }
        }
      }
    }

    return {
      ...asset.toObject(),
      usdEquivalent: parseFloat(usdEquivalent.toFixed(2))
    };
  }));

  // Calculate total USD balance from current HostFi assets
  const totalBalanceUsd = assetsWithUsd.reduce((sum, asset) => sum + asset.usdEquivalent, 0);
  const displayBalance = totalBalanceUsd;

  successResponse(res, 200, 'Wallet retrieved successfully', {
    wallet: {
      assets: assetsWithUsd,
      balance: displayBalance,
      pendingBalance: user.wallet.pendingBalance || 0,
      totalEarnings: user.wallet.totalEarnings || 0,
      balanceUsd: totalBalanceUsd,
      currency: 'USD', // Override display currency for UI consistency
      network: user.wallet.network,
      address: user.wallet.address,
      lastUpdated: user.wallet.lastUpdated
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
      ...asset.toObject(),
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
      balanceUsd: totalBalanceUsd
    },
    summary
  });
});

/**
 * Get transaction by reference
 */
exports.getTransactionByReference = catchAsync(async (req, res, next) => {
  const { reference } = req.params;

  const transaction = await Transaction.findOne({ reference });

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
 * User gets a Solana address to receive USDC
 */
exports.createCryptoAddress = catchAsync(async (req, res, next) => {
  // Enforce USDC on Solana - HostFi expects "SOL" not "Solana"
  const currency = 'USDC';
  const network = 'SOL';

  // Get wallet asset ID for the crypto
  const assetId = await hostfiWalletService.getWalletAssetId(req.user._id, currency);
  if (!assetId) {
    return next(new ErrorHandler(`Wallet for currency ${currency} not found`, 404));
  }

  // Check if user already has a crypto address for this currency (idempotency check)
  try {
    const existingAddresses = await hostfiService.getCryptoCollectionAddresses({
      currency,
      network,
      customId: req.user._id.toString()
    });

    if (existingAddresses && existingAddresses.length > 0) {
      const existingAddress = existingAddresses[0];
      return successResponse(res, 200, 'Crypto address already exists', {
        address: {
          address: existingAddress.address,
          currency: existingAddress.currency,
          network: existingAddress.network,
          qrCode: existingAddress.qrCode || null,
          reference: existingAddress.id,
          instructions: `Send ${currency} on ${network} network to this address. Your wallet will be credited automatically after 1% platform fee.`
        }
      });
    }
  } catch (err) {
    console.log('Error checking existing addresses:', err.message);
    // Continue to create new address if check fails
  }

  // Create crypto collection address
  const address = await hostfiService.createCryptoCollectionAddress({
    assetId,
    currency,
    network,
    customId: req.user._id.toString()
  });

  if (!address || !address.address) {
    throw new Error('Failed to generate address: No address returned from provider');
  }

  // Save address to user wallet for quick access
  const user = await User.findById(req.user._id);
  user.wallet.address = address.address;
  user.wallet.network = 'Solana';
  user.wallet.lastUpdated = new Date();
  await user.save();

  // Create pending transaction record
  const transaction = await Transaction.create({
    transactionId: `CRYPTO-ADDR-${uuidv4()}`,
    user: req.user._id,
    type: 'deposit',
    amount: 0, // Amount not known yet
    currency,
    status: 'pending',
    paymentMethod: 'crypto',
    paymentDetails: {
      network,
      walletAddress: address.address,
      reference: address.id
    },
    reference: address.id,
    metadata: {
      collectionAddressId: address.id,
      provider: 'hostfi',
      type: 'crypto_collection'
    }
  });

  successResponse(res, 201, 'Crypto collection address created successfully', {
    address: {
      address: address.address,
      currency,
      network,
      qrCode: address.qrCode,
      reference: address.id,
      instructions: `Send ${currency} on ${network} network to this address. Your wallet will be credited automatically after 1% platform fee.`
    },
    transaction: {
      id: transaction._id,
      transactionId: transaction.transactionId,
      reference: transaction.reference
    }
  });
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

    // Map currency to country code
    const currencyToCountry = {
      'NGN': 'NG', 'KES': 'KE', 'GHS': 'GH', 'ZAR': 'ZA', 'TZS': 'TZ', 'UGX': 'UG', 'ZMW': 'ZM', 'RWF': 'RW',
      'XOF': 'SN', 'XAF': 'CM', 'EGP': 'EG', 'MAD': 'MA', 'TND': 'TN', 'DZD': 'DZ', 'ETB': 'ET',
      'EUR': 'FR', 'GBP': 'GB', 'CHF': 'CH', 'SEK': 'SE', 'NOK': 'NO', 'DKK': 'DK', 'PLN': 'PL',
      'CZK': 'CZ', 'HUF': 'HU', 'RON': 'RO', 'BGN': 'BG', 'HRK': 'HR', 'RSD': 'RS', 'UAH': 'UA', 'TRY': 'TR',
      'USD': 'US', 'CAD': 'CA', 'MXN': 'MX', 'BRL': 'BR', 'ARS': 'AR', 'CLP': 'CL', 'COP': 'CO', 'PEN': 'PE',
      'JPY': 'JP', 'CNY': 'CN', 'INR': 'IN', 'KRW': 'KR', 'SGD': 'SG', 'HKD': 'HK', 'MYR': 'MY',
      'THB': 'TH', 'VND': 'VN', 'PHP': 'PH', 'IDR': 'ID', 'PKR': 'PK', 'BDT': 'BD', 'AED': 'AE',
      'SAR': 'SA', 'QAR': 'QA', 'KWD': 'KW', 'ILS': 'IL',
      'AUD': 'AU', 'NZD': 'NZ',
    };

    const countryCode = currencyToCountry[currency] || 'NG';

    const channel = await hostfiService.createFiatCollectionChannel({
      assetId,
      currency,
      customId: fiatCustomId,
      type: 'STATIC',
      method: 'BANK_TRANSFER',
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

  const banks = await hostfiService.getBanksList(countryCode);

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
 * Initiate withdrawal (with 1% platform fee deduction)
 */
exports.initiateWithdrawal = catchAsync(async (req, res, next) => {
  const {
    amount,
    currency = 'USDC',
    targetCurrency = 'NGN',
    methodId = 'BANK_TRANSFER',
    recipient
  } = req.body;

  // Validation
  if (!amount || amount <= 0) {
    return next(new ErrorHandler('Valid amount is required', 400));
  }

  if (!recipient || !recipient.accountNumber || !recipient.accountName) {
    return next(new ErrorHandler('Recipient details are required', 400));
  }

  const user = await User.findById(req.user._id);

  // Convert withdrawal amount to primary currency for balance check
  let amountInPrimary = amount;
  if (currency !== user.wallet.currency) {
    try {
      let rateData;
      try {
        rateData = await hostfiService.getCurrencyRates(currency, user.wallet.currency, true);
      } catch (directError) {
        // Fallback to USDT bridge
        console.log(`[Withdrawal] Direct rate ${currency}/${user.wallet.currency} failed, trying USDT bridge...`);
        const bridgeRateData = await hostfiService.getCurrencyRates(currency, 'USDT');
        const toFinalRateData = await hostfiService.getCurrencyRates('USDT', user.wallet.currency);

        const bridgeRate = bridgeRateData.rate || bridgeRateData.data?.rate || 0;
        const toFinalRate = toFinalRateData.rate || toFinalRateData.data?.rate || 0;

        rateData = { rate: bridgeRate * toFinalRate };
      }

      const rate = rateData.rate || rateData.data?.rate || 0;
      amountInPrimary = amount * rate;
    } catch (error) {
      console.error(`Withdrawal conversion failed (${currency} to ${user.wallet.currency}):`, error.message);
      return next(new ErrorHandler(`Unable to verify balance for ${currency}. Rate API error.`, 500));
    }
  }

  // Check balance using the primary currency equivalent
  if (user.wallet.balance < amountInPrimary) {
    return next(new ErrorHandler(`Insufficient balance. You need approx ${amountInPrimary.toFixed(2)} ${user.wallet.currency}`, 400));
  }

  // Get wallet asset ID
  const assetId = await hostfiWalletService.getWalletAssetId(req.user._id, currency);
  if (!assetId) {
    return next(new ErrorHandler(`Wallet for currency ${currency} not found`, 404));
  }

  // Generate unique reference
  const clientReference = `WD-${uuidv4()}`;

  // Calculate platform fee (1% for off-ramp)
  const feeBreakdown = hostfiService.calculateOffRampFee(amount);

  // Deduct from balance and add to pending (using converted amounts where appropriate)
  user.wallet.balance -= amountInPrimary;
  user.wallet.pendingBalance += amountInPrimary;
  user.wallet.lastUpdated = new Date();
  await user.save();

  try {
    // Initiate withdrawal with HostFi (automatically deducts 1% fee)
    const withdrawal = await hostfiService.initiateWithdrawal({
      walletAssetId: assetId,
      amount, // Full amount - fee will be deducted by service or added for management
      currency,
      methodId: methodId,
      recipient: {
        type: recipient.type || (methodId === 'BANK_TRANSFER' ? 'BANK' : (methodId === 'MOBILE_MONEY' ? 'MOMO' : 'CRYPTO')),
        method: methodId,
        currency: recipient.currency || targetCurrency || currency,
        accountNumber: recipient.accountNumber,
        accountName: (recipient.accountName === 'undefined' || !recipient.accountName) ? 'Verified Recipient' : recipient.accountName,
        bankId: recipient.bankId,
        bankName: recipient.bankName,
        country: recipient.country || 'NG',
        accountType: recipient.accountType || 'SAVINGS'
      },
      clientReference,
      memo: `Withdrawal of ${amount} ${currency} to ${recipient.accountName || 'beneficiary'}`
    });

    // Create transaction record with fee details
    const transaction = await Transaction.create({
      transactionId: `WD-${uuidv4()}`,
      user: req.user._id,
      type: 'withdrawal',
      amount,
      currency,
      status: 'pending',
      paymentMethod: methodId.toLowerCase(),
      platformFee: feeBreakdown.platformFee, // Store platform fee
      netAmount: feeBreakdown.amountAfterFee, // Amount user actually receives
      paymentDetails: {
        beneficiaryAccountNumber: recipient.accountNumber,
        beneficiaryAccountName: recipient.accountName,
        beneficiaryBankName: recipient.bankName,
        beneficiaryBankCode: recipient.bankId,
        targetCurrency,
        targetAmount: withdrawal.amount || feeBreakdown.amountAfterFee,
        reference: clientReference
      },
      reference: clientReference,
      metadata: {
        hostfiReference: withdrawal.reference,
        provider: 'hostfi',
        methodId,
        feeBreakdown: feeBreakdown,
        country: recipient.country
      }
    });

    successResponse(res, 201, 'Withdrawal initiated successfully', {
      withdrawal: {
        reference: clientReference,
        amount,
        currency,
        platformFee: feeBreakdown.platformFee,
        platformFeePercent: feeBreakdown.platformFeePercent,
        amountAfterFee: feeBreakdown.amountAfterFee,
        status: 'pending',
        recipient: {
          accountName: recipient.accountName,
          accountNumber: recipient.accountNumber,
          bankName: recipient.bankName
        }
      },
      transaction: {
        id: transaction._id,
        transactionId: transaction.transactionId
      }
    });
  } catch (error) {
    // Refund balance on failure - USE CONVERTED AMOUNT
    console.error(`[Withdrawal Failed] Refunding ${amountInPrimary} ${user.wallet.currency} to user ${user._id}`);
    user.wallet.balance += amountInPrimary;
    user.wallet.pendingBalance -= amountInPrimary;
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

  // Add platform fee to the response
  successResponse(res, 200, 'Exchange fees retrieved successfully', {
    fees,
    platformFee: {
      percent: 1,
      description: 'Platform fee deducted from all on-ramp and off-ramp transactions'
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
