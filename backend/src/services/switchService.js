const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const switchConfig = require('../config/switch');

/**
 * Switch Service - Global Offramp/Onramp for 60+ Countries
 * Stablecoin orchestrator with multi-chain support
 */
class SwitchService {
  constructor() {
    this.apiUrl = switchConfig.apiUrl;
    this.serviceKey = switchConfig.serviceKey;
    this.webhookSecret = switchConfig.webhookSecret;

    // Create axios instance with Switch configuration
    this.api = axios.create({
      baseURL: this.apiUrl,
      headers: switchConfig.getHeaders(),
      timeout: 30000
    });

    // Configure retry logic for transient failures
    axiosRetry(this.api, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
               (error.response && error.response.status >= 500);
      },
      onRetry: (retryCount, error, requestConfig) => {
        console.warn(`Switch API retry attempt ${retryCount} for ${requestConfig.url}`);
      }
    });
  }

  // ==================== Coverage & Discovery ====================

  /**
   * Get all supported countries for offramp/onramp
   * @param {string} direction - 'OFFRAMP' or 'ONRAMP'
   * @param {string} country - Optional country filter
   * @param {string} currency - Optional currency filter
   * @returns {Promise<Array>} List of supported countries with rails
   */
  async getCoverage(direction = 'OFFRAMP', country = null, currency = null) {
    try {
      const params = { direction };
      if (country) params.country = country;
      if (currency) params.currency = currency;

      const response = await this.api.get('/coverage', { params });
      return response.data.data;
    } catch (error) {
      console.error('Failed to get coverage:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to fetch supported countries');
    }
  }

  /**
   * Get list of banks/institutions for a specific country
   * @param {string} country - ISO 3166-1 alpha-2 country code
   * @returns {Promise<Array>} List of banks with code, name, and icon
   */
  async getInstitutions(country) {
    try {
      const response = await this.api.get('/institution', {
        params: { country }
      });

      return response.data.data || [];
    } catch (error) {
      console.error(`Failed to get institutions for ${country}:`, error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to fetch banks');
    }
  }

  /**
   * Get dynamic field requirements for a country
   * @param {string} country - ISO country code
   * @param {string} direction - 'OFFRAMP' or 'ONRAMP'
   * @param {string} type - 'INDIVIDUAL' or 'BUSINESS'
   * @param {string} currency - Optional currency code
   * @returns {Promise<Array>} List of required fields with validation rules
   */
  async getRequirements(country, direction = 'OFFRAMP', type = 'INDIVIDUAL', currency = null) {
    try {
      const params = { country, direction, type };
      if (currency) params.currency = currency;

      const response = await this.api.get('/requirement', { params });
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to get requirements:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to fetch field requirements');
    }
  }

  // ==================== Offramp (Withdrawal) ====================

  /**
   * Get offramp quote (exchange rate and fees)
   * @param {number} amount - Amount to convert
   * @param {string} country - Destination country code
   * @param {string} asset - Blockchain asset (e.g., 'solana:usdc')
   * @param {string} currency - Optional currency code (defaults to country's local currency)
   * @param {string} rail - Optional payment rail
   * @param {boolean} exactOutput - If true, amount is the output amount
   * @returns {Promise<Object>} Quote with rate, fees, and settlement info
   */
  async getOfframpQuote(amount, country, asset = 'solana:usdc', currency = null, rail = null, exactOutput = false) {
    try {
      const payload = {
        amount,
        direction: 'OFFRAMP',
        country,
        asset,
        exact_output: exactOutput
      };

      if (currency) payload.currency = currency;
      if (rail) payload.rail = rail;

      const response = await this.api.post('/quote', payload);
      return response.data.data;
    } catch (error) {
      console.error('Failed to get offramp quote:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to get quote');
    }
  }

  /**
   * Execute offramp withdrawal
   * @param {Object} params - Offramp parameters
   * @param {number} params.amount - Amount to withdraw
   * @param {string} params.country - Destination country
   * @param {string} params.asset - Blockchain asset
   * @param {string} params.currency - Optional currency
   * @param {Object} params.beneficiary - Beneficiary details
   * @param {string} params.reference - Unique transaction reference
   * @param {string} params.callbackUrl - Webhook callback URL
   * @param {string} params.senderName - Optional sender name
   * @param {string} params.rail - Optional payment rail
   * @param {boolean} params.exactOutput - If true, amount is output amount
   * @returns {Promise<Object>} Offramp response
   */
  async executeOfframp({
    amount,
    country,
    asset = 'solana:usdc',
    currency = null,
    beneficiary,
    reference,
    callbackUrl,
    senderName = null,
    rail = null,
    exactOutput = false
  }) {
    try {
      const payload = {
        amount,
        country,
        asset,
        beneficiary: {
          holder_type: beneficiary.holderType || 'INDIVIDUAL',
          holder_name: beneficiary.holderName,
          account_number: beneficiary.accountNumber,
          bank_code: beneficiary.bankCode,
          ...beneficiary.additionalFields // Dynamic fields per country
        },
        reference,
        callback_url: callbackUrl,
        exact_output: exactOutput
      };

      if (currency) payload.currency = currency;
      if (senderName) payload.sender_name = senderName;
      if (rail) payload.rail = rail;

      console.log('Executing offramp:', { reference, country, amount, asset });

      const response = await this.api.post('/offramp', payload);
      return response.data;
    } catch (error) {
      console.error('Offramp execution failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to execute offramp');
    }
  }

  // ==================== Onramp (Deposit) ====================

  /**
   * Get onramp quote
   * @param {number} amount - Amount to deposit
   * @param {string} country - Source country code
   * @param {string} asset - Blockchain asset to receive
   * @param {string} currency - Optional source currency
   * @param {string} rail - Optional payment rail
   * @param {boolean} exactOutput - If true, amount is the output amount
   * @returns {Promise<Object>} Quote with rate and fees
   */
  async getOnrampQuote(amount, country, asset = 'solana:usdc', currency = null, rail = null, exactOutput = false) {
    try {
      const payload = {
        amount,
        direction: 'ONRAMP',
        country,
        asset,
        exact_output: exactOutput
      };

      if (currency) payload.currency = currency;
      if (rail) payload.rail = rail;

      const response = await this.api.post('/quote', payload);
      return response.data.data;
    } catch (error) {
      console.error('Failed to get onramp quote:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to get quote');
    }
  }

  /**
   * Execute onramp deposit (fiat to crypto)
   * @param {Object} params - Onramp parameters
   * @param {number} params.amount - Amount in fiat currency
   * @param {string} params.country - Source country code
   * @param {string} params.asset - Target blockchain asset (e.g., 'solana:usdc')
   * @param {string} params.currency - Optional fiat currency
   * @param {string} params.walletAddress - Recipient wallet address
   * @param {string} params.reference - Unique transaction reference
   * @param {string} params.callbackUrl - Webhook callback URL
   * @param {string} params.holderName - Optional account holder name
   * @param {string} params.rail - Optional payment rail
   * @param {boolean} params.exactOutput - If true, amount is output amount
   * @returns {Promise<Object>} Onramp response with virtual account details
   */
  async executeOnramp({
    amount,
    country,
    asset = 'solana:usdc',
    currency = null,
    walletAddress,
    reference,
    callbackUrl,
    holderName = null,
    rail = null,
    exactOutput = false
  }) {
    try {
      const payload = {
        amount,
        country,
        asset,
        beneficiary: {
          holder_type: 'INDIVIDUAL',
          holder_name: holderName || 'User',
          wallet_address: walletAddress
        },
        reference,
        callback_url: callbackUrl,
        exact_output: exactOutput
      };

      if (currency) payload.currency = currency;
      if (rail) payload.rail = rail;

      console.log('Executing onramp:', { reference, country, amount, asset, walletAddress });

      const response = await this.api.post('/onramp', payload);
      return response.data;
    } catch (error) {
      console.error('Onramp execution failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to execute onramp');
    }
  }

  // ==================== Asset Information ====================

  /**
   * Get supported assets/cryptocurrencies
   * @returns {Promise<Array>} List of supported blockchain assets
   */
  async getAssets() {
    try {
      const response = await this.api.get('/asset');
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to get assets:', error.response?.data || error.message);
      // Return default assets if API fails
      return switchConfig.getSupportedAssets();
    }
  }

  // ==================== Helper Methods ====================

  /**
   * Verify webhook signature
   * @param {string} signature - Webhook signature from headers
   * @param {Object} payload - Webhook payload
   * @returns {boolean} True if signature is valid
   */
  verifyWebhookSignature(signature, payload) {
    if (!this.webhookSecret) {
      console.warn('Webhook secret not configured, skipping verification');
      return true;
    }

    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    hmac.update(JSON.stringify(payload));
    const expectedSignature = hmac.digest('hex');

    return signature === expectedSignature;
  }

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
      'IN': 'India',
      'BR': 'Brazil',
      'PH': 'Philippines',
      'CA': 'Canada',
      'AE': 'United Arab Emirates'
      // Add more as needed
    };

    return countries[code] || code;
  }
}

module.exports = new SwitchService();
