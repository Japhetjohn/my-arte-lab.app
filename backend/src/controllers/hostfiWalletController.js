const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { successResponse } = require('../utils/apiResponse');
const { ErrorHandler, catchAsync } = require('../utils/errorHandler');
const hostfiService = require('../services/hostfiService');
const hostfiWalletService = require('../services/hostfiWalletService');
const { v4: uuidv4 } = require('uuid');

/**
 * Get wallet information (HostFi wallets)
 */
exports.getWallet = catchAsync(async (req, res, next) => {
  // Initialize or sync HostFi wallets
  const user = await hostfiWalletService.syncWalletBalances(req.user._id);

  successResponse(res, 200, 'Wallet retrieved successfully', {
    wallet: {
      assets: user.wallet.hostfiWalletAssets,
      balance: user.wallet.balance,
      pendingBalance: user.wallet.pendingBalance,
      totalEarnings: user.wallet.totalEarnings,
      currency: user.wallet.currency,
      network: user.wallet.network,
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

// ============================================
// ON-RAMP (Deposits - Fiat to Wallet)
// ============================================

/**
 * Create fiat collection channel (bank account for deposits)
 */
exports.createDepositChannel = catchAsync(async (req, res, next) => {
  const { currency = 'NGN' } = req.body;

  // Get user's wallet asset ID for the currency
  const assetId = await hostfiWalletService.getWalletAssetId(req.user._id, currency);

  if (!assetId) {
    return next(new ErrorHandler(`Wallet for currency ${currency} not found`, 404));
  }

  // Create fiat collection channel
  const collectionChannel = await hostfiService.createFiatCollectionChannel({
    assetId,
    currency,
    customId: req.user._id.toString()
  });

  // Create pending transaction record
  const transaction = await Transaction.create({
    transactionId: `DEP-${uuidv4()}`,
    user: req.user._id,
    type: 'deposit',
    amount: 0, // Amount not known yet
    currency,
    status: 'pending',
    paymentMethod: 'bank_transfer',
    paymentDetails: {
      accountNumber: collectionChannel.accountNumber,
      accountName: collectionChannel.accountName,
      bankName: collectionChannel.bankName,
      reference: collectionChannel.reference
    },
    reference: collectionChannel.id,
    metadata: {
      collectionChannelId: collectionChannel.id,
      provider: 'hostfi'
    }
  });

  successResponse(res, 201, 'Deposit channel created successfully', {
    collectionChannel: {
      accountNumber: collectionChannel.accountNumber,
      accountName: collectionChannel.accountName,
      bankName: collectionChannel.bankName,
      bankCode: collectionChannel.bankCode,
      currency: collectionChannel.currency,
      reference: collectionChannel.reference,
      instructions: `Transfer funds to the account above. Your wallet will be credited automatically.`
    },
    transaction: {
      id: transaction._id,
      transactionId: transaction.transactionId,
      reference: transaction.reference
    }
  });
});

/**
 * Get deposit channels for user
 */
exports.getDepositChannels = catchAsync(async (req, res, next) => {
  const { currency } = req.query;

  const filters = {};
  if (currency) filters.currency = currency;

  const channels = await hostfiService.getFiatCollectionChannels(filters);

  // Filter channels for this user (by customId)
  const userChannels = channels.filter(c => c.customId === req.user._id.toString());

  successResponse(res, 200, 'Deposit channels retrieved successfully', {
    channels: userChannels
  });
});

// ============================================
// OFF-RAMP (Withdrawals - Wallet to Fiat)
// ============================================

/**
 * Get withdrawal methods
 */
exports.getWithdrawalMethods = catchAsync(async (req, res, next) => {
  const { sourceCurrency = 'NGN', targetCurrency = 'NGN' } = req.query;

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
 * Initiate withdrawal
 */
exports.initiateWithdrawal = catchAsync(async (req, res, next) => {
  const {
    amount,
    currency = 'NGN',
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

  // Check balance
  if (user.wallet.balance < amount) {
    return next(new ErrorHandler('Insufficient balance', 400));
  }

  // Get wallet asset ID
  const assetId = await hostfiWalletService.getWalletAssetId(req.user._id, currency);
  if (!assetId) {
    return next(new ErrorHandler(`Wallet for currency ${currency} not found`, 404));
  }

  // Generate unique reference
  const clientReference = `WD-${uuidv4()}`;

  // Deduct from balance and add to pending
  user.wallet.balance -= amount;
  user.wallet.pendingBalance += amount;
  user.wallet.lastUpdated = new Date();
  await user.save();

  try {
    // Initiate withdrawal with HostFi
    const withdrawal = await hostfiService.initiateWithdrawal({
      walletAssetId: assetId,
      amount,
      currency,
      methodId,
      recipient: {
        accountNumber: recipient.accountNumber,
        accountName: recipient.accountName,
        bankId: recipient.bankId,
        bankName: recipient.bankName,
        country: recipient.country || 'NG'
      },
      clientReference
    });

    // Create transaction record
    const transaction = await Transaction.create({
      transactionId: `WD-${uuidv4()}`,
      user: req.user._id,
      type: 'withdrawal',
      amount,
      currency,
      status: 'pending',
      paymentMethod: methodId.toLowerCase(),
      paymentDetails: {
        beneficiaryAccountNumber: recipient.accountNumber,
        beneficiaryAccountName: recipient.accountName,
        beneficiaryBankName: recipient.bankName,
        beneficiaryBankCode: recipient.bankId,
        reference: clientReference
      },
      reference: clientReference,
      metadata: {
        hostfiReference: withdrawal.reference,
        provider: 'hostfi',
        methodId
      }
    });

    successResponse(res, 201, 'Withdrawal initiated successfully', {
      withdrawal: {
        reference: clientReference,
        amount,
        currency,
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

/**
 * Get balance summary
 */
exports.getBalanceSummary = catchAsync(async (req, res, next) => {
  const user = await hostfiWalletService.syncWalletBalances(req.user._id);

  const summary = await Transaction.getUserBalanceSummary(user._id);

  successResponse(res, 200, 'Balance summary retrieved successfully', {
    wallet: {
      assets: user.wallet.hostfiWalletAssets,
      balance: user.wallet.balance,
      pendingBalance: user.wallet.pendingBalance,
      totalEarnings: user.wallet.totalEarnings,
      currency: user.wallet.currency
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

// ============================================
// CRYPTO ON-RAMP (Fiat to Crypto)
// ============================================

/**
 * Get crypto on-ramp quote
 */
exports.getCryptoOnrampQuote = catchAsync(async (req, res, next) => {
  const {
    sourceCurrency,
    targetCurrency = 'USDC',
    sourceAmount,
    network = 'Solana',
    country
  } = req.body;

  if (!sourceCurrency || !sourceAmount || !country) {
    return next(new ErrorHandler('Source currency, amount, and country are required', 400));
  }

  if (sourceAmount <= 0) {
    return next(new ErrorHandler('Amount must be greater than zero', 400));
  }

  const quote = await hostfiService.getCryptoOnrampQuote({
    sourceCurrency,
    targetCurrency,
    sourceAmount,
    network,
    country
  });

  successResponse(res, 200, 'Crypto on-ramp quote retrieved successfully', {
    quote
  });
});

/**
 * Get supported on-ramp countries
 */
exports.getOnrampCountries = catchAsync(async (req, res, next) => {
  const countries = await hostfiService.getOnrampCountries();

  successResponse(res, 200, 'On-ramp countries retrieved successfully', {
    countries
  });
});

/**
 * Get supported payment methods for on-ramp
 */
exports.getOnrampPaymentMethods = catchAsync(async (req, res, next) => {
  const { country, currency } = req.query;

  if (!country || !currency) {
    return next(new ErrorHandler('Country and currency are required', 400));
  }

  const methods = await hostfiService.getOnrampPaymentMethods(country, currency);

  successResponse(res, 200, 'On-ramp payment methods retrieved successfully', {
    methods
  });
});

/**
 * Initiate crypto on-ramp (Buy crypto with fiat)
 */
exports.initiateCryptoOnramp = catchAsync(async (req, res, next) => {
  const {
    sourceCurrency,
    targetCurrency = 'USDC',
    sourceAmount,
    network = 'Solana',
    country,
    paymentMethod,
    walletAddress
  } = req.body;

  // Validation
  if (!sourceCurrency || !sourceAmount || !country || !paymentMethod) {
    return next(new ErrorHandler('Source currency, amount, country, and payment method are required', 400));
  }

  if (sourceAmount <= 0) {
    return next(new ErrorHandler('Amount must be greater than zero', 400));
  }

  if (!walletAddress) {
    return next(new ErrorHandler('Wallet address is required', 400));
  }

  // Validate Solana address format
  const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  if (network === 'Solana' && !solanaAddressRegex.test(walletAddress)) {
    return next(new ErrorHandler('Invalid Solana wallet address', 400));
  }

  // Get wallet asset ID for the crypto
  const assetId = await hostfiWalletService.getWalletAssetId(req.user._id, targetCurrency);
  if (!assetId) {
    return next(new ErrorHandler(`Wallet for currency ${targetCurrency} not found`, 404));
  }

  // Generate unique reference
  const clientReference = `ONR-${uuidv4()}`;

  // Initiate on-ramp with HostFi
  const onramp = await hostfiService.initiateCryptoOnramp({
    walletAssetId: assetId,
    sourceCurrency,
    targetCurrency,
    sourceAmount,
    network,
    country,
    paymentMethod,
    walletAddress,
    clientReference
  });

  // Create transaction record
  const transaction = await Transaction.create({
    transactionId: `ONR-${uuidv4()}`,
    user: req.user._id,
    type: 'onramp',
    amount: sourceAmount,
    currency: sourceCurrency,
    status: 'pending',
    paymentMethod: paymentMethod.toLowerCase(),
    paymentDetails: {
      targetCurrency,
      targetAmount: onramp.targetAmount || 0,
      exchangeRate: onramp.exchangeRate,
      network,
      walletAddress,
      paymentInstructions: onramp.paymentInstructions,
      reference: clientReference
    },
    reference: clientReference,
    metadata: {
      hostfiReference: onramp.reference,
      provider: 'hostfi',
      country,
      type: 'crypto_onramp'
    }
  });

  successResponse(res, 201, 'Crypto on-ramp initiated successfully', {
    onramp: {
      reference: clientReference,
      sourceAmount,
      sourceCurrency,
      targetAmount: onramp.targetAmount,
      targetCurrency,
      exchangeRate: onramp.exchangeRate,
      network,
      status: 'pending',
      paymentInstructions: onramp.paymentInstructions
    },
    transaction: {
      id: transaction._id,
      transactionId: transaction.transactionId
    }
  });
});

/**
 * Get crypto on-ramp status
 */
exports.getCryptoOnrampStatus = catchAsync(async (req, res, next) => {
  const { reference } = req.params;

  const onramp = await hostfiService.getCryptoOnrampStatus(reference);

  successResponse(res, 200, 'Crypto on-ramp status retrieved successfully', {
    onramp
  });
});

// ============================================
// CRYPTO OFF-RAMP (Crypto to Fiat)
// ============================================

/**
 * Get crypto off-ramp quote
 */
exports.getCryptoOfframpQuote = catchAsync(async (req, res, next) => {
  const {
    sourceCurrency = 'USDC',
    targetCurrency,
    sourceAmount,
    network = 'Solana',
    country
  } = req.body;

  if (!targetCurrency || !sourceAmount || !country) {
    return next(new ErrorHandler('Target currency, amount, and country are required', 400));
  }

  if (sourceAmount <= 0) {
    return next(new ErrorHandler('Amount must be greater than zero', 400));
  }

  const quote = await hostfiService.getCryptoOfframpQuote({
    sourceCurrency,
    targetCurrency,
    sourceAmount,
    network,
    country
  });

  successResponse(res, 200, 'Crypto off-ramp quote retrieved successfully', {
    quote
  });
});

/**
 * Get supported off-ramp countries
 */
exports.getOfframpCountries = catchAsync(async (req, res, next) => {
  const countries = await hostfiService.getOfframpCountries();

  successResponse(res, 200, 'Off-ramp countries retrieved successfully', {
    countries
  });
});

/**
 * Initiate crypto off-ramp (Sell crypto for fiat)
 */
exports.initiateCryptoOfframp = catchAsync(async (req, res, next) => {
  const {
    sourceCurrency = 'USDC',
    targetCurrency,
    sourceAmount,
    network = 'Solana',
    country,
    recipient
  } = req.body;

  // Validation
  if (!targetCurrency || !sourceAmount || !country || !recipient) {
    return next(new ErrorHandler('Target currency, amount, country, and recipient are required', 400));
  }

  if (sourceAmount <= 0) {
    return next(new ErrorHandler('Amount must be greater than zero', 400));
  }

  if (!recipient.accountNumber || !recipient.accountName) {
    return next(new ErrorHandler('Recipient account details are required', 400));
  }

  const user = await User.findById(req.user._id);

  // Get wallet asset ID for the crypto
  const assetId = await hostfiWalletService.getWalletAssetId(req.user._id, sourceCurrency);
  if (!assetId) {
    return next(new ErrorHandler(`Wallet for currency ${sourceCurrency} not found`, 404));
  }

  // Generate unique reference
  const clientReference = `OFR-${uuidv4()}`;

  // Initiate off-ramp with HostFi
  const offramp = await hostfiService.initiateCryptoOfframp({
    walletAssetId: assetId,
    sourceCurrency,
    targetCurrency,
    sourceAmount,
    network,
    country,
    recipient: {
      accountNumber: recipient.accountNumber,
      accountName: recipient.accountName,
      bankId: recipient.bankId,
      bankName: recipient.bankName,
      country: recipient.country || country
    },
    clientReference
  });

  // Create transaction record
  const transaction = await Transaction.create({
    transactionId: `OFR-${uuidv4()}`,
    user: req.user._id,
    type: 'offramp',
    amount: sourceAmount,
    currency: sourceCurrency,
    status: 'pending',
    paymentMethod: 'bank_transfer',
    paymentDetails: {
      targetCurrency,
      targetAmount: offramp.targetAmount || 0,
      exchangeRate: offramp.exchangeRate,
      network,
      beneficiaryAccountNumber: recipient.accountNumber,
      beneficiaryAccountName: recipient.accountName,
      beneficiaryBankName: recipient.bankName,
      beneficiaryBankCode: recipient.bankId,
      depositAddress: offramp.depositAddress,
      reference: clientReference
    },
    reference: clientReference,
    metadata: {
      hostfiReference: offramp.reference,
      provider: 'hostfi',
      country,
      type: 'crypto_offramp'
    }
  });

  successResponse(res, 201, 'Crypto off-ramp initiated successfully', {
    offramp: {
      reference: clientReference,
      sourceAmount,
      sourceCurrency,
      targetAmount: offramp.targetAmount,
      targetCurrency,
      exchangeRate: offramp.exchangeRate,
      network,
      status: 'pending',
      depositAddress: offramp.depositAddress,
      depositInstructions: offramp.depositInstructions,
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
});

/**
 * Get crypto off-ramp status
 */
exports.getCryptoOfframpStatus = catchAsync(async (req, res, next) => {
  const { reference } = req.params;

  const offramp = await hostfiService.getCryptoOfframpStatus(reference);

  successResponse(res, 200, 'Crypto off-ramp status retrieved successfully', {
    offramp
  });
});

/**
 * Get crypto off-ramp deposit address
 */
exports.getCryptoOfframpDepositAddress = catchAsync(async (req, res, next) => {
  const { currency = 'USDC', network = 'Solana' } = req.query;

  const address = await hostfiService.getCryptoOfframpDepositAddress(currency, network);

  successResponse(res, 200, 'Crypto off-ramp deposit address retrieved successfully', {
    address
  });
});
