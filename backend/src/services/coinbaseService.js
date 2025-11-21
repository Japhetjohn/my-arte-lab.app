/**
 * Coinbase CDP Onramp & Offramp Service
 * Official API Documentation: https://docs.cdp.coinbase.com/onramp-&-offramp/
 *
 * This service uses Coinbase's official JWT authentication and session token approach
 */

const axios = require('axios');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { generateJwt } = require('@coinbase/cdp-sdk/auth');
const { HttpsProxyAgent } = require('https-proxy-agent');

class CoinbaseService {
  constructor() {
    this.projectId = process.env.COINBASE_CDP_PROJECT_ID;
    this.apiKeyId = process.env.COINBASE_CDP_API_KEY_ID;
    this.apiSecret = process.env.COINBASE_CDP_API_SECRET;
    this.baseUrl = 'https://api.developer.coinbase.com';

    // Configure proxy if set in environment (development only)
    this.axiosConfig = this.buildAxiosConfig();
  }

  /**
   * Build axios configuration with optional proxy support
   * Proxy is only used if HTTPS_PROXY is set in environment
   */
  buildAxiosConfig() {
    const config = {
      timeout: 30000 // 30 second timeout
    };

    // Check for proxy configuration
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;

    if (proxyUrl) {
      console.log('🔄 Using proxy for Coinbase API:', proxyUrl.replace(/\/\/.*@/, '//<credentials>@'));

      // Add proxy authentication if provided
      let fullProxyUrl = proxyUrl;
      if (process.env.PROXY_USERNAME && process.env.PROXY_PASSWORD) {
        const url = new URL(proxyUrl);
        url.username = process.env.PROXY_USERNAME;
        url.password = process.env.PROXY_PASSWORD;
        fullProxyUrl = url.toString();
      }

      config.httpsAgent = new HttpsProxyAgent(fullProxyUrl);
      config.proxy = false; // Disable axios default proxy handling
    }

    return config;
  }

  /**
   * Generate JWT bearer token for API authentication
   * Using official Coinbase CDP SDK
   *
   * @param {string} method - HTTP method
   * @param {string} path - API path
   * @returns {Promise<string>} JWT token
   */
  async generateJWT(method, path) {
    try {
      const token = await generateJwt({
        apiKeyId: this.apiKeyId,
        apiKeySecret: this.apiSecret,
        requestMethod: method,
        requestHost: 'api.developer.coinbase.com',
        requestPath: path,
        expiresIn: 120 // 2 minutes
      });

      return token;
    } catch (error) {
      console.error('JWT Generation Error:', error.message);
      throw new Error(`Failed to generate JWT: ${error.message}`);
    }
  }

  /**
   * Generate Onramp session token using official Coinbase API
   * Creates a secure, one-time-use token for wallet funding
   *
   * @param {string} destinationWalletAddress - Solana wallet to receive USDC
   * @param {Object} options - Optional parameters
   * @returns {Promise<Object>} Session token and URL
   */
  async generateOnrampSession(destinationWalletAddress, options = {}) {
    try {
      // API endpoint for session token generation
      const endpoint = '/onramp/v1/token';
      const method = 'POST';

      // Generate JWT for authentication
      const jwt = await this.generateJWT(method, endpoint);

      // Request body following official Coinbase structure
      const requestBody = {
        // Destination addresses configuration
        addresses: {
          [destinationWalletAddress]: ['solana']
        },
        // Supported assets
        assets: ['USDC'],
        // Optional: restrict to specific blockchains
        blockchains: ['solana']
      };

      // Optional: Add client IP for enhanced security
      if (options.clientIp) {
        requestBody.clientIp = options.clientIp;
      }

      // Make API request
      const response = await axios.post(
        `${this.baseUrl}${endpoint}`,
        requestBody,
        {
          ...this.axiosConfig,
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json',
            'X-CB-PROJECT-ID': this.projectId
          }
        }
      );

      const sessionToken = response.data.token;

      // Generate One-Click-Buy URL with session token
      const onrampUrl = this.buildOnrampUrl(sessionToken, {
        destinationWallet: destinationWalletAddress,
        presetFiatAmount: options.presetFiatAmount,
        defaultAsset: 'USDC',
        defaultNetwork: 'solana',
        ...options
      });

      return {
        success: true,
        sessionToken: sessionToken,
        onrampUrl: onrampUrl,
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour
        walletAddress: destinationWalletAddress
      };
    } catch (error) {
      console.error('Coinbase Onramp Session Error Details:', {
        message: error.message,
        stack: error.stack,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to generate onramp session',
        details: error.response?.data
      };
    }
  }

  /**
   * Build One-Click-Buy Onramp URL
   * Official docs: https://docs.cdp.coinbase.com/onramp-&-offramp/onramp-apis/one-click-buy-url
   *
   * @param {string} sessionToken - Generated session token
   * @param {Object} options - URL parameters
   * @returns {string} Complete onramp URL
   */
  buildOnrampUrl(sessionToken, options = {}) {
    const params = new URLSearchParams({
      // Required: Project ID and session token
      appId: this.projectId,
      sessionToken: sessionToken
    });

    // Optional: Preset fiat amount (e.g., 50 = $50)
    if (options.presetFiatAmount) {
      params.append('presetFiatAmount', options.presetFiatAmount.toString());
    }

    // Optional: Default crypto asset
    if (options.defaultAsset) {
      params.append('defaultAsset', options.defaultAsset);
    }

    // Optional: Default network
    if (options.defaultNetwork) {
      params.append('defaultNetwork', options.defaultNetwork);
    }

    // Optional: Default payment method
    if (options.defaultPaymentMethod) {
      params.append('defaultPaymentMethod', options.defaultPaymentMethod);
    }

    // Optional: Redirect URL after purchase
    if (options.redirectUrl) {
      params.append('redirectUrl', options.redirectUrl);
    }

    // Official Coinbase Pay URL
    return `https://pay.coinbase.com/buy?${params.toString()}`;
  }

  /**
   * Generate Buy Quote for estimation
   * Shows user how much crypto they'll get for their fiat
   *
   * @param {number} fiatAmount - Amount in fiat currency
   * @param {string} fiatCurrency - Currency code (USD, EUR, etc.)
   * @param {string} cryptoAsset - Crypto to purchase (USDC, BTC, etc.)
   * @param {string} network - Blockchain network
   * @returns {Promise<Object>} Quote details
   */
  async getBuyQuote(fiatAmount, fiatCurrency = 'USD', cryptoAsset = 'USDC', network = 'solana') {
    try {
      const endpoint = '/onramp/v1/buy/quote';
      const method = 'POST';
      const jwt = await this.generateJWT(method, endpoint);

      const response = await axios.post(
        `${this.baseUrl}${endpoint}`,
        {
          purchase_currency: fiatCurrency,
          purchase_amount: fiatAmount.toString(),
          crypto_currency: cryptoAsset,
          network: network,
          payment_method: 'CARD'
        },
        {
          ...this.axiosConfig,
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json',
            'X-CB-PROJECT-ID': this.projectId
          }
        }
      );

      return {
        success: true,
        quote: response.data
      };
    } catch (error) {
      console.error('Coinbase Buy Quote Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get buy quote'
      };
    }
  }

  /**
   * Generate Offramp session for cash out to bank account
   * Creates secure session for selling crypto to fiat
   *
   * @param {string} sourceWalletAddress - Wallet holding crypto to sell
   * @param {Object} options - Optional parameters
   * @returns {Promise<Object>} Session token and URL
   */
  async generateOfframpSession(sourceWalletAddress, options = {}) {
    try {
      const endpoint = '/offramp/v1/token';
      const method = 'POST';
      const jwt = await this.generateJWT(method, endpoint);

      const requestBody = {
        // Source wallet configuration
        addresses: {
          [sourceWalletAddress]: ['solana']
        },
        // Assets available to sell
        assets: ['USDC'],
        blockchains: ['solana']
      };

      const response = await axios.post(
        `${this.baseUrl}${endpoint}`,
        requestBody,
        {
          ...this.axiosConfig,
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json',
            'X-CB-PROJECT-ID': this.projectId
          }
        }
      );

      const sessionToken = response.data.token;

      // Generate One-Click-Sell URL
      const offrampUrl = this.buildOfframpUrl(sessionToken, {
        sourceWallet: sourceWalletAddress,
        presetCryptoAmount: options.presetCryptoAmount,
        defaultAsset: 'USDC',
        defaultNetwork: 'solana',
        ...options
      });

      return {
        success: true,
        sessionToken: sessionToken,
        offrampUrl: offrampUrl,
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        walletAddress: sourceWalletAddress
      };
    } catch (error) {
      console.error('Coinbase Offramp Session Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to generate offramp session',
        details: error.response?.data
      };
    }
  }

  /**
   * Build One-Click-Sell Offramp URL
   *
   * @param {string} sessionToken - Generated session token
   * @param {Object} options - URL parameters
   * @returns {string} Complete offramp URL
   */
  buildOfframpUrl(sessionToken, options = {}) {
    const params = new URLSearchParams({
      appId: this.projectId,
      sessionToken: sessionToken
    });

    // Optional: Preset crypto amount to sell
    if (options.presetCryptoAmount) {
      params.append('presetCryptoAmount', options.presetCryptoAmount.toString());
    }

    // Optional: Default asset to sell
    if (options.defaultAsset) {
      params.append('defaultAsset', options.defaultAsset);
    }

    // Optional: Default network
    if (options.defaultNetwork) {
      params.append('defaultNetwork', options.defaultNetwork);
    }

    // Optional: Default payout method
    if (options.defaultPayoutMethod) {
      params.append('defaultPayoutMethod', options.defaultPayoutMethod);
    }

    // Optional: Redirect URL after sale
    if (options.redirectUrl) {
      params.append('redirectUrl', options.redirectUrl);
    }

    // Official Coinbase Pay sell URL
    return `https://pay.coinbase.com/sell?${params.toString()}`;
  }

  /**
   * Get Sell Quote for offramp estimation
   *
   * @param {number} cryptoAmount - Amount of crypto to sell
   * @param {string} cryptoAsset - Asset to sell (USDC, BTC, etc.)
   * @param {string} fiatCurrency - Target fiat currency
   * @param {string} network - Blockchain network
   * @returns {Promise<Object>} Quote details
   */
  async getSellQuote(cryptoAmount, cryptoAsset = 'USDC', fiatCurrency = 'USD', network = 'solana') {
    try {
      const endpoint = '/offramp/v1/sell/quote';
      const method = 'POST';
      const jwt = await this.generateJWT(method, endpoint);

      const response = await axios.post(
        `${this.baseUrl}${endpoint}`,
        {
          sell_currency: cryptoAsset,
          sell_amount: cryptoAmount.toString(),
          fiat_currency: fiatCurrency,
          network: network,
          payout_method: 'BANK'
        },
        {
          ...this.axiosConfig,
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json',
            'X-CB-PROJECT-ID': this.projectId
          }
        }
      );

      return {
        success: true,
        quote: response.data
      };
    } catch (error) {
      console.error('Coinbase Sell Quote Error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to get sell quote'
      };
    }
  }

  /**
   * Verify Coinbase configuration
   * @returns {boolean}
   */
  isConfigured() {
    return !!(this.projectId && this.apiKeyId && this.apiSecret);
  }
}

module.exports = new CoinbaseService();
