/**
 * Coinbase Onramp & Offramp Controller
 * Handles API endpoints for Coinbase Pay integration
 */

const coinbaseService = require('../services/coinbaseService');

/**
 * Generate Onramp session for wallet funding
 * POST /api/coinbase/onramp/session
 *
 * Flow:
 * 1. Client wants to fund their wallet
 * 2. Generate secure session token with their wallet address
 * 3. Return onramp URL for payment
 * 4. Client completes purchase via Coinbase
 * 5. USDC deposited directly to their wallet
 */
exports.generateOnrampSession = async (req, res) => {
  try {
    // Verify Coinbase is configured
    if (!coinbaseService.isConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'Coinbase Onramp is not configured. Please contact support.'
      });
    }

    const { amount } = req.body;
    const userId = req.user._id;
    const walletAddress = req.user.wallet.address;

    // Validate wallet address
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'No wallet address found. Please contact support.'
      });
    }

    // Generate session token
    const result = await coinbaseService.generateOnrampSession(walletAddress, {
      userId: userId.toString(),
      presetFiatAmount: amount, // Optional: preset the amount
      defaultAsset: 'USDC',
      redirectUrl: `${process.env.FRONTEND_URL}/wallet?onramp=success`
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error,
        details: result.details
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Onramp session created successfully',
      data: {
        sessionToken: result.sessionToken,
        sessionId: result.sessionId,
        onrampUrl: result.onrampUrl,
        expiresAt: result.expiresAt,
        walletAddress: walletAddress
      }
    });
  } catch (error) {
    console.error('Generate Onramp Session Error:', error);

    // Check if it's a network error
    if (error.code === 'EAI_AGAIN' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      return res.status(503).json({
        success: false,
        error: 'Network connectivity issue',
        message: 'Unable to reach Coinbase API. Please check your internet connection and DNS settings.',
        details: {
          errorCode: error.code
        }
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create onramp session',
      message: error.message
    });
  }
};

/**
 * Generate Offramp session for cash out
 * POST /api/coinbase/offramp/session
 *
 * Flow:
 * 1. Creator wants to cash out USDC to bank account
 * 2. Generate secure session token with their wallet address
 * 3. Return offramp URL
 * 4. Creator completes sale via Coinbase (requires Coinbase account)
 * 5. Fiat deposited to their linked bank account
 *
 * IMPORTANT: Offramp requires user to have:
 * - Active Coinbase account
 * - Verified identity (KYC)
 * - Linked bank account
 */
exports.generateOfframpSession = async (req, res) => {
  try {
    // Verify Coinbase is configured
    if (!coinbaseService.isConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'Coinbase Offramp is not configured. Please contact support.'
      });
    }

    // Only creators can withdraw/offramp
    if (req.user.role !== 'creator') {
      return res.status(403).json({
        success: false,
        error: 'Only creators can withdraw funds'
      });
    }

    const { amount } = req.body;
    const userId = req.user._id;
    const walletAddress = req.user.wallet.address;
    const availableBalance = req.user.wallet.balance;

    // Validate wallet address
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'No wallet address found. Please contact support.'
      });
    }

    // Validate sufficient balance
    if (amount && amount > availableBalance) {
      return res.status(400).json({
        success: false,
        error: `Insufficient balance. Available: ${availableBalance} USDC`
      });
    }

    // Validate minimum withdrawal (if amount specified)
    const minWithdrawal = parseFloat(process.env.MINIMUM_WITHDRAWAL || 20);
    if (amount && amount < minWithdrawal) {
      return res.status(400).json({
        success: false,
        error: `Minimum withdrawal is ${minWithdrawal} USDC`
      });
    }

    // Generate session token
    const result = await coinbaseService.generateOfframpSession(walletAddress, {
      userId: userId.toString(),
      presetCryptoAmount: amount, // Optional: preset the amount
      defaultAsset: 'USDC',
      redirectUrl: `${process.env.FRONTEND_URL}/wallet?offramp=success`
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error,
        details: result.details
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Offramp session created successfully',
      data: {
        sessionToken: result.sessionToken,
        sessionId: result.sessionId,
        offrampUrl: result.offrampUrl,
        expiresAt: result.expiresAt,
        walletAddress: walletAddress,
        amount: amount,
        note: 'You will need a Coinbase account with verified identity and linked bank account to complete this transaction.'
      }
    });
  } catch (error) {
    console.error('Generate Offramp Session Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create offramp session',
      message: error.message
    });
  }
};

/**
 * Get buy quote (estimate for onramp)
 * GET /api/coinbase/onramp/quote?amount=100&currency=USD
 */
exports.getBuyQuote = async (req, res) => {
  try {
    const { amount, currency = 'USD' } = req.query;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'Amount is required'
      });
    }

    const result = await coinbaseService.getBuyQuote(
      parseFloat(amount),
      currency,
      'USDC'
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    return res.status(200).json({
      success: true,
      quote: result.quote
    });
  } catch (error) {
    console.error('Get Buy Quote Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get buy quote',
      message: error.message
    });
  }
};

/**
 * Get sell quote (estimate for offramp)
 * GET /api/coinbase/offramp/quote?amount=100
 */
exports.getSellQuote = async (req, res) => {
  try {
    const { amount, currency = 'USD' } = req.query;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: 'Amount is required'
      });
    }

    const result = await coinbaseService.getSellQuote(
      parseFloat(amount),
      'USDC',
      currency
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    return res.status(200).json({
      success: true,
      quote: result.quote
    });
  } catch (error) {
    console.error('Get Sell Quote Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get sell quote',
      message: error.message
    });
  }
};

/**
 * Check if Coinbase integration is enabled
 * GET /api/coinbase/status
 */
exports.getStatus = async (req, res) => {
  try {
    const isConfigured = coinbaseService.isConfigured();

    return res.status(200).json({
      success: true,
      enabled: isConfigured,
      features: {
        onramp: isConfigured,
        offramp: isConfigured
      }
    });
  } catch (error) {
    console.error('Get Coinbase Status Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check Coinbase status',
      message: error.message
    });
  }
};
