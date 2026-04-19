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
    // Use env var first, fallback to constants default
    const { PLATFORM_CONFIG } = require('../utils/constants');
    this.platformWalletAddress = process.env.PLATFORM_WALLET_ADDRESS || PLATFORM_CONFIG.PLATFORM_WALLET_ADDRESS;
    console.log(`[HostFi Service] Platform wallet configured: ${this.platformWalletAddress?.substring(0, 10)}...`);
    
    // No reserve needed - HostFi handles fees automatically
    this.swapFeeReserve = 0;

    // Token cache
    this.accessToken = null;
    this.tokenExpiry = null;

    // Currency swap pairs cache
    this.swapPairs = null;
    this.swapPairsCacheExpiry = null;

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
    const feePercent = 0; // Removed platform fee for on-ramp
    const fee = (amount * feePercent) / 100;
    const amountAfterFee = amount - fee;

    return {
      originalAmount: amount,
      platformFee: 0,
      platformFeePercent: 0,
      amountAfterFee: amount,
      platformWallet: this.platformWalletAddress,
      feeType: 'on-ramp'
    };
  }

  /**
   * Calculate off-ramp fee (1% - charged when users withdraw)
   * @param {number} amount - Withdrawal amount
   * @returns {Object} Fee breakdown
   */
  calculateOffRampFee(amount) {
    const feePercent = 0; // Removed platform fee for off-ramp
    const fee = (amount * feePercent) / 100;
    const amountAfterFee = amount - fee;

    return {
      originalAmount: amount,
      platformFee: 0,
      platformFeePercent: 0,
      amountAfterFee: amount,
      platformWallet: this.platformWalletAddress,
      feeType: 'off-ramp'
    };
  }

  /**
   * Get HostFi swap fee reserve amount
   * This is the amount we keep to cover HostFi swap fees
   * @returns {number} Swap fee reserve in USDC
   */
  getSwapFeeReserve() {
    return this.swapFeeReserve;
  }

  /**
   * Get minimum withdrawal amount for a currency from HostFi
   * @param {string} currency - Currency code
   * @returns {number} Minimum amount
   */
  getMinimumWithdrawalAmount(currency) {
    const minimums = {
      'NGN': 1000,     // HostFi requires min ₦1000 for NGN bank withdrawals
      'KES': 100,
      'GHS': 10,
      'USDC': 1,
      'USDT': 1,
      'SOL': 0.01
    };
    return minimums[currency.toUpperCase()] || 10;
  }

  /**
   * Get exchange fees from HostFi API
   * @param {string} sourceCurrency - Source currency
   * @param {string} targetCurrency - Target currency
   * @param {number} amount - Amount to convert
   * @returns {Promise<Object>} Fee information including network fees
   */
  async getSwapFees(sourceCurrency, targetCurrency, amount) {
    try {
      const params = { 
        sourceCurrency, 
        targetCurrency, 
        amount,
        type: 'swap'
      };
      const response = await this.makeRequest('GET', '/v1/fees', null, params, true);
      return response;
    } catch (error) {
      console.log(`[HostFi Service] Could not get swap fees: ${error.message}`);
      // Return zero fees - let HostFi handle it and return actual error if insufficient
      return { 
        networkFee: 0, 
        platformFee: 0, 
        totalFee: 0,
        estimated: true 
      };
    }
  }

  /**
   * Automatically transfer platform commission (1% fee) to platform wallet
   * @param {Object} params - commission parameters
   * @param {string} params.assetId - Source wallet asset ID
   * @param {number} params.amount - commission amount to transfer
   * @param {string} params.currency - Currency code
   * @param {string} params.clientReference - Unique reference
   * @returns {Promise<Object>} Payout response
   */
  async collectCommission({ assetId, amount, currency, clientReference }) {
    if (!this.platformWalletAddress) {
      console.warn('PLATFORM_WALLET_ADDRESS not configured, skipping commission transfer');
      return { skipped: true, reason: 'No platform wallet' };
    }

    if (Number(amount) <= 0) {
      console.log('[HostFi Service] Commission amount is 0, skipping transfer');
      return { skipped: true, reason: 'Zero amount' };
    }

    try {
      console.log(`[HostFi Service] Collecting ${amount} ${currency} commission to ${this.platformWalletAddress}`);

      const payload = {
        assetId,
        clientReference: clientReference || `FEE-${Date.now()}`,
        methodId: 'CRYPTO', // Standard crypto transfer method
        amount: Number(amount),
        currency,
        recipient: {
          type: 'CRYPTO',
          method: 'CRYPTO',
          currency,
          address: this.platformWalletAddress,
          network: 'SOL', // Target Solana USDC wallet
          country: 'NG'
        },
        memo: `Platform Commission (1%) for transaction ${clientReference}`
      };

      const response = await this.makeRequest('POST', '/v1/payout/transactions', payload);
      return response;
    } catch (error) {
      console.error('[HostFi Service] Failed to collect commission:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Transfer platform fee (10%) to platform wallet
   * Called when booking/project funds are released - transfers from client wallet
   * @param {Object} params - Transfer parameters
   * @param {string} params.clientAssetId - Client's HostFi wallet asset ID (source)
   * @param {number} params.amount - Platform fee amount to transfer
   * @param {string} params.currency - Currency code (USDC, etc.)
   * @param {string} params.reference - Unique reference (bookingId or projectId)
   * @returns {Promise<Object>} Transfer response
   */
  async transferPlatformFee({ clientAssetId, amount, currency, reference }) {
    if (!this.platformWalletAddress) {
      console.warn('[HostFi Service] PLATFORM_WALLET_ADDRESS not configured, skipping platform fee transfer');
      return { skipped: true, reason: 'No platform wallet address' };
    }

    if (!clientAssetId) {
      console.warn('[HostFi Service] No client asset ID provided, skipping platform fee transfer');
      return { skipped: true, reason: 'No client wallet' };
    }

    if (Number(amount) <= 0) {
      console.log('[HostFi Service] Platform fee amount is 0, skipping transfer');
      return { skipped: true, reason: 'Zero amount' };
    }

    try {
      console.log(`[HostFi Service] Transferring platform fee: ${amount} ${currency} from client to ${this.platformWalletAddress}`);

      // For crypto transfers, HostFi requires accountNumber to be the wallet address
      const payload = {
        assetId: clientAssetId,
        clientReference: `PLATFORM-FEE-${reference}-${Date.now()}`,
        methodId: 'CRYPTO',
        amount: Number(amount),
        currency: currency.toUpperCase(),
        recipient: {
          type: 'CRYPTO',
          method: 'CRYPTO',
          currency: currency.toUpperCase(),
          accountNumber: this.platformWalletAddress, // Required for crypto
          address: this.platformWalletAddress,
          network: 'SOL',
          country: 'NG',
          accountName: 'Platform Wallet',
          accountType: 'SAVINGS'
        },
        memo: `Platform Fee 10% for ${reference}`
      };
      
      console.log(`[HostFi Service] Platform fee payload:`, JSON.stringify(payload, null, 2));

      const response = await this.makeRequest('POST', '/v1/payout/transactions', payload);
      console.log(`[HostFi Service] ✓ Platform fee transfer initiated:`, response.reference || response.id);
      return response;
    } catch (error) {
      console.error('[HostFi Service] Failed to transfer platform fee:', error.message);
      throw error;
    }
  }

  /**
   * Parse HostFi webhook payload into a normalized object
   * @param {Object} payload - Raw webhook payload
   * @returns {Object} Normalized data
   */
  parseWebhookData(payload) {
    const data = payload.data || payload;
    const event = payload.event || payload.type || '';

    // Extract metadata as a map for easier lookup
    // Support both {key: value} and [{name: 'key', value: 'val'}] formats
    let metadataMap = {};
    if (Array.isArray(data.metadata)) {
      data.metadata.forEach(item => {
        const key = item.name || item.key;
        if (key && item.value !== undefined) {
          metadataMap[key] = item.value;
        }
      });
    } else if (data.metadata && typeof data.metadata === 'object') {
      metadataMap = data.metadata;
    }

    // Amount can be direct value or object { value, currency }
    const amountVal = data.amount?.value !== undefined ? parseFloat(data.amount.value) : (typeof data.amount === 'number' ? data.amount : (data.amount ? parseFloat(data.amount) : 0));
    const currencyVal = data.amount?.currency || data.currency || metadataMap.currency || (data.asset?.currency?.code || data.asset?.currency) || 'NGN';

    // Status mapping (standardize to HostFi's or ours)
    const rawStatus = (data.status || '').toUpperCase();

    return {
      event,
      eventType: event,
      data,
      metadata: metadataMap,
      id: data.id || payload.id || data.reference,
      status: rawStatus,
      amount: amountVal,
      currency: currencyVal,
      reference: data.reference,
      clientReference: data.clientReference || metadataMap.clientReference || metadataMap.customId || metadataMap.identifier,
      customId: data.customId || metadataMap.customId || metadataMap.userId,
      network: data.network || metadataMap.network,
      txHash: data.txHash || data.transactionId || metadataMap.transactionId || metadataMap.sessionId
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

      // HostFi doc says: { "token": "...", "expiresIn": 3600 }
      this.accessToken = response.data.token;
      const expiresIn = response.data.expiresIn || 3600;
      this.tokenExpiry = Date.now() + (expiresIn * 1000);

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
      // Response is usually { assets: [...] } or direct array
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
      // Align with HostFi V1/V2 swap structure: { source: { currency, assetId }, target: { currency, assetId }, amount: { value, currency } }
      const payload = params.source ? params : {
        source: {
          currency: params.fromCurrency || params.sourceCurrency,
          assetId: params.fromAssetId || params.sourceAssetId
        },
        target: {
          currency: params.toCurrency || params.targetCurrency,
          assetId: params.toAssetId || params.targetAssetId
        },
        amount: {
          value: Number(params.amount),
          currency: params.fromCurrency || params.sourceCurrency || params.amountCurrency
        },
        category: params.category || 'SWAP'
      };

      console.log('Swapping assets with payload:', JSON.stringify(payload, null, 2));
      const response = await this.makeRequest('POST', '/v1/assets/swap', payload);
      return response;
    } catch (error) {
      console.error('Failed to swap assets:', error.message);
      throw error;
    }
  }

  /**
   * Replay webhooks for a specific period
   * @param {Object} params - Replay parameters (fromDate, toDate, category)
   * @returns {Promise<Object>} Success message
   */
  async replayWebhooks(params) {
    try {
      const response = await this.makeRequest('POST', '/v1/assets/webhooks/replay', params);
      return response;
    } catch (error) {
      console.error('Failed to replay webhooks:', error.message);
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
  async createCryptoCollectionAddress({ assetId, currency, network, customId, async: asyncParam }) {
    try {
      // Default to USDC on SOL if not specified
      currency = currency || 'USDC';
      network = network || 'SOL';

      const payload = {
        assetId,
        customId: customId.toString(),
        network: network || 'SOL',
        async: asyncParam !== false // Default to true if not specified
      };

      console.log('Creating crypto collection address with payload:', JSON.stringify(payload, null, 2));

      const response = await this.makeRequest('POST', '/v1/collections/crypto/addresses', payload);
      // Response structure: { "id": "uuid", "address": "...", "network": "...", "currency": "...", "qrCode": "..." }
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
      // DYNAMIC = Temporary account (no KYC required in payload)
      const config = this.getCurrencyConfig(currency || 'NGN');

      const payload = {
        type: type || 'STATIC',
        method: method || config.method,
        assetId,
        customId: customId.toString(),
        currency: currency || 'NGN',
        countryCode: countryCode || config.country
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

  // ============================================
  // HOST+ PAY (CHECKOUT / V2)
  // ============================================

  /**
   * Get supported payment currencies
   * @returns {Promise<Object>} List of supported currencies
   */
  async getPayCurrencies() {
    try {
      const response = await this.makeRequest('GET', '/v1/pay/currencies');
      return response.currencies || response;
    } catch (error) {
      console.error('Failed to get pay currencies:', error.message);
      throw error;
    }
  }

  /**
   * Create a new pay sub-address for a user (unique per user)
   * @param {Object} params - Creation parameters
   * @param {string} params.currency - Currency code (USDC, etc.)
   * @param {string} params.network - Blockchain network (SOL, etc.)
   * @param {string} params.identifier - Unique identifier for this user (customId)
   * @returns {Promise<Object>} Created sub-address details including assetId
   */
  async createPaySubAddress({ currency = 'USDC', network = 'SOL', identifier }) {
    try {
      const payload = {
        currency,
        network,
        identifier: identifier.toString()
      };

      console.log(`[HostFi Service] Creating pay sub-address for identifier ${identifier}:`, payload);
      const response = await this.makeRequest('POST', '/v1/pay/addresses', payload);
      console.log(`[HostFi Service] ✓ Created pay sub-address:`, response.id);
      return response;
    } catch (error) {
      console.error(`[HostFi Service] Failed to create pay sub-address for ${identifier}:`, error.message);
      throw error;
    }
  }

  /**
   * Assign or update an assigned address
   * @param {string} subAddressId - ID of sub-address to assign
   * @returns {Promise<Object>} Assignment details
   */
  async assignPayAddress(subAddressId) {
    try {
      const response = await this.makeRequest('POST', `/v1/pay/address/${subAddressId}/assign`);
      return response;
    } catch (error) {
      console.error(`Failed to assign pay address ${subAddressId}:`, error.message);
      throw error;
    }
  }

  /**
   * Unassign a payment address
   * @param {string} subAddressId - ID of sub-address to unassign
   * @returns {Promise<Object>} Success status
   */
  async unassignPayAddress(subAddressId) {
    try {
      const response = await this.makeRequest('POST', `/v1/pay/address/${subAddressId}/unassign`);
      return response;
    } catch (error) {
      console.error(`Failed to unassign pay address ${subAddressId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get all assigned payment addresses
   * @param {Object} filters - Optional filters (network, subAddress, page, size)
   * @returns {Promise<Object>} Paginated addresses
   */
  async getPayAddresses(filters = {}) {
    try {
      const response = await this.makeRequest('GET', '/v1/pay/addresses', null, filters);
      return response;
    } catch (error) {
      console.error('Failed to get pay addresses:', error.message);
      throw error;
    }
  }

  /**
   * Get available payment address (Create payment transaction)
   * @param {Object} params - Transaction parameters (email, phoneNumber, identifier, currency, network, amount, feeBearer, memo)
   * @returns {Promise<Object>} Available address and transaction ID
   */
  async createPaymentTransaction(params) {
    try {
      if (!params.identifier) {
        console.warn('identifier (custom reference) is recommended for payment transactions');
      }
      const response = await this.makeRequest('POST', '/v1/pay/transactions', params);
      return response;
    } catch (error) {
      console.error('Failed to create payment transaction:', error.message);
      throw error;
    }
  }

  /**
   * Get payment transactions
   * @param {Object} filters - Query filters (identifier, currency, network, page, size)
   * @returns {Promise<Object>} Paginated payment transactions
   */
  async getPaymentTransactions(filters = {}) {
    try {
      const response = await this.makeRequest('GET', '/v1/pay/transactions', null, filters);
      return response;
    } catch (error) {
      console.error('Failed to get payment transactions:', error.message);
      throw error;
    }
  }

  /**
   * Get a payment transaction by ID or custom identifier
   * @param {string} id - Transaction ID or custom identifier
   * @returns {Promise<Object>} Transaction details
   */
  async getPaymentTransactionById(id) {
    try {
      const response = await this.makeRequest('GET', `/v1/pay/transactions/${id}`);
      return response;
    } catch (error) {
      console.error(`Failed to get payment transaction ${id}:`, error.message);
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
      console.log(`[HostFi Service] getWithdrawalMethods response:`, JSON.stringify(response, null, 2));
      // Handle { methods: [...] } structure from HostFi API
      if (response && response.methods && Array.isArray(response.methods)) return response.methods;
      if (Array.isArray(response)) return response;
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
   * No platform fees - HostFi handles network fees
   * @param {Object} params - Withdrawal parameters
   * @param {string} params.walletAssetId - Source wallet asset ID
   * @param {number} params.amount - Amount to withdraw
   * @param {string} params.currency - Currency code
   * @param {string} params.methodId - Payment method (BANK_TRANSFER, MOMO)
   * @param {Object} params.recipient - Recipient details
   * @param {string} params.clientReference - Your unique reference
   * @returns {Promise<Object>} Withdrawal response with fee details
   */
  async initiateWithdrawal({ walletAssetId, amount, currency, methodId, recipient, clientReference, memo }) {
    // Track swap state for potential rollback logging
    let swapCompleted = false;
    let swapDetails = null;
    
    try {
      const isCryptoPayout = recipient.type === 'CRYPTO' || methodId === 'CRYPTO';
      console.log(`[HostFi Service] ============================================`);
      console.log(`[HostFi Service] INITIATING WITHDRAWAL: ${amount} ${currency}`);
      console.log(`[HostFi Service] Reference: ${clientReference}`);
      console.log(`[HostFi Service] ============================================`);

      // Use full amount - HostFi handles their own fees
      const payoutAmount = amount;

      // Automatic Currency Conversion (Off-ramp Flow)
      // If source currency (USDC) != target currency (NGN, etc.), perform swap first
      const targetCurrency = (recipient.currency || currency).toUpperCase();
      const sourceCurrency = currency.toUpperCase();
      let effectiveAssetId = walletAssetId;
      let effectiveAmount = payoutAmount;
      let effectiveCurrency = sourceCurrency;

      console.log(`[HostFi Service] Swap check: source=${sourceCurrency}, target=${targetCurrency}, isCrypto=${isCryptoPayout}`);

      // STEP 1: CURRENCY SWAP (if needed)
      if (sourceCurrency !== targetCurrency && !isCryptoPayout) {
        console.log(`[HostFi Service] Step 1/3: Currency swap required (${sourceCurrency} -> ${targetCurrency})`);
        
        // Get user's wallets to find target asset
        const assets = await this.getUserWallets();
        console.log(`[HostFi Service] Found ${assets.length} wallet assets`);
        
        const targetAsset = assets.find(a => {
          const code = (a.currencyCode || (a.currency && a.currency.code) || a.currency || '').toUpperCase();
          return code === targetCurrency;
        });

        if (!targetAsset) {
          throw new Error(`Target currency ${targetCurrency} asset not found in wallet. Please ensure you have a ${targetCurrency} wallet.`);
        }

        console.log(`[HostFi Service] Target asset found: ${targetAsset.id || targetAsset.assetId}`);

        // Swap the full payout amount
        const swapAmount = Number(payoutAmount);
        
        console.log(`[HostFi Service] Executing swap: ${swapAmount} ${sourceCurrency} -> ${targetCurrency}`);

        // Perform Swap with timeout handling
        let swapResult;
        try {
          swapResult = await this.swapAssets({
            source: { currency: sourceCurrency, assetId: walletAssetId },
            target: { currency: targetCurrency, assetId: targetAsset.id || targetAsset.assetId },
            amount: { value: swapAmount, currency: sourceCurrency },
            category: 'SWAP'
          });
        } catch (swapError) {
          console.error(`[HostFi Service] SWAP FAILED:`, swapError.message);
          throw new Error(`Currency conversion failed: ${swapError.message}. Your funds are safe in your ${sourceCurrency} wallet.`);
        }

        console.log(`[HostFi Service] Swap result received:`, JSON.stringify(swapResult, null, 2));

        // Update parameters for final payout
        effectiveAssetId = targetAsset.id || targetAsset.assetId;
        
        // Extract target amount from swap response - try multiple paths
        let swappedAmount = null;
        
        // Path 1: Check transactions array for CREDIT tx
        if (swapResult.transactions && Array.isArray(swapResult.transactions)) {
          const creditTx = swapResult.transactions.find(tx => 
            tx.type === 'CREDIT' && (tx.status === 'SUCCESS' || tx.status === 'COMPLETED')
          );
          if (creditTx && creditTx.amount) {
            swappedAmount = parseFloat(creditTx.amount.value || creditTx.amount);
            console.log(`[HostFi Service] Extracted amount from CREDIT transaction: ${swappedAmount}`);
          }
        }
        
        // Path 2: Check common response fields
        if (!swappedAmount) {
          swappedAmount = swapResult.data?.targetAmount?.value || 
                         swapResult.data?.amount?.value ||
                         swapResult.data?.destinationAmount ||
                         swapResult.targetAmount?.value || 
                         swapResult.destinationAmount ||
                         swapResult.amount?.value;
          if (swappedAmount) {
            console.log(`[HostFi Service] Extracted amount from response fields: ${swappedAmount}`);
          }
        }
        
        // Validate swap result
        if (!swappedAmount || swappedAmount <= 0) {
          console.error(`[HostFi Service] Invalid swap result. Full response:`, JSON.stringify(swapResult));
          throw new Error(`Swap failed: Could not convert ${swapAmount} ${sourceCurrency} to ${targetCurrency}. Please contact support if funds were deducted.`);
        }
        
        effectiveAmount = swappedAmount;
        effectiveCurrency = targetCurrency;
        swapCompleted = true;
        swapDetails = {
          sourceAmount: swapAmount,
          sourceCurrency,
          targetAmount: swappedAmount,
          targetCurrency,
          swapReference: swapResult.id || swapResult.reference
        };

        console.log(`[HostFi Service] ✓ Swap successful: ${swapAmount} ${sourceCurrency} → ${effectiveAmount} ${effectiveCurrency}`);
        
        // Wait for swap to settle in HostFi's system
        console.log(`[HostFi Service] Waiting 2 seconds for swap settlement...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // IMPORTANT: Check actual NGN balance after swap (HostFi deducts fees)
        // The swap result shows gross amount, but fees reduce available balance
        console.log(`[HostFi Service] Checking actual ${targetCurrency} balance after swap...`);
        const walletsAfterSwap = await this.getUserWallets();
        const targetWalletAfterSwap = walletsAfterSwap.find(a => {
          const code = (a.currencyCode || (a.currency && a.currency.code) || a.currency || '').toUpperCase();
          return code === targetCurrency;
        });
        
        if (targetWalletAfterSwap) {
          const actualBalanceAfterSwap = parseFloat(targetWalletAfterSwap.balance || 0);
          console.log(`[HostFi Service] Actual ${targetCurrency} balance after swap: ${actualBalanceAfterSwap}`);
          console.log(`[HostFi Service] Swap result amount: ${effectiveAmount}`);
          
          // ALWAYS use actual wallet balance (what HostFi actually credited)
          // The swap result shows gross, but actual balance is what we can use
          // Reserve ~100 NGN buffer for HostFi payout fees (NGN fee is typically 100)
          const feeBuffer = targetCurrency === 'NGN' ? 100 : 0;
          const availableForPayout = Math.max(0, actualBalanceAfterSwap - feeBuffer);
          
          console.log(`[HostFi Service] Fee buffer: ${feeBuffer} ${targetCurrency}`);
          console.log(`[HostFi Service] Available for payout: ${availableForPayout} ${targetCurrency}`);
          
          if (availableForPayout < effectiveAmount) {
            console.log(`[HostFi Service] Adjusting payout amount from ${effectiveAmount} to ${availableForPayout} (available after fees)`);
            effectiveAmount = availableForPayout;
            swapDetails.targetAmount = availableForPayout;
          }
        }
        
        // Validate minimum amount for NGN
        if (targetCurrency === 'NGN' && effectiveAmount < 1000) {
          throw new Error(`Minimum withdrawal amount is ₦1,000 NGN. You have ₦${effectiveAmount.toFixed(2)} available after swap. Please add more USDC to your wallet.`);
        }
      }

      // STEP 2: PREPARE PAYOUT
      console.log(`[HostFi Service] Step 2/3: Preparing payout...`);
      const config = this.getCurrencyConfig(effectiveCurrency);
      const payoutMethod = methodId || config.method;

      // Strict sanitization for HostFi (avoids 403 Forbidden)
      const nameSanitize = (str) => typeof str === 'string' ? str.replace(/[^a-zA-Z0-9\s]/g, '').substring(0, 50).trim() : '';
      const memoSanitize = (str) => typeof str === 'string' ? str.replace(/[^a-zA-Z0-9]/g, '').substring(0, 12) : '';

      const safeMemo = memoSanitize(memo) || `Payout${Date.now().toString().substring(10)}`;

      // Normalize recipient type (HostFi expects BANK, MOMO, or CRYPTO)
      let normalizedType = recipient.type || (payoutMethod === 'BANK_TRANSFER' ? 'BANK' : (payoutMethod === 'MOBILE_MONEY' ? 'MOMO' : (payoutMethod === 'EFT' ? 'BANK' : 'CRYPTO')));
      if (normalizedType === 'BANK_TRANSFER' || normalizedType === 'EFT') normalizedType = 'BANK';
      if (normalizedType === 'MOBILE_MONEY') normalizedType = 'MOMO';

      // For crypto transfers, use address as accountNumber (required by HostFi)
      const isCrypto = normalizedType === 'CRYPTO' || payoutMethod === 'CRYPTO';
      const accountNumber = isCrypto && recipient.address ? recipient.address : recipient.accountNumber;
      
      // Validate that we have an accountNumber
      if (!accountNumber) {
        throw new Error(`Missing required field: accountNumber. For crypto transfers, recipient.address is required.`);
      }
      
      const payload = {
        assetId: effectiveAssetId,
        clientReference,
        methodId: payoutMethod,
        amount: Number(effectiveAmount),
        currency: effectiveCurrency,
        recipient: {
          type: normalizedType,
          method: payoutMethod,
          currency: effectiveCurrency,
          accountNumber: accountNumber,
          accountName: nameSanitize(recipient.accountName || 'Verified Recipient').substring(0, 50),
          bankId: recipient.bankId,
          bankName: nameSanitize(recipient.bankName),
          country: recipient.country || config.country,
          accountType: recipient.accountType || 'SAVINGS',
          network: recipient.network,
          address: recipient.address,
          memo: memoSanitize(recipient.memo || safeMemo)
        },
        memo: safeMemo
      };

      console.log(`[HostFi Service] Payout payload:`, JSON.stringify(payload, null, 2));

      // STEP 3: EXECUTE PAYOUT
      console.log(`[HostFi Service] Step 3/3: Executing payout...`);
      
      let response;
      try {
        response = await this.makeRequest('POST', '/v1/payout/transactions', payload);
      } catch (payoutError) {
        console.error(`[HostFi Service] PAYOUT FAILED:`, payoutError.message);
        
        // If swap was completed but payout failed, we need to inform the user
        // The funds are now in the target currency wallet (e.g., NGN)
        if (swapCompleted) {
          console.error(`[HostFi Service] CRITICAL: Swap completed but payout failed!`);
          console.error(`[HostFi Service] Funds are in ${effectiveCurrency} wallet. Swap details:`, swapDetails);
          
          const enhancedError = new Error(
            `Payout failed after successful currency conversion. ` +
            `Your ${swapDetails.targetAmount} ${effectiveCurrency} is safe in your wallet. ` +
            `Please try the withdrawal again or contact support. ` +
            `Error: ${payoutError.message}`
          );
          enhancedError.swapCompleted = true;
          enhancedError.swapDetails = swapDetails;
          enhancedError.originalError = payoutError;
          throw enhancedError;
        }
        
        throw payoutError;
      }

      console.log(`[HostFi Service] ✓ Payout successful! Reference: ${response.reference || response.id}`);
      console.log(`[HostFi Service] ============================================`);

      return {
        ...response,
        platformFee: 0,
        netAmount: payoutAmount,
        feeBreakdown: { platformFee: 0, networkFee: 0 },
        swapDetails: swapDetails || undefined
      };
    } catch (error) {
      console.error(`[HostFi Service] Withdrawal initiation failed:`, error.message);
      
      // Add context to error for upstream handlers
      if (!error.swapCompleted) {
        error.stage = error.stage || 'unknown';
      }
      
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
      console.log(`[HostFi Service] Fetching banks for country: ${countryCode}`);
      const response = await this.makeRequest('GET', `/v1/payout/banks/${countryCode}/list`);
      console.log(`[HostFi Service] Raw banks response type:`, typeof response, Array.isArray(response) ? 'array' : '');
      console.log(`[HostFi Service] Raw banks response keys:`, Object.keys(response || {}));
      
      // Handle direct array or nested banks property
      let banks = [];
      if (Array.isArray(response)) {
        banks = response;
      } else if (response && response.banks && Array.isArray(response.banks)) {
        banks = response.banks;
      } else if (response && response.data && Array.isArray(response.data)) {
        banks = response.data;
      }
      
      // Map HostFi field names to our expected format (bankId -> id, bankName -> name)
      const mappedBanks = banks.map(bank => ({
        id: bank.bankId || bank.id,
        name: bank.bankName || bank.name,
        code: bank.bankCode || bank.code || bank.bankId
      })).filter(bank => bank.id && bank.name); // Only include banks with both id and name
      
      console.log(`[HostFi Service] Parsed ${banks.length} banks, mapped to ${mappedBanks.length}`);
      if (mappedBanks.length > 0) {
        console.log(`[HostFi Service] First bank sample:`, JSON.stringify(mappedBanks[0]));
      }
      return mappedBanks;
    } catch (error) {
      console.error(`[HostFi Service] Failed to get banks list for ${countryCode}:`, error.message);
      throw error;
    }
  }

  /**
   * Lookup and validate bank account
   * @param {Object} params - Lookup parameters
   * @param {string} params.country - Country code (NG, etc.)
   * @param {string} params.bankId - Bank ID from getBanksList
   * @param {string} params.accountNumber - Bank account number
   * @returns {Promise<Object>} Account verification details
   */
  async lookupBankAccount({ country, bankId, accountNumber }) {
    try {
      const payload = {
        country: country || 'NG',
        bankId,
        accountNumber
      };

      console.log(`[HostFi Service] Looking up bank account: ${accountNumber} in bank ${bankId}`);
      const response = await this.makeRequest('POST', '/v1/payout/accounts/lookup', payload);
      return response.data || response;
    } catch (error) {
      console.error('Bank account lookup failed:', error.message);
      throw error;
    }
  }

  // ============================================
  /**
   * Get default configuration (method, country) for a currency
   * @param {string} currency - Currency code
   * @returns {Object} { country, method }
   */
  getCurrencyConfig(currency) {
    const mapping = {
      // African Countries
      'NGN': { country: 'NG', method: 'BANK_TRANSFER', fiatCurrency: 'NGN' },
      'KES': { country: 'KE', method: 'MOBILE_MONEY', fiatCurrency: 'KES' },
      'GHS': { country: 'GH', method: 'MOBILE_MONEY', fiatCurrency: 'GHS' },
      'ZAR': { country: 'ZA', method: 'EFT', fiatCurrency: 'ZAR' },
      'TZS': { country: 'TZ', method: 'MOBILE_MONEY', fiatCurrency: 'TZS' },
      'UGX': { country: 'UG', method: 'MOBILE_MONEY', fiatCurrency: 'UGX' },
      'ZMW': { country: 'ZM', method: 'MOBILE_MONEY', fiatCurrency: 'ZMW' },
      'RWF': { country: 'RW', method: 'MOBILE_MONEY', fiatCurrency: 'RWF' },
      'XOF': { country: 'SN', method: 'MOBILE_MONEY', fiatCurrency: 'XOF' },
      'XAF': { country: 'CM', method: 'MOBILE_MONEY', fiatCurrency: 'XAF' },
      'EGP': { country: 'EG', method: 'BANK_TRANSFER', fiatCurrency: 'EGP' },

      // Major Currencies
      'USD': { country: 'US', method: 'BANK_TRANSFER', fiatCurrency: 'USD' },
      'EUR': { country: 'FR', method: 'BANK_TRANSFER', fiatCurrency: 'EUR' },
      'GBP': { country: 'GB', method: 'BANK_TRANSFER', fiatCurrency: 'GBP' },
      'CAD': { country: 'CA', method: 'BANK_TRANSFER', fiatCurrency: 'CAD' },
      'AUD': { country: 'AU', method: 'BANK_TRANSFER', fiatCurrency: 'AUD' },
      'JPY': { country: 'JP', method: 'BANK_TRANSFER', fiatCurrency: 'JPY' },

      // Crypto currencies (default to NGN for off-ramp)
      'USDC': { country: 'NG', method: 'BANK_TRANSFER', fiatCurrency: 'NGN' },
      'USDT': { country: 'NG', method: 'BANK_TRANSFER', fiatCurrency: 'NGN' },
      'SOL': { country: 'NG', method: 'CRYPTO', fiatCurrency: 'NGN' }
    };

    return mapping[currency] || { country: 'NG', method: 'BANK_TRANSFER', fiatCurrency: 'NGN' };
  }

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
        console.error(`Failed to get currency rates for ${fromCurrency}/${toCurrency}:`, error.message);
      }

      // Return a predictable structure for errors to avoid breaking callers
      return {
        rate: 0,
        error: error.message,
        unsupported: true
      };
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

    // signature should be x-auth-secret from header
    return signature === this.webhookSecret;
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

  /**
   * Get supported currency swap/conversion pairs
   * Endpoint: GET /v1/currencies/{currencyCode}/pairs
   * Reference: https://api.dev.hostcap.io/v1/currencies/{currencyCode}/pairs
   * @param {string} currency - Currency code (e.g., 'ETH', 'SOL', 'BTC', 'NGN')
   * @returns {Promise<Array>} Array of supported target currency objects or codes
   */
  async getCurrencySwapPairs(currency = null) {
    try {
      // If no currency specified, return cached pairs or fetch all
      if (!currency) {
        if (this.swapPairs && this.swapPairsCacheExpiry && Date.now() < this.swapPairsCacheExpiry) {
          return this.swapPairs;
        }
        // Default to USDC pairs if no currency specified
        currency = 'USDC';
      }

      console.log(`[HostFi Service] Fetching swap pairs for ${currency}...`);
      
      // Use the correct HostFi API endpoint: /v1/currencies/{currencyCode}/pairs
      const response = await this.makeRequest('GET', `/v1/currencies/${currency}/pairs`, null, null, true);
      
      console.log(`[HostFi Service] Swap pairs response for ${currency}:`, JSON.stringify(response).substring(0, 200));

      // Parse response - HostFi returns { pairs: [...] }
      const pairs = response.pairs || response.data?.pairs || response.data || response;
      
      if (!Array.isArray(pairs)) {
        console.warn(`[HostFi Service] Unexpected pairs response format for ${currency}:`, response);
        throw new Error('Invalid response format from pairs API');
      }

      // Cache the response for 1 hour (only for USDC default)
      if (currency === 'USDC' && !this.swapPairsCacheExpiry) {
        this.swapPairs = pairs;
        this.swapPairsCacheExpiry = Date.now() + (60 * 60 * 1000); // 1 hour
      }

      return pairs;
    } catch (error) {
      console.error(`[HostFi Service] Failed to get swap pairs${currency ? ` for ${currency}` : ''}:`, error.message);

      // Fallback to common pairs if API fails
      const fallbackPairs = {
        'ETH': ['USDT', 'USDC'],
        'BTC': ['USDT', 'USDC'],
        'SOL': ['USDT', 'USDC'],
        'USDT': ['USDC', 'NGN'],
        'USDC': [
          { code: 'NGN', name: 'Nigerian Naira', type: 'FIAT', symbol: '₦' },
          { code: 'USDT', name: 'Tether USD', type: 'CRYPTO', symbol: 'USDT' }
        ],
        'NGN': [
          { code: 'USDC', name: 'USD Coin', type: 'CRYPTO', symbol: 'USDC' },
          { code: 'USDT', name: 'Tether USD', type: 'CRYPTO', symbol: 'USDT' }
        ]
      };

      return fallbackPairs[currency] || ['USDT', 'USDC'];
    }
  }

  /**
   * Helper to get a valid conversion target for a source currency
   * Useful when you want to convert to fiat but need to check supported pairs
   * @param {string} fromCurrency - Source currency (e.g., 'ETH', 'SOL')
   * @param {string} preferredTarget - Preferred target currency (e.g., 'USD', 'NGN')
   * @returns {Promise<string>} Valid target currency to use
   */
  async getValidConversionTarget(fromCurrency, preferredTarget = 'USDT') {
    try {
      const supportedPairs = await this.getCurrencySwapPairs(fromCurrency);
      
      // Handle both string array and object array formats
      const getCode = (pair) => typeof pair === 'string' ? pair : pair.code;
      const pairCodes = supportedPairs.map(getCode);

      console.log(`[HostFi Service] Supported pairs for ${fromCurrency}:`, pairCodes.join(', '));

      // If preferred target is supported, use it
      if (pairCodes.includes(preferredTarget)) {
        return preferredTarget;
      }

      // Otherwise, prefer USDT or USDC as intermediary
      if (pairCodes.includes('USDT')) {
        return 'USDT';
      }
      if (pairCodes.includes('USDC')) {
        return 'USDC';
      }

      // Return first available pair
      return pairCodes[0] || preferredTarget;
    } catch (error) {
      console.error(`[HostFi Service] Failed to get valid conversion target for ${fromCurrency}:`, error.message);
      return 'USDT'; // Safe fallback
    }
  }
}

module.exports = new HostFiService();
