const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const crypto = require('crypto');
const breadConfig = require('../config/bread');

/**
 * bread.africa Service
 * Handles fiat onramp/offramp operations via bread.africa API
 */
class BreadService {
  constructor() {
    this.apiUrl = breadConfig.apiUrl;
    this.serviceKey = breadConfig.serviceKey;
    this.accountCode = breadConfig.accountCode;
    this.webhookSecret = breadConfig.webhookSecret;

    // Create axios instance with bread.africa configuration
    this.api = axios.create({
      baseURL: this.apiUrl,
      headers: breadConfig.getHeaders(),
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
        console.warn(`bread.africa API retry attempt ${retryCount} for ${requestConfig.url}`);
      }
    });
  }

  /**
   * Get current exchange rate between currencies
   * @param {string} fromCurrency - Source currency (e.g., 'NGN')
   * @param {string} toCurrency - Target currency (e.g., 'USDC')
   * @param {number} amount - Amount to convert
   * @returns {Promise<Object>} Exchange rate data
   */
  async getExchangeRate(fromCurrency, toCurrency, amount) {
    try {
      const response = await this.api.get('/exchange-rate', {
        params: {
          from: fromCurrency,
          to: toCurrency,
          amount: amount
        }
      });

      return {
        fromCurrency,
        toCurrency,
        rate: response.data.rate,
        amount,
        convertedAmount: response.data.convertedAmount,
        fee: response.data.fee || 0,
        expiresAt: response.data.expiresAt || new Date(Date.now() + 5 * 60 * 1000)
      };
    } catch (error) {
      console.error('Exchange rate fetch failed:', error.message);

      // Fallback to approximate rate if API fails (NGN to USDC)
      if (fromCurrency === 'NGN' && toCurrency === 'USDC') {
        const approximateRate = 1600; // Approximate 1 USDC = 1600 NGN
        return {
          fromCurrency,
          toCurrency,
          rate: approximateRate,
          amount,
          convertedAmount: amount / approximateRate,
          fee: 0,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          fallback: true
        };
      }

      throw new Error(`Failed to fetch exchange rate: ${error.message}`);
    }
  }

  /**
   * Initiate bank transfer onramp
   * @param {Object} data - Onramp request data
   * @returns {Promise<Object>} Onramp transaction details
   */
  async initiateBankTransferOnramp(data) {
    try {
      const { userId, amountNGN, userEmail, userName } = data;

      // Validate amount
      const validation = breadConfig.validateOnrampAmount(amountNGN);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Get exchange rate
      const rateData = await this.getExchangeRate('NGN', 'USDC', amountNGN);

      const requestData = {
        type: 'onramp',
        paymentMethod: 'bank_transfer',
        amount: amountNGN,
        currency: 'NGN',
        targetCurrency: 'USDC',
        targetAmount: rateData.convertedAmount,
        exchangeRate: rateData.rate,
        userReference: userId,
        email: userEmail,
        name: userName,
        metadata: {
          platform: 'myartelab',
          userId: userId
        }
      };

      const response = await this.api.post('/onramp/bank-transfer', requestData);

      return {
        paymentId: response.data.id || response.data.paymentId,
        status: response.data.status,
        amountNGN,
        amountUSDC: rateData.convertedAmount,
        exchangeRate: rateData.rate,
        paymentInstructions: {
          accountNumber: response.data.accountNumber,
          accountName: response.data.accountName,
          bankName: response.data.bankName,
          reference: response.data.reference,
          expiresAt: response.data.expiresAt
        },
        createdAt: response.data.createdAt || new Date()
      };
    } catch (error) {
      console.error('Bank transfer onramp failed:', error.message);
      throw new Error(`Failed to initiate bank transfer: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Initiate mobile money onramp
   * @param {Object} data - Onramp request data
   * @returns {Promise<Object>} Onramp transaction details
   */
  async initiateMobileMoneyOnramp(data) {
    try {
      const { userId, amountNGN, provider, phoneNumber, userEmail, userName } = data;

      // Validate amount
      const validation = breadConfig.validateOnrampAmount(amountNGN);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Get exchange rate
      const rateData = await this.getExchangeRate('NGN', 'USDC', amountNGN);

      const requestData = {
        type: 'onramp',
        paymentMethod: 'mobile_money',
        amount: amountNGN,
        currency: 'NGN',
        targetCurrency: 'USDC',
        targetAmount: rateData.convertedAmount,
        exchangeRate: rateData.rate,
        provider: provider,
        phoneNumber: phoneNumber,
        userReference: userId,
        email: userEmail,
        name: userName,
        metadata: {
          platform: 'myartelab',
          userId: userId
        }
      };

      const response = await this.api.post('/onramp/mobile-money', requestData);

      return {
        paymentId: response.data.id || response.data.paymentId,
        status: response.data.status,
        amountNGN,
        amountUSDC: rateData.convertedAmount,
        exchangeRate: rateData.rate,
        provider,
        paymentInstructions: {
          ussdCode: response.data.ussdCode,
          phoneNumber: response.data.phoneNumber,
          reference: response.data.reference,
          instructions: response.data.instructions,
          expiresAt: response.data.expiresAt
        },
        createdAt: response.data.createdAt || new Date()
      };
    } catch (error) {
      console.error('Mobile money onramp failed:', error.message);
      throw new Error(`Failed to initiate mobile money deposit: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Initiate bank offramp (withdrawal)
   * @param {Object} data - Offramp request data
   * @returns {Promise<Object>} Offramp transaction details
   */
  async initiateOfframp(data) {
    try {
      const { userId, amountUSDC, bankCode, accountNumber, accountName, userEmail, userName } = data;

      // Validate amount
      const validation = breadConfig.validateOfframpAmount(amountUSDC);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Get exchange rate
      const rateData = await this.getExchangeRate('USDC', 'NGN', amountUSDC);

      const requestData = {
        type: 'offramp',
        paymentMethod: 'bank_transfer',
        amount: amountUSDC,
        currency: 'USDC',
        targetCurrency: 'NGN',
        targetAmount: rateData.convertedAmount,
        exchangeRate: rateData.rate,
        bankCode: bankCode,
        accountNumber: accountNumber,
        accountName: accountName,
        userReference: userId,
        email: userEmail,
        name: userName,
        metadata: {
          platform: 'myartelab',
          userId: userId
        }
      };

      const response = await this.api.post('/offramp/bank', requestData);

      return {
        withdrawalId: response.data.id || response.data.withdrawalId,
        status: response.data.status || 'processing',
        amountUSDC,
        amountNGN: rateData.convertedAmount,
        exchangeRate: rateData.rate,
        fee: response.data.fee || 0,
        bankDetails: {
          accountNumber,
          accountName,
          bankCode,
          bankName: response.data.bankName
        },
        estimatedTime: response.data.estimatedTime || '24-48 hours',
        createdAt: response.data.createdAt || new Date()
      };
    } catch (error) {
      console.error('Bank offramp failed:', error.message);
      throw new Error(`Failed to initiate bank withdrawal: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Initiate mobile money offramp (withdrawal)
   * @param {Object} data - Offramp request data
   * @returns {Promise<Object>} Offramp transaction details
   */
  async initiateMobileMoneyOfframp(data) {
    try {
      const { userId, amountUSDC, provider, phoneNumber, userEmail, userName } = data;

      // Validate amount
      const validation = breadConfig.validateOfframpAmount(amountUSDC);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Get exchange rate
      const rateData = await this.getExchangeRate('USDC', 'NGN', amountUSDC);

      const requestData = {
        type: 'offramp',
        paymentMethod: 'mobile_money',
        amount: amountUSDC,
        currency: 'USDC',
        targetCurrency: 'NGN',
        targetAmount: rateData.convertedAmount,
        exchangeRate: rateData.rate,
        provider: provider,
        phoneNumber: phoneNumber,
        userReference: userId,
        email: userEmail,
        name: userName,
        metadata: {
          platform: 'myartelab',
          userId: userId
        }
      };

      const response = await this.api.post('/offramp/mobile-money', requestData);

      return {
        withdrawalId: response.data.id || response.data.withdrawalId,
        status: response.data.status || 'processing',
        amountUSDC,
        amountNGN: rateData.convertedAmount,
        exchangeRate: rateData.rate,
        fee: response.data.fee || 0,
        provider,
        phoneNumber,
        estimatedTime: response.data.estimatedTime || '1-2 hours',
        createdAt: response.data.createdAt || new Date()
      };
    } catch (error) {
      console.error('Mobile money offramp failed:', error.message);
      throw new Error(`Failed to initiate mobile money withdrawal: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Verify bank account details
   * @param {string} bankCode - Bank code
   * @param {string} accountNumber - Account number
   * @returns {Promise<Object>} Account verification result
   */
  async verifyBankAccount(bankCode, accountNumber) {
    try {
      const response = await this.api.post('/verify-bank-account', {
        bankCode,
        accountNumber
      });

      return {
        valid: response.data.valid !== false,
        accountName: response.data.accountName,
        accountNumber: accountNumber,
        bankCode: bankCode,
        bankName: response.data.bankName
      };
    } catch (error) {
      console.error('Bank account verification failed:', error.message);
      throw new Error(`Failed to verify bank account: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get list of supported banks
   * @returns {Promise<Array>} List of banks
   */
  async getSupportedBanks() {
    try {
      const response = await this.api.get('/banks');
      return response.data.banks || response.data || [];
    } catch (error) {
      console.error('Failed to fetch banks:', error.message);
      // Return empty array if API fails
      return [];
    }
  }

  /**
   * Check transaction status
   * @param {string} transactionId - Transaction/Payment ID
   * @returns {Promise<Object>} Transaction status
   */
  async checkTransactionStatus(transactionId) {
    try {
      const response = await this.api.get(`/transactions/${transactionId}`);

      return {
        id: response.data.id,
        status: response.data.status,
        type: response.data.type,
        amount: response.data.amount,
        currency: response.data.currency,
        createdAt: response.data.createdAt,
        completedAt: response.data.completedAt,
        failedReason: response.data.failedReason
      };
    } catch (error) {
      console.error('Transaction status check failed:', error.message);
      throw new Error(`Failed to check transaction status: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Handle webhook event from bread.africa
   * @param {Object} eventData - Webhook event data
   * @returns {Promise<Object>} Processed event result
   */
  async handleWebhookEvent(eventData) {
    try {
      const { event, data } = eventData;

      switch (event) {
        case breadConfig.events.ONRAMP_SUCCESS:
          return await this.handleOnrampSuccess(data);

        case breadConfig.events.ONRAMP_FAILED:
          return await this.handleOnrampFailed(data);

        case breadConfig.events.OFFRAMP_SUCCESS:
          return await this.handleOfframpSuccess(data);

        case breadConfig.events.OFFRAMP_FAILED:
          return await this.handleOfframpFailed(data);

        default:
          console.warn(`Unknown webhook event: ${event}`);
          return { processed: false, reason: 'Unknown event type' };
      }
    } catch (error) {
      console.error('Webhook event handling failed:', error.message);
      throw error;
    }
  }

  /**
   * Handle successful onramp webhook
   * @param {Object} data - Event data
   * @returns {Promise<Object>} Processing result
   */
  async handleOnrampSuccess(data) {
    return {
      processed: true,
      event: 'onramp.success',
      paymentId: data.id || data.paymentId,
      userId: data.userReference || data.metadata?.userId,
      amountUSDC: data.targetAmount,
      amountNGN: data.amount,
      exchangeRate: data.exchangeRate,
      completedAt: data.completedAt || new Date()
    };
  }

  /**
   * Handle failed onramp webhook
   * @param {Object} data - Event data
   * @returns {Promise<Object>} Processing result
   */
  async handleOnrampFailed(data) {
    return {
      processed: true,
      event: 'onramp.failed',
      paymentId: data.id || data.paymentId,
      userId: data.userReference || data.metadata?.userId,
      failedReason: data.failedReason || data.reason,
      failedAt: data.failedAt || new Date()
    };
  }

  /**
   * Handle successful offramp webhook
   * @param {Object} data - Event data
   * @returns {Promise<Object>} Processing result
   */
  async handleOfframpSuccess(data) {
    return {
      processed: true,
      event: 'offramp.success',
      withdrawalId: data.id || data.withdrawalId,
      userId: data.userReference || data.metadata?.userId,
      amountUSDC: data.amount,
      amountNGN: data.targetAmount,
      exchangeRate: data.exchangeRate,
      transactionHash: data.transactionHash,
      completedAt: data.completedAt || new Date()
    };
  }

  /**
   * Handle failed offramp webhook
   * @param {Object} data - Event data
   * @returns {Promise<Object>} Processing result
   */
  async handleOfframpFailed(data) {
    return {
      processed: true,
      event: 'offramp.failed',
      withdrawalId: data.id || data.withdrawalId,
      userId: data.userReference || data.metadata?.userId,
      failedReason: data.failedReason || data.reason,
      failedAt: data.failedAt || new Date()
    };
  }

  /**
   * Verify webhook signature
   * @param {string} payload - Raw request body
   * @param {string} signature - Signature from header
   * @returns {boolean} Verification result
   */
  verifyWebhookSignature(payload, signature) {
    try {
      if (!this.webhookSecret) {
        console.warn('Webhook secret not configured, skipping signature verification');
        return true; // Allow in development
      }

      const hmac = crypto.createHmac('sha256', this.webhookSecret);
      const digest = hmac.update(payload).digest('hex');

      // Timing-safe comparison
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(digest)
      );
    } catch (error) {
      console.error('Webhook signature verification failed:', error.message);
      return false;
    }
  }
}

module.exports = new BreadService();
