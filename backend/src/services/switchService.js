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

    this.api = axios.create({
      baseURL: this.apiUrl,
      headers: switchConfig.getHeaders(),
      timeout: 30000
    });

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

  /**
   * Lookup and validate account number/mobile number
   * @param {string} country - ISO country code
   * @param {Object} beneficiary - Beneficiary details (account_number, bank_code OR phone_number, mobile_network)
   * @returns {Promise<Object>} Account name and validation result
   */
  async lookupInstitution(country, beneficiary) {
    try {
      const payload = { country, beneficiary };
      const response = await this.api.post('/institution/lookup', payload);
      return response.data.data;
    } catch (error) {
      console.error('Institution lookup failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Invalid account details');
    }
  }

  /**
   * Verify user identity for KYC compliance
   * @param {Object} params - Identity verification parameters
   * @param {string} params.holder_type - 'INDIVIDUAL' or 'BUSINESS'
   * @param {string} params.country - ISO country code
   * @param {string} params.first_name - First name (for individuals)
   * @param {string} params.last_name - Last name (for individuals)
   * @param {string} params.callback_url - Webhook URL for status updates
   * @param {string} params.reference - Unique reference ID
   * @returns {Promise<Object>} KYC verification response with kyc_url
   */
  async verifyIdentity(params) {
    try {
      const response = await this.api.post('/account/identity', params);
      return response.data.data;
    } catch (error) {
      console.error('Identity verification failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to verify identity');
    }
  }

  /**
   * Create virtual bank account for receiving payments
   * @param {Object} params - Virtual account parameters
   * @param {string} params.identity - Identity reference from KYC
   * @param {string} params.currency - Currency code (USD, EUR, etc.)
   * @param {string} params.wallet_address - Wallet address for receiving deposits
   * @param {string} params.asset - Asset identifier (e.g., 'solana:usdc')
   * @param {string} params.callback_url - Webhook URL
   * @param {string} params.reference - Unique reference ID
   * @returns {Promise<Object>} Virtual account details
   */
  async createVirtualAccount(params) {
    try {
      const response = await this.api.post('/account/create', params);
      return response.data.data;
    } catch (error) {
      console.error('Virtual account creation failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to create virtual account');
    }
  }

  /**
   * Confirm payment deposit with blockchain transaction hash
   * @param {string} reference - Transaction reference
   * @param {string} hash - Blockchain transaction hash
   * @returns {Promise<Object>} Confirmation response
   */
  async confirmPayment(reference, hash) {
    try {
      const payload = { reference, hash };
      const response = await this.api.post('/confirm', payload);
      return response.data.data;
    } catch (error) {
      console.error('Payment confirmation failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to confirm payment');
    }
  }


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

      const response = await this.api.post('/offramp/quote', payload);
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

      const response = await this.api.post('/offramp/initiate', payload);
      return response.data;
    } catch (error) {
      console.error('Offramp execution failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to execute offramp');
    }
  }


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
    const payload = {
      amount,
      country,
      asset,
      exact_output: exactOutput
    };

    if (currency) payload.currency = currency;
    if (rail) payload.rail = rail;

    try {
      console.log('Onramp quote request payload:', JSON.stringify(payload, null, 2));
      const response = await this.api.post('/onramp/quote', payload);
      console.log('Onramp quote response:', JSON.stringify(response.data, null, 2));
      return response.data.data;
    } catch (error) {
      console.error('Failed to get onramp quote:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        payload: payload
      });
      throw new Error(error.response?.data?.message || error.response?.data?.error || 'Failed to get quote');
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

      const response = await this.api.post('/onramp/initiate', payload);
      return response.data;
    } catch (error) {
      console.error('Onramp execution failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to execute onramp');
    }
  }


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
      return switchConfig.getSupportedAssets();
    }
  }


  /**
   * Get swap quote for exchanging between two stablecoin assets
   * @param {number} amount - Amount to swap
   * @param {string} fromAsset - Source asset (e.g., 'base:usdc')
   * @param {string} toAsset - Destination asset (e.g., 'solana:usdt')
   * @param {boolean} exactOutput - If true, amount is the output amount
   * @returns {Promise<Object>} Swap quote with rate and fees
   */
  async getSwapQuote(amount, fromAsset, toAsset, exactOutput = false) {
    try {
      const payload = {
        amount,
        from_asset: fromAsset,
        to_asset: toAsset,
        exact_output: exactOutput
      };

      const response = await this.api.post('/swap/quote', payload);
      return response.data.data;
    } catch (error) {
      console.error('Failed to get swap quote:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to get swap quote');
    }
  }

  /**
   * Execute swap transaction between two stablecoin assets
   * @param {Object} params - Swap parameters
   * @param {number} params.amount - Amount to swap
   * @param {string} params.fromAsset - Source asset
   * @param {string} params.toAsset - Destination asset
   * @param {string} params.walletAddress - Recipient wallet address
   * @param {string} params.reference - Unique transaction reference
   * @param {string} params.callbackUrl - Webhook callback URL
   * @param {boolean} params.exactOutput - If true, amount is output amount
   * @returns {Promise<Object>} Swap response with deposit details
   */
  async executeSwap({
    amount,
    fromAsset,
    toAsset,
    walletAddress,
    reference,
    callbackUrl,
    exactOutput = false
  }) {
    try {
      const payload = {
        amount,
        from_asset: fromAsset,
        to_asset: toAsset,
        beneficiary: {
          wallet_address: walletAddress
        },
        reference,
        callback_url: callbackUrl,
        exact_output: exactOutput
      };

      console.log('Executing swap:', { reference, fromAsset, toAsset, amount });

      const response = await this.api.post('/swap/initiate', payload);
      return response.data;
    } catch (error) {
      console.error('Swap execution failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to execute swap');
    }
  }


  /**
   * Get transaction status by reference
   * @param {string} reference - Transaction reference (UUID)
   * @returns {Promise<Object>} Transaction status and details
   */
  async getTransactionStatus(reference) {
    try {
      const response = await this.api.get('/status', {
        params: { reference }
      });
      return response.data.data;
    } catch (error) {
      console.error('Failed to get transaction status:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to fetch transaction status');
    }
  }


  /**
   * Verify bank account and get account name
   * @param {Object} params - Verification parameters
   * @param {string} params.country - Country code
   * @param {string} params.bankCode - Bank code
   * @param {string} params.accountNumber - Account number
   * @returns {Promise<Object>} Account details with name
   */
  async verifyBankAccount({ country, bankCode, accountNumber, phoneNumber, mobileNetwork }) {
    try {
      const beneficiary = {};

      if (bankCode && accountNumber) {
        beneficiary.bank_code = bankCode;
        beneficiary.account_number = accountNumber;
      }

      if (phoneNumber && mobileNetwork) {
        beneficiary.phone_number = phoneNumber;
        beneficiary.mobile_network = mobileNetwork;
      }

      const response = await this.api.post('/institution/lookup', {
        country: country.toUpperCase(),
        beneficiary
      });

      return response.data.data;
    } catch (error) {
      console.error('Failed to verify bank account:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.message || 'Invalid account details. Please check and try again.';
      throw new Error(errorMessage);
    }
  }


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
    };

    return countries[code] || code;
  }
}

module.exports = new SwitchService();
