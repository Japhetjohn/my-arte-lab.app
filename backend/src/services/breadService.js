const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const crypto = require('crypto');
const breadConfig = require('../config/bread');

/**
 * bread.africa Service - CORRECTED Implementation
 * Based on actual bread.africa API documentation
 *
 * Key Flows:
 * - Onramp: Create user → Create wallet → User deposits to virtual account → Webhook credits balance
 * - Offramp: Create beneficiary → Get quote → Execute offramp → Webhook confirms completion
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

  // ==================== User/Identity Management ====================

  /**
   * Create a bread.africa user
   * @param {string} reference - Unique reference (user ID from platform)
   * @param {string} name - User's full name
   * @param {string} email - User's email
   * @returns {Promise<Object>} User creation result
   */
  async createUser(reference, name, email) {
    try {
      const response = await this.api.post('/user', {
        reference,
        name,
        email
      });

      return {
        userId: response.data.data?.user_id || response.data.data?.id,
        reference: response.data.data?.reference
      };
    } catch (error) {
      console.error('bread.africa user creation failed:', error.response?.data || error.message);
      throw new Error(`Failed to create bread user: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Create identity verification (KYC)
   * @param {string} type - Verification type: 'bvn', 'nin', or 'link'
   * @param {string} name - Full name
   * @param {Object} details - Verification details (bvn, nin, dob, etc.)
   * @returns {Promise<Object>} Identity creation result
   */
  async createIdentity(type, name, details) {
    try {
      const response = await this.api.post('/identity', {
        type,
        name,
        details
      });

      return {
        identityId: response.data.data?.identity_id || response.data.data?.id,
        status: response.data.data?.status
      };
    } catch (error) {
      console.error('bread.africa identity creation failed:', error.response?.data || error.message);
      throw new Error(`Failed to create identity: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get identity verification status
   * @param {string} identityId - Identity ID
   * @returns {Promise<Object>} Identity status
   */
  async getIdentity(identityId) {
    try {
      const response = await this.api.get(`/identity/${identityId}`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to get identity:', error.message);
      throw new Error(`Failed to get identity: ${error.response?.data?.message || error.message}`);
    }
  }

  // ==================== Wallet Management ====================

  /**
   * Create a bread.africa wallet
   * @param {string} reference - Unique reference (user ID)
   * @param {string} type - Wallet type: 'basic', 'offramp', 'transfer', 'swap'
   * @param {string} beneficiaryId - Optional beneficiary ID for offramp wallets
   * @returns {Promise<Object>} Wallet creation result with virtual account details
   */
  async createWallet(reference, type = 'basic', beneficiaryId = null) {
    try {
      const requestData = {
        reference,
        type
      };

      if (beneficiaryId && type === 'offramp') {
        requestData.beneficiary_id = beneficiaryId;
      }

      const response = await this.api.post('/wallet', requestData);
      const walletData = response.data.data;

      return {
        walletId: walletData.wallet_id || walletData.id,
        evmAddress: walletData.evm_address,
        svmAddress: walletData.svm_address,
        reference: walletData.reference,
        virtualAccount: walletData.virtual_account ? {
          accountNumber: walletData.virtual_account.account_number,
          accountName: walletData.virtual_account.account_name,
          bankName: walletData.virtual_account.bank_name,
          bankCode: walletData.virtual_account.bank_code,
          currency: walletData.virtual_account.currency || 'NGN'
        } : null
      };
    } catch (error) {
      console.error('bread.africa wallet creation failed:', error.response?.data || error.message);
      throw new Error(`Failed to create wallet: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get wallet details and balance
   * @param {string} walletId - Wallet ID
   * @returns {Promise<Object>} Wallet details
   */
  async getWallet(walletId) {
    try {
      const response = await this.api.get(`/wallet/${walletId}`);
      const wallet = response.data.data;

      return {
        walletId: wallet.wallet_id || wallet.id,
        balance: wallet.balance || 0,
        evmAddress: wallet.evm_address,
        svmAddress: wallet.svm_address,
        virtualAccount: wallet.virtual_account
      };
    } catch (error) {
      console.error('Failed to get wallet:', error.message);
      throw new Error(`Failed to get wallet: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get all wallets for a reference (user)
   * @param {string} reference - User reference
   * @returns {Promise<Array>} List of wallets
   */
  async getWallets(reference) {
    try {
      const response = await this.api.get('/wallets', {
        params: { reference }
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to get wallets:', error.message);
      return [];
    }
  }

  // ==================== Beneficiary Management ====================

  /**
   * Create a beneficiary (bank account for withdrawals)
   * @param {string} identityId - Identity ID (KYC)
   * @param {string} currency - Currency code (e.g., 'NGN')
   * @param {string} accountNumber - Bank account number
   * @param {string} bankCode - Bank code
   * @returns {Promise<Object>} Beneficiary creation result
   */
  async createBeneficiary(identityId, currency, accountNumber, bankCode) {
    try {
      const response = await this.api.post('/beneficiary', {
        identity_id: identityId,
        currency,
        account_number: accountNumber,
        bank_code: bankCode
      });

      const beneficiary = response.data.data;

      return {
        beneficiaryId: beneficiary.beneficiary_id || beneficiary.id,
        accountName: beneficiary.account_name,
        accountNumber: beneficiary.account_number,
        bankCode: beneficiary.bank_code,
        bankName: beneficiary.bank_name,
        currency: beneficiary.currency
      };
    } catch (error) {
      console.error('bread.africa beneficiary creation failed:', error.response?.data || error.message);
      throw new Error(`Failed to create beneficiary: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get all beneficiaries for an identity
   * @param {string} identityId - Identity ID
   * @returns {Promise<Array>} List of beneficiaries
   */
  async getBeneficiaries(identityId) {
    try {
      const response = await this.api.get('/beneficiaries', {
        params: { identity_id: identityId }
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to get beneficiaries:', error.message);
      return [];
    }
  }

  /**
   * Get a specific beneficiary
   * @param {string} beneficiaryId - Beneficiary ID
   * @returns {Promise<Object>} Beneficiary details
   */
  async getBeneficiary(beneficiaryId) {
    try {
      const response = await this.api.get(`/beneficiary/${beneficiaryId}`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to get beneficiary:', error.message);
      throw new Error(`Failed to get beneficiary: ${error.response?.data?.message || error.message}`);
    }
  }

  // ==================== Offramp Operations ====================

  /**
   * Get offramp exchange rate
   * @param {string} asset - Crypto asset (e.g., 'USDC')
   * @param {string} currency - Fiat currency (e.g., 'NGN')
   * @param {number} amount - Amount to convert
   * @returns {Promise<Object>} Exchange rate data
   */
  async getOfframpRate(asset, currency, amount) {
    try {
      const response = await this.api.get('/offramp/get-rate', {
        params: {
          asset,
          currency,
          amount
        }
      });

      return {
        rate: response.data.data?.rate,
        expiresAt: response.data.data?.expires_at
      };
    } catch (error) {
      console.error('Failed to get offramp rate:', error.message);
      throw new Error(`Failed to get rate: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get offramp quote
   * @param {string} walletId - Wallet ID
   * @param {number} amount - Amount in crypto
   * @param {string} asset - Asset type (USDC, USDT)
   * @param {string} beneficiaryId - Beneficiary ID
   * @returns {Promise<Object>} Quote details
   */
  async getOfframpQuote(walletId, amount, asset, beneficiaryId) {
    try {
      const response = await this.api.get('/offramp/get-quote', {
        params: {
          wallet_id: walletId,
          amount,
          asset,
          beneficiary_id: beneficiaryId
        }
      });

      const quote = response.data.data;

      return {
        quoteId: quote.quote_id || quote.id,
        inputAmount: quote.input_amount,
        outputAmount: quote.output_amount,
        fee: quote.fee || 0,
        rate: quote.rate,
        expiresAt: quote.expires_at
      };
    } catch (error) {
      console.error('Failed to get offramp quote:', error.message);
      throw new Error(`Failed to get quote: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Execute offramp (withdraw crypto to bank account)
   * @param {string} walletId - Wallet ID
   * @param {number} amount - Amount in crypto
   * @param {string} asset - Asset type (USDC, USDT)
   * @param {string} beneficiaryId - Beneficiary ID
   * @param {string} quoteId - Optional quote ID
   * @returns {Promise<Object>} Offramp transaction result
   */
  async executeOfframp(walletId, amount, asset, beneficiaryId, quoteId = null) {
    try {
      const requestData = {
        wallet_id: walletId,
        amount,
        asset,
        beneficiary_id: beneficiaryId
      };

      if (quoteId) {
        requestData.quote_id = quoteId;
      }

      const response = await this.api.post('/offramp/execute', requestData);
      const offramp = response.data.data;

      return {
        transactionId: offramp.transaction_id || offramp.id,
        status: offramp.status,
        reference: offramp.reference
      };
    } catch (error) {
      console.error('bread.africa offramp execution failed:', error.response?.data || error.message);
      throw new Error(`Failed to execute offramp: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get offramp transaction status
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<Object>} Transaction status
   */
  async getOfframpStatus(transactionId) {
    try {
      const response = await this.api.get('/offramp/get-status', {
        params: { transaction_id: transactionId }
      });

      const status = response.data.data;

      return {
        status: status.status,
        completedAt: status.completed_at,
        failedReason: status.failed_reason
      };
    } catch (error) {
      console.error('Failed to get offramp status:', error.message);
      throw new Error(`Failed to get status: ${error.response?.data?.message || error.message}`);
    }
  }

  // ==================== Utility Methods ====================

  /**
   * Get list of supported banks
   * @param {string} currency - Currency code (e.g., 'NGN')
   * @returns {Promise<Array>} List of banks
   */
  async getBanks(currency) {
    try {
      const response = await this.api.get('/banks', {
        params: { currency }
      });

      return response.data.data || [];
    } catch (error) {
      console.error('Failed to get banks:', error.message);
      return [];
    }
  }

  /**
   * Lookup and verify bank account
   * @param {string} bankCode - Bank code
   * @param {string} accountNumber - Account number
   * @returns {Promise<Object>} Account verification result
   */
  async lookupAccount(bankCode, accountNumber) {
    try {
      const response = await this.api.post('/lookup-account', {
        bank_code: bankCode,
        account_number: accountNumber
      });

      const account = response.data.data;

      return {
        accountName: account.account_name,
        accountNumber: account.account_number,
        bankName: account.bank_name,
        bankCode: account.bank_code
      };
    } catch (error) {
      console.error('Failed to lookup account:', error.message);
      throw new Error(`Failed to verify account: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get supported crypto assets
   * @returns {Promise<Array>} List of supported assets
   */
  async getAssets() {
    try {
      const response = await this.api.get('/assets');
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to get assets:', error.message);
      return [];
    }
  }

  /**
   * Create webhook configuration
   * @param {string} url - Webhook URL
   * @param {Array} events - List of events to subscribe to
   * @returns {Promise<Object>} Webhook configuration result
   */
  async createWebhook(url, events) {
    try {
      const response = await this.api.post('/webhook', {
        url,
        events
      });

      return response.data.data;
    } catch (error) {
      console.error('Failed to create webhook:', error.message);
      throw new Error(`Failed to create webhook: ${error.response?.data?.message || error.message}`);
    }
  }

  // ==================== Webhook Verification ====================

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
