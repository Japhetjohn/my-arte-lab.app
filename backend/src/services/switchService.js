const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const switchConfig = require('../config/switch');

/**
 * Switch Service - Primary API for On-Ramp and Off-Ramp
 */
class SwitchService {
  constructor() {
    this.apiUrl = switchConfig.apiUrl;
    this.apiKey = switchConfig.apiKey;

    // Use env var first, fallback to constants default
    const { PLATFORM_CONFIG } = require('../utils/constants');
    this.platformWalletAddress = process.env.PLATFORM_WALLET_ADDRESS || PLATFORM_CONFIG.PLATFORM_WALLET_ADDRESS;
    this.developerFee = 0.5; // Fixed 0.5% backend-injected developer fee

    // Create axios instance
    this.api = axios.create({
      baseURL: this.apiUrl,
      timeout: 30000,
    });

    // Configure retries
    axiosRetry(this.api, {
      retries: 2,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
          (error.response && error.response.status >= 500);
      },
    });
  }

  async makeRequest(method, url, data = null, params = null) {
    const config = {
      method,
      url,
      headers: switchConfig.getHeaders(),
    };

    if (data) config.data = data;
    if (params) config.params = params;

    try {
      const response = await this.api.request(config);
      return response.data;
    } catch (error) {
      const errorData = error.response?.data;
      if (errorData) {
        const err = new Error(errorData.message || 'Switch API Error');
        err.switchError = errorData;
        err.statusCode = error.response.status;
        throw err;
      }
      throw new Error(error.message || 'Switch API request failed');
    }
  }

  /**
   * OFFRAMP: Get Quote
   */
  async getOfframpQuote({ amount, country, currency, asset = 'base:usdc', channel = 'BANK', exactOutput = false }) {
    const payload = {
      amount: Number(amount),
      country,
      currency,
      asset,
      channel,
      exact_output: exactOutput,
      developer_fee: this.developerFee,
      developer_recipient: this.platformWalletAddress,
    };
    return this.makeRequest('POST', '/offramp/quote', payload);
  }

  /**
   * OFFRAMP: Initiate
   */
  async initiateOfframp({ amount, wallet, country, currency, asset = 'base:usdc', beneficiary, channel = 'BANK', reference, callbackUrl }) {
    const payload = {
      amount: Number(amount),
      wallet, // optional
      country,
      currency,
      asset,
      beneficiary, // specific Switch structure
      channel,
      exact_output: false,
      callback_url: callbackUrl,
      reference,
      developer_fee: this.developerFee,
      developer_recipient: this.platformWalletAddress,
      static: false,
    };
    return this.makeRequest('POST', '/offramp/initiate', payload);
  }

  /**
   * ONRAMP: Get Quote
   */
  async getOnrampQuote({ amount, country, currency, asset = 'base:usdc', channel = 'BLOCKCHAIN', exactOutput = false }) {
    const payload = {
      amount: Number(amount),
      country,
      currency,
      asset,
      channel,
      exact_output: exactOutput,
      developer_fee: this.developerFee,
      developer_recipient: this.platformWalletAddress,
    };
    return this.makeRequest('POST', '/onramp/quote', payload);
  }

  /**
   * ONRAMP: Initiate
   */
  async initiateOnramp({ amount, country, currency, asset = 'base:usdc', beneficiary, channel = 'BLOCKCHAIN', reference, callbackUrl }) {
    const payload = {
      amount: Number(amount),
      country,
      currency,
      asset,
      beneficiary, // { holder_type, holder_name, wallet_address }
      channel,
      exact_output: false,
      callback_url: callbackUrl,
      reference,
      developer_fee: this.developerFee,
      developer_recipient: this.platformWalletAddress,
    };
    return this.makeRequest('POST', '/onramp/initiate', payload);
  }
}

module.exports = new SwitchService();
