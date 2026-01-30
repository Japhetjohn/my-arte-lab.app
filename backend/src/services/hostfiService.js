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

    // Platform fee configuration (1% on on-ramp and off-ramp)
    this.platformFeePercent = 1;
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
   * Calculate platform fee
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
  async makeRequest(method, url, data = null, params = null) {
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
      console.error(`HostFi API ${method} ${url} failed:`, error.response?.data || error.message);
      throw new Error(error.response?.data?.message || `HostFi API request failed`);
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
      return response.assets || response.data || [];
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
      return response.data;
    } catch (error) {
      console.error(`Failed to get wallet asset ${assetId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get wallet asset address for deposits
   * @param {string} assetId - Wallet asset ID
   * @param {string} network - Network (for crypto): ERC20, TRC20, BEP20
   * @returns {Promise<Object>} Wallet address details
   */
  async getWalletAddress(assetId, network = null) {
    try {
      const params = {};
      if (network) params.network = network;

      const response = await this.makeRequest('GET', `/v1/assets/${assetId}/address`, null, params);
      return response.data;
    } catch (error) {
      console.error(`Failed to get wallet address for ${assetId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get wallet transactions
   * @param {string} assetId - Wallet asset ID
   * @param {Object} filters - Query filters (pageNumber, pageSize, fromDate, toDate, status, etc.)
   * @returns {Promise<Object>} Paginated transactions
   */
  async getWalletTransactions(assetId, filters = {}) {
    try {
      const response = await this.makeRequest('GET', `/v1/assets/${assetId}/transactions`, null, filters);
      return response.data;
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
      return response.data;
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
      return response.data;
    } catch (error) {
      console.error(`Failed to get transaction ${reference}:`, error.message);
      throw error;
    }
  }

  // ============================================
  // DEPOSITS / ON-RAMP (Fiat Collection)
  // ============================================

  /**
   * Create fiat collection channel (bank account for receiving deposits)
   * @param {Object} params - Collection channel parameters
   * @param {string} params.assetId - Wallet asset ID to credit
   * @param {string} params.currency - Currency code (NGN, USD, etc.)
   * @param {string} params.customId - Your internal user/resource ID
   * @returns {Promise<Object>} Bank account details for deposits
   */
  async createFiatCollectionChannel({ assetId, currency, customId }) {
    try {
      const payload = {
        assetId,
        currency,
        customId
      };

      const response = await this.makeRequest('POST', '/v1/collections/fiat/channels', payload);
      return response.data;
    } catch (error) {
      console.error('Failed to create fiat collection channel:', error.message);
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
      const response = await this.makeRequest('GET', '/v1/collections/fiat/channels', null, filters);
      return response.data || [];
    } catch (error) {
      console.error('Failed to get fiat collection channels:', error.message);
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
      return response.data;
    } catch (error) {
      console.error(`Failed to get collection transaction ${transactionId}:`, error.message);
      throw error;
    }
  }

  // ============================================
  // WITHDRAWALS / OFF-RAMP (Fiat Payout)
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
      return response.data || [];
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
      return response.data || [];
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
      return response.data;
    } catch (error) {
      console.error('Failed to get withdrawal transactions:', error.message);
      throw error;
    }
  }

  /**
   * Initiate withdrawal (bank transfer or mobile money)
   * @param {Object} params - Withdrawal parameters
   * @param {string} params.walletAssetId - Source wallet asset ID
   * @param {number} params.amount - Amount to withdraw
   * @param {string} params.currency - Currency code
   * @param {string} params.methodId - Payment method (BANK_TRANSFER, MOMO)
   * @param {Object} params.recipient - Recipient details
   * @param {string} params.clientReference - Your unique reference
   * @returns {Promise<Object>} Withdrawal response
   */
  async initiateWithdrawal({ walletAssetId, amount, currency, methodId, recipient, clientReference }) {
    try {
      const payload = {
        walletAssetId,
        amount,
        currency,
        methodId,
        recipient,
        clientReference
      };

      console.log('Initiating HostFi withdrawal:', { clientReference, amount, currency, methodId });

      const response = await this.makeRequest('POST', '/v1/payout/transactions', payload);
      return response.data;
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
      return response.data;
    } catch (error) {
      console.error(`Failed to get withdrawal ${reference}:`, error.message);
      throw error;
    }
  }

  /**
   * Get list of banks for a country
   * @param {string} countryCode - ISO country code (NG, US, etc.)
   * @returns {Promise<Array>} List of banks
   */
  async getBanksList(countryCode) {
    try {
      const response = await this.makeRequest('GET', `/v1/payout/banks/${countryCode}/list`);
      return response.data || [];
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
      const payload = {
        country,
        bankId,
        accountNumber
      };

      const response = await this.makeRequest('POST', '/v1/payout/accounts/lookup', payload);
      return response.data;
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
  async getCurrencyRates(fromCurrency, toCurrency) {
    try {
      const params = { fromCurrency, toCurrency };
      const response = await this.makeRequest('GET', '/v1/conversions', null, params);
      return response.data;
    } catch (error) {
      console.error('Failed to get currency rates:', error.message);
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
      return response.data;
    } catch (error) {
      console.error('Failed to get exchange fees:', error.message);
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

    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    hmac.update(JSON.stringify(payload));
    const expectedSignature = hmac.digest('hex');

    return signature === expectedSignature;
  }

  // ============================================
  // CRYPTO ON-RAMP (Fiat to Crypto)
  // ============================================

  /**
   * Get crypto on-ramp quote (Buy crypto with fiat)
   * @param {Object} params - Quote parameters
   * @param {string} params.sourceCurrency - Fiat currency (NGN, KES, GHS, etc.)
   * @param {string} params.targetCurrency - Crypto currency (USDC, SOL, etc.)
   * @param {number} params.sourceAmount - Fiat amount to spend
   * @param {string} params.network - Blockchain network (Solana, Ethereum, etc.)
   * @param {string} params.country - Country code (NG, KE, etc.)
   * @returns {Promise<Object>} Quote with exchange rate and fees
   */
  async getCryptoOnrampQuote({ sourceCurrency, targetCurrency, sourceAmount, network = 'Solana', country }) {
    try {
      const payload = {
        sourceCurrency,
        targetCurrency,
        sourceAmount,
        network,
        country,
        type: 'CRYPTO_ONRAMP'
      };

      const response = await this.makeRequest('POST', '/v1/onramp/quote', payload);
      return response.data;
    } catch (error) {
      console.error('Failed to get crypto onramp quote:', error.message);
      throw error;
    }
  }

  /**
   * Initiate crypto on-ramp transaction (Buy crypto with fiat)
   * @param {Object} params - On-ramp parameters
   * @param {string} params.walletAssetId - Target crypto wallet asset ID
   * @param {string} params.sourceCurrency - Fiat currency
   * @param {string} params.targetCurrency - Crypto currency (USDC, SOL)
   * @param {number} params.sourceAmount - Fiat amount to spend
   * @param {string} params.network - Blockchain network (Solana)
   * @param {string} params.country - Country code
   * @param {string} params.paymentMethod - Payment method (BANK_TRANSFER, MOBILE_MONEY, CARD)
   * @param {string} params.walletAddress - User's destination crypto wallet address
   * @param {string} params.clientReference - Your unique reference
   * @returns {Promise<Object>} On-ramp transaction with payment instructions
   */
  async initiateCryptoOnramp({
    walletAssetId,
    sourceCurrency,
    targetCurrency,
    sourceAmount,
    network = 'Solana',
    country,
    paymentMethod,
    walletAddress,
    clientReference
  }) {
    try {
      const payload = {
        walletAssetId,
        sourceCurrency,
        targetCurrency,
        sourceAmount,
        network,
        country,
        paymentMethod,
        destination: {
          address: walletAddress,
          network
        },
        clientReference
      };

      console.log('Initiating HostFi crypto onramp:', { clientReference, sourceAmount, sourceCurrency, targetCurrency });

      const response = await this.makeRequest('POST', '/v1/onramp/transactions', payload);
      return response.data;
    } catch (error) {
      console.error('Crypto onramp initiation failed:', error.message);
      throw error;
    }
  }

  /**
   * Get crypto on-ramp transaction status
   * @param {string} reference - Transaction reference
   * @returns {Promise<Object>} Transaction details
   */
  async getCryptoOnrampStatus(reference) {
    try {
      const response = await this.makeRequest('GET', `/v1/onramp/transactions/${reference}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to get crypto onramp status ${reference}:`, error.message);
      throw error;
    }
  }

  /**
   * Get list of supported on-ramp countries
   * @returns {Promise<Array>} List of countries with payment methods
   */
  async getOnrampCountries() {
    try {
      const response = await this.makeRequest('GET', '/v1/onramp/countries');
      return response.data || [];
    } catch (error) {
      console.error('Failed to get onramp countries:', error.message);
      throw error;
    }
  }

  /**
   * Get supported payment methods for on-ramp
   * @param {string} country - Country code
   * @param {string} currency - Currency code
   * @returns {Promise<Array>} Available payment methods
   */
  async getOnrampPaymentMethods(country, currency) {
    try {
      const params = { country, currency };
      const response = await this.makeRequest('GET', '/v1/onramp/payment-methods', null, params);
      return response.data || [];
    } catch (error) {
      console.error('Failed to get onramp payment methods:', error.message);
      throw error;
    }
  }

  // ============================================
  // CRYPTO OFF-RAMP (Crypto to Fiat)
  // ============================================

  /**
   * Get crypto off-ramp quote (Sell crypto for fiat)
   * @param {Object} params - Quote parameters
   * @param {string} params.sourceCurrency - Crypto currency (USDC, SOL, etc.)
   * @param {string} params.targetCurrency - Fiat currency (NGN, KES, GHS, etc.)
   * @param {number} params.sourceAmount - Crypto amount to sell
   * @param {string} params.network - Blockchain network (Solana, Ethereum, etc.)
   * @param {string} params.country - Country code (NG, KE, etc.)
   * @returns {Promise<Object>} Quote with exchange rate and fees
   */
  async getCryptoOfframpQuote({ sourceCurrency, targetCurrency, sourceAmount, network = 'Solana', country }) {
    try {
      const payload = {
        sourceCurrency,
        targetCurrency,
        sourceAmount,
        network,
        country,
        type: 'CRYPTO_OFFRAMP'
      };

      const response = await this.makeRequest('POST', '/v1/offramp/quote', payload);
      return response.data;
    } catch (error) {
      console.error('Failed to get crypto offramp quote:', error.message);
      throw error;
    }
  }

  /**
   * Initiate crypto off-ramp transaction (Sell crypto for fiat)
   * @param {Object} params - Off-ramp parameters
   * @param {string} params.walletAssetId - Source crypto wallet asset ID
   * @param {string} params.sourceCurrency - Crypto currency (USDC, SOL)
   * @param {string} params.targetCurrency - Fiat currency
   * @param {number} params.sourceAmount - Crypto amount to sell
   * @param {string} params.network - Blockchain network (Solana)
   * @param {string} params.country - Country code
   * @param {Object} params.recipient - Bank account details
   * @param {string} params.clientReference - Your unique reference
   * @returns {Promise<Object>} Off-ramp transaction with deposit address
   */
  async initiateCryptoOfframp({
    walletAssetId,
    sourceCurrency,
    targetCurrency,
    sourceAmount,
    network = 'Solana',
    country,
    recipient,
    clientReference
  }) {
    try {
      const payload = {
        walletAssetId,
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
      };

      console.log('Initiating HostFi crypto offramp:', { clientReference, sourceAmount, sourceCurrency, targetCurrency });

      const response = await this.makeRequest('POST', '/v1/offramp/transactions', payload);
      return response.data;
    } catch (error) {
      console.error('Crypto offramp initiation failed:', error.message);
      throw error;
    }
  }

  /**
   * Get crypto off-ramp transaction status
   * @param {string} reference - Transaction reference
   * @returns {Promise<Object>} Transaction details
   */
  async getCryptoOfframpStatus(reference) {
    try {
      const response = await this.makeRequest('GET', `/v1/offramp/transactions/${reference}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to get crypto offramp status ${reference}:`, error.message);
      throw error;
    }
  }

  /**
   * Get HostFi's deposit address for crypto off-ramp
   * User sends crypto to this address to initiate off-ramp
   * @param {string} currency - Crypto currency (USDC, SOL)
   * @param {string} network - Blockchain network (Solana)
   * @returns {Promise<Object>} Deposit address and instructions
   */
  async getCryptoOfframpDepositAddress(currency, network = 'Solana') {
    try {
      const params = { currency, network };
      const response = await this.makeRequest('GET', '/v1/offramp/deposit-address', null, params);
      return response.data;
    } catch (error) {
      console.error('Failed to get crypto offramp deposit address:', error.message);
      throw error;
    }
  }

  /**
   * Get list of supported off-ramp countries
   * @returns {Promise<Array>} List of countries with payout methods
   */
  async getOfframpCountries() {
    try {
      const response = await this.makeRequest('GET', '/v1/offramp/countries');
      return response.data || [];
    } catch (error) {
      console.error('Failed to get offramp countries:', error.message);
      throw error;
    }
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
      'US': 'United States',
      'GB': 'United Kingdom',
      'KE': 'Kenya',
      'GH': 'Ghana',
      'ZA': 'South Africa',
      'TZ': 'Tanzania',
      'UG': 'Uganda',
      'ZM': 'Zambia',
      'IN': 'India',
      'BR': 'Brazil',
      'CA': 'Canada',
      'AE': 'United Arab Emirates'
    };

    return countries[code] || code;
  }
}

module.exports = new HostFiService();
