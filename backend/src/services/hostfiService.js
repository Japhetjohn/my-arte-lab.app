const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const hostfiConfig = require('../config/hostfi');

/**
 * HostFi Service - Complete Wallet Infrastructure
 * Supports: Wallet Management, On-Ramp (Collections), Off-Ramp (Payouts)
 * API Documentation: https://hostfi.readme.io
 */
class HostFiService {
  constructor() {
    this.apiUrl = hostfiConfig.apiUrl;
    this.clientId = hostfiConfig.clientId;
    this.secretKey = hostfiConfig.secretKey;
    this.webhookSecret = hostfiConfig.webhookSecret;

    // Platform fee configuration (read from env, default 10%)
    this.platformFeePercent = parseInt(process.env.PLATFORM_COMMISSION) || 10;
    this.platformWalletAddress = process.env.PLATFORM_WALLET_ADDRESS;

    // Token cache
    this.accessToken = null;
    this.tokenExpiry = null;

    // Create axios instance
    this.api = axios.create({
      baseURL: this.apiUrl,
      timeout: 30000
    });

    // Configure retries
    axiosRetry(this.api, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
          (error.response && error.response.status >= 500);
      },
      onRetry: (retryCount, error, requestConfig) => {
        console.warn(`HostFi API retry attempt ${retryCount} for ${requestConfig.url}`);
      }
    });
  }

  /**
   * Calculate platform fee (configurable via PLATFORM_COMMISSION env)
   * Used for bookings only (10%)
   * @param {number} amount - Transaction amount
   * @returns {Object} Fee breakdown
   */
  calculatePlatformFee(amount) {
    const fee = (amount * this.platformFeePercent) / 100;
    const amountAfterFee = amount - fee;

    return {
      originalAmount: amount,
      platformFee: fee,
      platformFeePercent: this.platformFeePercent,
      amountAfterFee,
      platformWallet: this.platformWalletAddress
    };
  }

  /**
   * Calculate on-ramp fee (1% - charged when users deposit)
   * @param {number} amount - Deposit amount
   * @returns {Object} Fee breakdown
   */
  calculateOnRampFee(amount) {
    const feePercent = 1; // 1% fee for deposits
    const fee = (amount * feePercent) / 100;
    const amountAfterFee = amount - fee;

    return {
      originalAmount: amount,
      platformFee: fee,
      platformFeePercent: feePercent,
      amountAfterFee,
      platformWallet: this.platformWalletAddress,
      feeType: 'on-ramp'
    };
  }

  /**
   * Calculate off-ramp fee (no fee for withdrawals)
   * @param {number} amount - Withdrawal amount
   * @returns {Object} Fee breakdown
   */
  calculateOffRampFee(amount) {
    const feePercent = 1; // 1% fee for withdrawals
    const fee = (amount * feePercent) / 100;
    const amountAfterFee = amount - fee;

    return {
      originalAmount: amount,
      platformFee: fee,
      platformFeePercent: feePercent,
      amountAfterFee,
      platformWallet: this.platformWalletAddress,
      feeType: 'off-ramp'
    };
  }

  /**
   * Get or refresh access token
   * @returns {Promise<string>} Access token
   */
  async getAccessToken() {
    // Return cached token if still valid (with 5 min buffer)
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry - 300000) {
      return this.accessToken;
    }

    try {
      console.log('Fetching new HostFi access token...');

      const response = await this.api.post('/auth/token', {
        clientId: this.clientId,
        clientSecret: this.secretKey
      });

      this.accessToken = response.data.token || response.data.data?.access_token;
      this.tokenExpiry = Date.now() + (3600 * 1000); // 1 hour

      console.log('HostFi access token obtained successfully');
      return this.accessToken;
    } catch (error) {
      console.error('Failed to get HostFi access token:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to authenticate with HostFi');
    }
  }

  /**
   * Make authenticated API request
   * @param {string} method - HTTP method
   * @param {string} url - API endpoint
   * @param {Object} data - Request payload
   * @param {Object} params - Query parameters
   */
  async makeRequest(method, url, data = null, params = null, silent = false) {
    const token = await this.getAccessToken();

    const config = {
      method,
      url,
      headers: hostfiConfig.getHeaders(token),
    };

    if (data) config.data = data;
    if (params) config.params = params;

    try {
      const response = await this.api.request(config);
      return response.data;
    } catch (error) {
      const errorData = error.response?.data;
      const statusCode = error.response?.status;
      const statusText = error.response?.statusText;

      if (!silent) {
        console.error(`[HostFi Error] ${method} ${url} failed:`);
        console.error(`  Status: ${statusCode} ${statusText}`);
        console.error(`  Response:`, JSON.stringify(errorData, null, 2));
        console.error(`  Request payload:`, JSON.stringify(data, null, 2));
      } else if (process.env.NODE_ENV === 'development') {
        // In dev, still show a one-liner
        console.warn(`[HostFi] Silent failure: ${method} ${url} - ${statusCode}`);
      }

      // Preserve the full error details
      if (errorData) {
        const errorMsg = errorData.message || errorData.error || errorData.msg || `HostFi API ${statusCode} error`;
        const err = new Error(errorMsg);
        err.hostfiError = errorData;
        err.statusCode = statusCode;
        throw err;
      }
      throw new Error(error.message || 'HostFi API request failed');
    }
  }

  // ============================================
  // WALLET MANAGEMENT
  // ============================================

  /**
   * Get all user wallet assets (fiat and crypto)
   * @param {string} type - Optional filter: 'FIAT' or 'CRYPTO'
   * @returns {Promise<Array>} List of wallet assets with balances
   */
  async getUserWallets(type = null) {
    try {
      const params = {};
      if (type) params.type = type;

      const response = await this.makeRequest('GET', '/v1/assets', null, params);
      return response.assets || response.data || (Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Failed to get user wallets:', error.message);
      throw error;
    }
  }

  /**
   * Get specific wallet asset by ID
   * @param {string} assetId - Wallet asset ID
   * @returns {Promise<Object>} Wallet asset details
   */
  async getWalletAsset(assetId) {
    try {
      const response = await this.makeRequest('GET', `/v1/assets/${assetId}`);
      return response;
    } catch (error) {
      console.error(`Failed to get wallet asset ${assetId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get wallet asset address for deposits (crypto)
   * @param {string} assetId - Wallet asset ID
   * @param {string} network - Network (for crypto): Solana, Ethereum, etc.
   * @returns {Promise<Object>} Wallet address details
   */
  async getWalletAddress(assetId, network = null) {
    try {
      const params = {};
      if (network) params.network = network;

      const response = await this.makeRequest('GET', `/v1/assets/${assetId}/address`, null, params);
      return response;
    } catch (error) {
      console.error(`Failed to get wallet address for ${assetId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get wallet transactions for a specific asset
   * @param {string} assetId - Wallet asset ID
   * @param {Object} filters - Query filters (pageNumber, pageSize, fromDate, toDate, status, etc.)
   * @returns {Promise<Object>} Paginated transactions
   */
  async getWalletTransactions(assetId, filters = {}) {
    try {
      const response = await this.makeRequest('GET', `/v1/assets/${assetId}/transactions`, null, filters);
      return response;
    } catch (error) {
      console.error(`Failed to get wallet transactions for ${assetId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get all transactions across all wallets
   * @param {Object} filters - Query filters
   * @returns {Promise<Object>} Paginated transactions
   */
  async getAllTransactions(filters = {}) {
    try {
      const response = await this.makeRequest('GET', '/v1/assets/transactions', null, filters);
      return response;
    } catch (error) {
      console.error('Failed to get all transactions:', error.message);
      throw error;
    }
  }

  /**
   * Get transaction by reference
   * @param {string} reference - Transaction reference
   * @returns {Promise<Object>} Transaction details
   */
  async getTransactionByReference(reference) {
    try {
      const response = await this.makeRequest('GET', `/v1/assets/transactions/${reference}`);
      return response;
    } catch (error) {
      console.error(`Failed to get transaction ${reference}:`, error.message);
      throw error;
    }
  }

  /**
   * Swap user assets (convert between currencies)
   * @param {Object} params - Swap parameters
   * @returns {Promise<Object>} Swap result
   */
  async swapAssets(params) {
    try {
      console.log('Swapping assets:', JSON.stringify(params, null, 2));
      const response = await this.makeRequest('POST', '/v1/assets/convert', params);
      return response;
    } catch (error) {
      console.error('Failed to swap assets:', error.message);
      throw error;
    }
  }

  // ============================================
  // COLLECTIONS (ON-RAMP) - Receiving Payments
  // ============================================

  /**
   * Create crypto collection address (for receiving crypto deposits)
   * @param {Object} params - Collection address parameters
   * @param {string} params.assetId - Wallet asset ID
   * @param {string} params.currency - Currency code (USDC, etc.)
   * @param {string} params.network - Blockchain network (Solana, etc.)
   * @param {string} params.customId - Your internal user/resource ID
   * @returns {Promise<Object>} Crypto collection address
   */
  async createCryptoCollectionAddress({ assetId, currency, network, customId }) {
    try {
      // Default to USDC on Solana if not specified
      currency = currency || 'USDC';
      network = network || 'SOL';  // HostFi expects "SOL" not "Solana"

      const payload = { assetId, currency, network, customId };

      console.log('Creating crypto collection address with payload:', JSON.stringify(payload, null, 2));

      const response = await this.makeRequest('POST', '/v1/collections/crypto/addresses', payload);
      return response;
    } catch (error) {
      console.error('Failed to create crypto collection address:', error.message);
      if (error.hostfiError) {
        console.error('HostFi error details:', JSON.stringify(error.hostfiError, null, 2));
      }
      throw error;
    }
  }

  /**
   * Get crypto collection addresses
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} List of crypto collection addresses
   */
  async getCryptoCollectionAddresses(filters = {}) {
    try {
      const response = await this.makeRequest('GET', '/v1/collections/crypto/addresses', null, filters);
      return response.records || response.addresses || response.data || (Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Failed to get crypto collection addresses:', error.message);
      throw error;
    }
  }

  /**
   * Get crypto collection address by ID
   * @param {string} addressId - Collection address ID
   * @returns {Promise<Object>} Collection address details
   */
  async getCryptoCollectionAddress(addressId) {
    try {
      const response = await this.makeRequest('GET', `/v1/collections/crypto/addresses/${addressId}`);
      return response;
    } catch (error) {
      console.error(`Failed to get crypto collection address ${addressId}:`, error.message);
      throw error;
    }
  }

  /**
   * Create fiat collection channel (bank account for receiving fiat deposits)
   * @param {Object} params - Collection channel parameters
   * @param {string} params.assetId - Wallet asset ID to credit
   * @param {string} params.currency - Currency code (NGN, KES, etc.)
   * @param {string} params.customId - Your internal user/resource ID
   * @param {string} params.type - Channel type ('payment' or 'collection')
   * @param {string} params.method - Payment method ('bank_transfer', 'mobile_money', etc.)
   * @param {string} params.countryCode - Country code (NG, KE, etc.)
   * @returns {Promise<Object>} Bank account details for deposits
   */
  async createFiatCollectionChannel({ assetId, currency, customId, type, method, countryCode }) {
    try {
      // Per HostFi: type="STATIC" or "DYNAMIC", method="BANK_TRANSFER"
      // DYNAMIC = Temporary account (no KYC), STATIC = Fixed account (requires KYC)
      const payload = {
        assetId,
        currency,
        customId,
        type: type || 'DYNAMIC',
        method: method || 'BANK_TRANSFER',
        countryCode
      };

      console.log('[HostFi Service] Creating fiat collection channel with payload:', JSON.stringify(payload, null, 2));

      const response = await this.makeRequest('POST', '/v1/collections/fiat/channels', payload);
      return response;
    } catch (error) {
      console.error('Failed to create fiat collection channel:', error.message);
      if (error.hostfiError) {
        console.error('HostFi error details:', JSON.stringify(error.hostfiError, null, 2));
      }
      throw error;
    }
  }

  /**
   * Get all fiat collection channels
   * @param {Object} filters - Optional filters (method, currency, accountName, accountNumber)
   * @returns {Promise<Array>} List of collection channels
   */
  async getFiatCollectionChannels(filters = {}) {
    try {
      console.log('[HostFi Service] Fetching fiat collection channels with filters:', JSON.stringify(filters));
      const response = await this.makeRequest('GET', '/v1/collections/fiat/channels', null, filters);

      console.log('[HostFi Service] Raw response keys:', Object.keys(response));

      // HostFi returns channels in 'records' array
      const channels = response.records || response.channels || response.data || (Array.isArray(response) ? response : []);

      console.log(`[HostFi Service] Extracted ${channels.length} channels`);

      return channels;
    } catch (error) {
      console.error('[HostFi Service] Failed to get fiat collection channels:', error.message);
      throw error;
    }
  }

  /**
   * Get collection transaction by ID
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<Object>} Transaction details
   */
  async getCollectionTransaction(transactionId) {
    try {
      const response = await this.makeRequest('GET', `/v1/collections/transactions/${transactionId}`);
      return response;
    } catch (error) {
      console.error(`Failed to get collection transaction ${transactionId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get all collection transactions (fiat and crypto deposits)
   * @param {Object} filters - Optional filters (status, currency, pageSize, pageNumber, etc.)
   * @returns {Promise<Object>} Paginated collection transactions
   */
  async getCollectionTransactions(filters = {}) {
    try {
      const response = await this.makeRequest('GET', '/v1/collections/transactions', null, filters);
      return response;
    } catch (error) {
      console.error('Failed to get collection transactions:', error.message);
      throw error;
    }
  }

  /**
   * Get fiat collection transactions (bank deposits)
   * @param {Object} filters - Optional filters
   * @returns {Promise<Object>} Paginated fiat collection transactions
   */
  async getFiatCollectionTransactions(filters = {}) {
    try {
      const response = await this.makeRequest('GET', '/v1/collections/fiat/transactions', null, filters);
      return response;
    } catch (error) {
      console.error('Failed to get fiat collection transactions:', error.message);
      throw error;
    }
  }

  // ============================================
  // PAYMENTS (OFF-RAMP) - Sending Payments/Withdrawals
  // ============================================

  /**
   * Get withdrawal methods for currency pair
   * @param {string} sourceCurrency - Source currency (wallet currency)
   * @param {string} targetCurrency - Target currency (payout currency)
   * @returns {Promise<Array>} Available withdrawal methods
   */
  async getWithdrawalMethods(sourceCurrency, targetCurrency) {
    try {
      const params = { sourceCurrency, targetCurrency };
      const response = await this.makeRequest('GET', '/v1/payout/methods', null, params);
      // Hanle direct array or nested methods property
      if (Array.isArray(response)) return response;
      if (response && response.methods && Array.isArray(response.methods)) return response.methods;
      if (response && response.data && Array.isArray(response.data)) return response.data;
      return [];
    } catch (error) {
      console.error('Failed to get withdrawal methods:', error.message);
      throw error;
    }
  }

  /**
   * Get saved withdrawal accounts (beneficiaries)
   * @param {string} type - Optional filter: BANK, MOMO, CRYPTO
   * @returns {Promise<Array>} List of saved accounts
   */
  async getSavedWithdrawalAccounts(type = null) {
    try {
      const params = {};
      if (type) params.type = type;

      const response = await this.makeRequest('GET', '/v1/payout/accounts', null, params);
      return response.accounts || response.data || (Array.isArray(response) ? response : []);
    } catch (error) {
      console.error('Failed to get saved withdrawal accounts:', error.message);
      throw error;
    }
  }

  /**
   * Get all withdrawal transactions
   * @param {Object} filters - Query filters (status, fromDate, toDate, reference)
   * @returns {Promise<Object>} Paginated withdrawals
   */
  async getWithdrawalTransactions(filters = {}) {
    try {
      const response = await this.makeRequest('GET', '/v1/payout/transactions', null, filters);
      return response;
    } catch (error) {
      console.error('Failed to get withdrawal transactions:', error.message);
      throw error;
    }
  }

  /**
   * Initiate withdrawal (bank transfer or mobile money)
   * Automatically deducts 1% platform fee
   * @param {Object} params - Withdrawal parameters
   * @param {string} params.walletAssetId - Source wallet asset ID
   * @param {number} params.amount - Amount to withdraw
   * @param {string} params.currency - Currency code
   * @param {string} params.methodId - Payment method (BANK_TRANSFER, MOMO)
   * @param {Object} params.recipient - Recipient details
   * @param {string} params.clientReference - Your unique reference
   * @returns {Promise<Object>} Withdrawal response with fee details
   */
  async initiateWithdrawal({ walletAssetId, amount, currency, methodId, recipient, clientReference }) {
    try {
      // Calculate platform fee (1%)
      const feeBreakdown = this.calculatePlatformFee(amount);

      const payload = {
        assetId: walletAssetId,
        amount: feeBreakdown.amountAfterFee,
        currency,
        methodId,
        clientReference,
        memo: `Withdrawal of ${amount} ${currency}`,
        recipient: {
          type: methodId === 'BANK_TRANSFER' ? 'BANK' : (methodId === 'MOBILE_MONEY' ? 'MOMO' : 'CRYPTO'),
          method: methodId,
          currency: recipient.currency || currency,
          accountNumber: recipient.accountNumber,
          accountName: recipient.accountName || 'Verified Recipient',
          bankId: recipient.bankId,
          bankName: recipient.bankName,
          country: recipient.country || 'NG',
          accountType: 'SAVINGS',
          beneficiaryType: 'INDIVIDUAL'
        }
      };

      console.log('Initiating HostFi withdrawal:', {
        clientReference,
        originalAmount: amount,
        platformFee: feeBreakdown.platformFee,
        amountAfterFee: feeBreakdown.amountAfterFee,
        currency,
        methodId
      });
      console.log('HostFi Withdrawal Payload:', JSON.stringify(payload, null, 2));

      const response = await this.makeRequest('POST', '/v1/payout/transactions', payload);

      // Return response with fee breakdown
      return {
        ...response.data,
        feeBreakdown
      };
    } catch (error) {
      console.error('Withdrawal initiation failed:', error.message);
      throw error;
    }
  }

  /**
   * Get withdrawal transaction by reference
   * @param {string} reference - Transaction reference
   * @returns {Promise<Object>} Withdrawal details
   */
  async getWithdrawalByReference(reference) {
    try {
      const response = await this.makeRequest('GET', `/v1/payout/transactions/${reference}`);
      return response;
    } catch (error) {
      console.error(`Failed to get withdrawal ${reference}:`, error.message);
      throw error;
    }
  }

  /**
   * Get list of banks for a country
   * @param {string} countryCode - ISO country code (NG, KE, etc.)
   * @returns {Promise<Array>} List of banks
   */
  async getBanksList(countryCode) {
    try {
      const response = await this.makeRequest('GET', `/v1/payout/banks/${countryCode}/list`);
      // Handle direct array or nested banks property
      if (Array.isArray(response)) return response;
      if (response && response.banks && Array.isArray(response.banks)) return response.banks;
      if (response && response.data && Array.isArray(response.data)) return response.data;
      return [];
    } catch (error) {
      console.error(`Failed to get banks list for ${countryCode}:`, error.message);
      throw error;
    }
  }

  /**
   * Lookup and validate bank account
   * @param {Object} params - Lookup parameters
   * @param {string} params.country - Country code
   * @param {string} params.bankId - Bank ID
   * @param {string} params.accountNumber - Account number
   * @returns {Promise<Object>} Account name and validation result
   */
  async lookupBankAccount({ country, bankId, accountNumber }) {
    try {
      const payload = { country, bankId, accountNumber };

      const response = await this.makeRequest('POST', '/v1/payout/accounts/lookup', payload);
      return response;
    } catch (error) {
      console.error('Bank account lookup failed:', error.message);
      throw new Error(error.message || 'Invalid account details');
    }
  }

  // ============================================
  // CURRENCY & RATES
  // ============================================

  /**
   * Get currency exchange rates
   * @param {string} fromCurrency - Source currency
   * @param {string} toCurrency - Target currency
   * @returns {Promise<Object>} Exchange rate info
   */
  async getCurrencyRates(fromCurrency, toCurrency, silent = false) {
    try {
      const params = { fromCurrency, toCurrency };
      const response = await this.makeRequest('GET', '/v1/conversions', null, params, silent);
      return response;
    } catch (error) {
      if (!silent) {
        console.error('Failed to get currency rates:', error.message);
      }
      throw error;
    }
  }

  /**
   * Get exchange fees
   * @param {string} sourceCurrency - Source currency
   * @param {string} targetCurrency - Target currency
   * @param {string} type - Transaction type (exchange, withdrawal)
   * @returns {Promise<Object>} Fee information
   */
  async getExchangeFees(sourceCurrency, targetCurrency, type = 'exchange') {
    try {
      const params = { sourceCurrency, targetCurrency, type };
      const response = await this.makeRequest('GET', '/v1/fees', null, params);
      return response;
    } catch (error) {
      console.error('Failed to get exchange fees:', error.message);
      throw error;
    }
  }

  async getSupportedCurrencies() {
    try {
      // Get payment currencies which includes crypto networks info
      let response = await this.makeRequest('GET', '/v1/pay/currencies');
      console.log(`[HostFi Service:getSupportedCurrencies] Response type: ${Array.isArray(response) ? 'array' : typeof response}`);

      let currencies = [];
      if (Array.isArray(response)) {
        currencies = response;
      } else if (response && response.currencies && Array.isArray(response.currencies)) {
        currencies = response.currencies;
      } else if (response && response.data && Array.isArray(response.data)) {
        currencies = response.data;
      } else if (response && response.data && response.data.currencies && Array.isArray(response.data.currencies)) {
        currencies = response.data.currencies;
      }

      // Secondary fallback to assets list if pay currencies is empty
      if (currencies.length === 0) {
        console.log('[HostFi Service:getSupportedCurrencies] Pay currencies empty, trying /v1/assets fallback...');
        const assetsResponse = await this.makeRequest('GET', '/v1/assets');
        if (Array.isArray(assetsResponse)) {
          currencies = assetsResponse;
        } else if (assetsResponse && assetsResponse.assets && Array.isArray(assetsResponse.assets)) {
          currencies = assetsResponse.assets;
        } else if (assetsResponse && assetsResponse.data && Array.isArray(assetsResponse.data)) {
          currencies = assetsResponse.data;
        }
      }

      console.log(`[HostFi Service:getSupportedCurrencies] Final count: ${currencies.length}`);
      return currencies;
    } catch (error) {
      console.error('Failed to get supported currencies:', error.message);
      throw error;
    }
  }

  // ============================================
  // WEBHOOKS
  // ============================================

  /**
   * Verify webhook signature
   * @param {string} signature - Webhook signature from headers
   * @param {Object} payload - Webhook payload
   * @returns {boolean} True if signature is valid
   */
  verifyWebhookSignature(signature, payload) {
    if (!this.webhookSecret) {
      console.warn('HostFi webhook secret not configured, skipping verification');
      return true;
    }

    // The signature argument contains the x-auth-secret from the controller
    const authSecret = signature;

    // Simple string comparison as per HostFi docs
    return authSecret === this.webhookSecret;
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Format amount for display
   * @param {number} amount - Amount to format
   * @param {string} currency - Currency code
   * @returns {string} Formatted amount
   */
  formatAmount(amount, currency) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Get country name from code
   * @param {string} code - ISO country code
   * @returns {string} Country name
   */
  getCountryName(code) {
    const countries = {
      'NG': 'Nigeria',
      'KE': 'Kenya',
      'GH': 'Ghana',
      'ZA': 'South Africa',
      'TZ': 'Tanzania',
      'UG': 'Uganda',
      'ZM': 'Zambia',
      'RW': 'Rwanda',
      'SN': 'Senegal',
      'CM': 'Cameroon',
      'EG': 'Egypt',
      'MA': 'Morocco',
      'TN': 'Tunisia',
      'DZ': 'Algeria',
      'ET': 'Ethiopia',
      'US': 'United States',
      'GB': 'United Kingdom',
      'EU': 'Europe',
      'FR': 'France',
      'DE': 'Germany',
      'IN': 'India',
      'BR': 'Brazil',
      'CA': 'Canada',
      'JP': 'Japan',
      'CN': 'China',
      'AE': 'United Arab Emirates',
      'SA': 'Saudi Arabia',
      'AU': 'Australia',
      'NZ': 'New Zealand'
    };

    return countries[code] || code;
  }
}

module.exports = new HostFiService();
