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
        // Fetch rate dynamically for the asset's currency
        const rateData = await hostfiService.getCurrencyRates(currency, 'USD');
        const rate = rateData.rate || rateData.data?.rate || 0;
        usdEquivalent = asset.balance * rate;
      } catch (error) {
        console.error(`Failed to fetch ${currency}/USD rate:`, error.message);
        // If it's NGN and we fail, we could have a hardcoded fallback if desired, 
        // but better to just skip if the rate API is down
      }
    }

    return {
      ...asset.toObject(),
      usdEquivalent: parseFloat(usdEquivalent.toFixed(2))
    };
  }));

  // Calculate total USD balance
  const totalBalanceUsd = assetsWithUsd.reduce((sum, asset) => sum + asset.usdEquivalent, 0);

  successResponse(res, 200, 'Wallet retrieved successfully', {
    wallet: {
      assets: assetsWithUsd,
      balance: user.wallet.balance, // This might be a legacy field or primary balance
      pendingBalance: user.wallet.pendingBalance,
      totalEarnings: user.wallet.totalEarnings,
      balanceUsd: totalBalanceUsd,
      currency: user.wallet.currency,
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
        const rateData = await hostfiService.getCurrencyRates(currency, 'USD');
        const rate = rateData.rate || rateData.data?.rate || 0;
        usdEquivalent = asset.balance * rate;
      } catch (error) {
        console.error(`Failed to fetch ${currency}/USD rate:`, error.message);
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
      balance: user.wallet.balance,
      pendingBalance: user.wallet.pendingBalance,
      totalEarnings: user.wallet.totalEarnings,
      currency: user.wallet.currency,
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

  // Get user's wallet asset ID for the currency
  const assetId = await hostfiWalletService.getWalletAssetId(req.user._id, currency);

  if (!assetId) {
    return next(new ErrorHandler(`Wallet for currency ${currency} not found`, 404));
  }

  console.log(`[Controller:createFiatChannel] Getting channel for user=${req.user._id}, currency=${currency}`);

  let channel;

  // Step 1: Try to create a new channel
  try {
    console.log('[Controller:createFiatChannel] Attempting to create new channel...');

    // Map currency to country code - GLOBAL SUPPORT
    const currencyToCountry = {
      // Africa
      'NGN': 'NG', // Nigeria
      'KES': 'KE', // Kenya
      'GHS': 'GH', // Ghana
      'ZAR': 'ZA', // South Africa
      'TZS': 'TZ', // Tanzania
      'UGX': 'UG', // Uganda
      'ZMW': 'ZM', // Zambia
      'RWF': 'RW', // Rwanda
      'XOF': 'SN', // West African CFA (Senegal, Benin, Burkina Faso, etc.)
      'XAF': 'CM', // Central African CFA (Cameroon, Gabon, etc.)
      'EGP': 'EG', // Egypt
      'MAD': 'MA', // Morocco
      'TND': 'TN', // Tunisia
      'DZD': 'DZ', // Algeria
      'ETB': 'ET', // Ethiopia

      // Europe
      'EUR': 'FR', // Euro (France as default, works for all Eurozone)
      'GBP': 'GB', // British Pound (UK)
      'CHF': 'CH', // Swiss Franc (Switzerland)
      'SEK': 'SE', // Swedish Krona
      'NOK': 'NO', // Norwegian Krone
      'DKK': 'DK', // Danish Krone
      'PLN': 'PL', // Polish Zloty
      'CZK': 'CZ', // Czech Koruna
      'HUF': 'HU', // Hungarian Forint
      'RON': 'RO', // Romanian Leu
      'BGN': 'BG', // Bulgarian Lev
      'HRK': 'HR', // Croatian Kuna
      'RSD': 'RS', // Serbian Dinar
      'UAH': 'UA', // Ukrainian Hryvnia
      'TRY': 'TR', // Turkish Lira

      // Americas
      'USD': 'US', // US Dollar
      'CAD': 'CA', // Canadian Dollar
      'MXN': 'MX', // Mexican Peso
      'BRL': 'BR', // Brazilian Real
      'ARS': 'AR', // Argentine Peso
      'CLP': 'CL', // Chilean Peso
      'COP': 'CO', // Colombian Peso
      'PEN': 'PE', // Peruvian Sol

      // Asia
      'JPY': 'JP', // Japanese Yen
      'CNY': 'CN', // Chinese Yuan
      'INR': 'IN', // Indian Rupee
      'KRW': 'KR', // South Korean Won
      'SGD': 'SG', // Singapore Dollar
      'HKD': 'HK', // Hong Kong Dollar
      'MYR': 'MY', // Malaysian Ringgit
      'THB': 'TH', // Thai Baht
      'VND': 'VN', // Vietnamese Dong
      'PHP': 'PH', // Philippine Peso
      'IDR': 'ID', // Indonesian Rupiah
      'PKR': 'PK', // Pakistani Rupee
      'BDT': 'BD', // Bangladeshi Taka
      'AED': 'AE', // UAE Dirham
      'SAR': 'SA', // Saudi Riyal
      'QAR': 'QA', // Qatari Riyal
      'KWD': 'KW', // Kuwaiti Dinar
      'ILS': 'IL', // Israeli Shekel

      // Oceania
      'AUD': 'AU', // Australian Dollar
      'NZD': 'NZ', // New Zealand Dollar
    };

    const countryCode = currencyToCountry[currency] || 'NG'; // Default to NG, but currency choice drives this

    channel = await hostfiService.createFiatCollectionChannel({
      assetId,
      currency,
      customId: req.user._id.toString(),
      type: 'DYNAMIC',
      method: 'BANK_TRANSFER',
      countryCode
    });

    console.log('[Controller:createFiatChannel] New channel created successfully');
  } catch (createError) {
    console.log('[Controller:createFiatChannel] Creation failed, checking for existing channel assigned to user');
    console.log('[Controller:createFiatChannel] Error:', createError.message);

    // Step 2: Fallback to finding a channel ALREADY assigned to THIS user
    try {
      const channels = await hostfiService.getFiatCollectionChannels({
        customId: req.user._id.toString(),
        currency: currency
      });

      console.log(`[Controller:createFiatChannel] Found ${channels.length} channels for user`);

      if (!channels || channels.length === 0) {
        return next(new ErrorHandler(
          `Unable to create ${currency} collection channel and no existing channel for user. Error: ${createError.message}`,
          503
        ));
      }

      // Use the first available channel assigned to this user
      channel = channels[0];

      console.log(`[Controller:createFiatChannel] Using user's existing channel`);
    } catch (fetchError) {
      console.error('[Controller:createFiatChannel] Failed to fetch user channels:', fetchError.message);
      throw createError; // Throw original creation error
    }
  }

  // Log the channel object to debug
  console.log('[Controller:createFiatChannel] Final channel object:', JSON.stringify(channel, null, 2));

  if (!channel) {
    return next(new ErrorHandler('Failed to get collection channel', 500));
  }

  // Create pending transaction record
  const transaction = await Transaction.create({
    transactionId: `FIAT-CH-${uuidv4()}`,
    user: req.user._id,
    type: 'deposit',
    amount: 0, // Amount not known yet
    currency,
    status: 'pending',
    paymentMethod: 'bank_transfer',
    paymentDetails: {
      accountNumber: channel.accountNumber,
      accountName: channel.accountName,
      bankName: channel.bankName,
      bankId: channel.bankId,
      country: channel.country
    },
    reference: channel.id,
    metadata: {
      collectionChannelId: channel.id,
      provider: 'hostfi',
      type: 'fiat_collection',
      channelType: channel.type
    }
  });

  successResponse(res, 201, 'Fiat collection channel retrieved successfully', {
    channel: {
      accountNumber: channel.accountNumber,
      accountName: channel.accountName,
      bankName: channel.bankName,
      bankId: channel.bankId,
      currency: channel.currency,
      country: channel.country,
      type: channel.type,
      reference: channel.id,
      instructions: `Transfer ${currency} to the account above. Your wallet will be credited automatically after 1% platform fee.`
    },
    transaction: {
      id: transaction._id,
      transactionId: transaction.transactionId,
      reference: transaction.reference
    }
  });
});

/**
 * Get fiat collection channels for user
 */
exports.getFiatChannels = catchAsync(async (req, res, next) => {
  const { currency } = req.query;

  const filters = {
    customId: req.user._id.toString()
  };
  if (currency) filters.currency = currency;

  const channels = await hostfiService.getFiatCollectionChannels(filters);

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
      const rateData = await hostfiService.getCurrencyRates(currency, user.wallet.currency);
      const rate = rateData.rate || rateData.data?.rate || 0;
      amountInPrimary = amount * rate;
    } catch (error) {
      console.error(`Withdrawal conversion failed (${currency} to ${user.wallet.currency}):`, error.message);
      return next(new ErrorHandler(`Unable to verify balance for ${currency}`, 500));
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
      amount, // Full amount - fee will be deducted by service
      currency,
      methodId,
      recipient: {
        accountNumber: recipient.accountNumber,
        accountName: (recipient.accountName === 'undefined' || !recipient.accountName) ? 'Verified Recipient' : recipient.accountName,
        bankId: recipient.bankId,
        bankName: recipient.bankName,
        country: recipient.country,
        currency: targetCurrency || currency
      },
      clientReference
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
    // Refund balance on failure
    user.wallet.balance += amount;
    user.wallet.pendingBalance -= amount;
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
