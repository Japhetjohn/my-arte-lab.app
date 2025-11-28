const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const crypto = require('crypto');
const breadConfig = require('../config/bread');

/**
 * bread.africa Service - Offramp Only Implementation
 * Based on actual bread.africa API documentation
 *
 * Key Flow:
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
   * NOTE: User creation is for creating service accounts, not end-user accounts
   * For platform users, we create wallets directly with their reference
   * This method is kept for completeness but may not be needed
   *
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @param {string} name - User's full name
   * @param {string} website - Optional website URL
   * @param {string} description - Optional description
   * @returns {Promise<Object>} User creation result
   */
  async createServiceUser(email, password, name, website = null, description = null) {
    try {
      const requestData = {
        email,
        password,
        name
      };

      if (website) requestData.website = website;
      if (description) requestData.description = description;

      const response = await this.api.post('/user', requestData);

      return {
        code: response.data.data?.code,
        key: response.data.data?.key
      };
    } catch (error) {
      console.error('bread.africa service user creation failed:', error.response?.data || error.message);
      throw new Error(`Failed to create service user: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get service account details
   * @returns {Promise<Object>} Account details
   */
  async getUser() {
    try {
      const response = await this.api.get('/user');
      return response.data.data;
    } catch (error) {
      console.error('Failed to get user:', error.message);
      throw new Error(`Failed to get user: ${error.response?.data?.message || error.message}`);
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
   * @returns {Promise<Object>} Wallet creation result
   */
  async createWallet(reference) {
    try {
      const response = await this.api.post('/wallet', { reference });
      const walletData = response.data.data;

      return {
        walletId: walletData.wallet_id || walletData.id,
        evmAddress: walletData.address?.evm,
        svmAddress: walletData.address?.svm,
        reference: walletData.reference
      };
    } catch (error) {
      console.error('bread.africa wallet creation failed:', error.response?.data || error.message);
      throw new Error(`Failed to create wallet: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Configure wallet automation (offramp, transfer, or swap)
   * @param {string} walletId - Wallet ID
   * @param {Object} options - Automation options
   * @param {boolean} options.transfer - Enable automatic transfer
   * @param {boolean} options.swap - Enable automatic swap
   * @param {boolean} options.offramp - Enable automatic offramp
   * @param {string} options.beneficiaryId - Beneficiary ID (required if offramp is enabled)
   * @returns {Promise<Object>} Automation configuration result
   */
  async configureWalletAutomation(walletId, options) {
    try {
      const requestData = {
        wallet_id: walletId,
        transfer: options.transfer || false,
        swap: options.swap || false,
        offramp: options.offramp || false
      };

      if (options.offramp && options.beneficiaryId) {
        requestData.beneficiary_id = options.beneficiaryId;
      }

      const response = await this.api.post('/automate', requestData);

      return response.data.data;
    } catch (error) {
      console.error('Failed to configure wallet automation:', error.message);
      throw new Error(`Failed to configure automation: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get wallet details
   * @param {string} walletId - Wallet ID
   * @returns {Promise<Object>} Wallet details
   */
  async getWallet(walletId) {
    try {
      const response = await this.api.get('/wallet', {
        params: { wallet_id: walletId }
      });
      const wallet = response.data.data;

      return {
        walletId: wallet.id,
        reference: wallet.reference,
        isActive: wallet.is_active,
        evmAddress: wallet.address?.evm,
        svmAddress: wallet.address?.svm,
        transfer: wallet.transfer,
        swap: wallet.swap,
        offramp: wallet.offramp,
        beneficiary: wallet.beneficiary
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
   * Get offramp exchange rate (crypto to fiat)
   * @param {string} currency - Fiat currency (e.g., 'NGN')
   * @returns {Promise<Object>} Exchange rate data
   */
  async getOfframpRate(currency) {
    try {
      const response = await this.api.get('/rate/offramp', {
        params: { currency }
      });

      return {
        rate: response.data.data?.rate,
        currency
      };
    } catch (error) {
      console.error('Failed to get offramp rate:', error.message);
      throw new Error(`Failed to get offramp rate: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get offramp quote (crypto to fiat)
   * @param {string} walletId - Wallet ID
   * @param {number} amount - Amount in crypto
   * @param {string} asset - Asset ID (e.g., 'base:usdc')
   * @param {string} beneficiaryId - Beneficiary ID
   * @param {string} currency - Target fiat currency (e.g., 'NGN')
   * @returns {Promise<Object>} Quote details
   */
  async getOfframpQuote(walletId, amount, asset, beneficiaryId, currency = 'NGN') {
    try {
      const response = await this.api.post('/quote/offramp', {
        wallet_id: walletId,
        amount,
        asset,
        beneficiary_id: beneficiaryId,
        currency
      });

      const quote = response.data.data;

      return {
        quoteId: quote.id || quote.quote_id,
        type: quote.type,
        fee: quote.fee || 0,
        expiry: quote.expiry,
        currency: quote.currency,
        rate: quote.rate,
        inputAmount: quote.input_amount,
        outputAmount: quote.output_amount
      };
    } catch (error) {
      console.error('Failed to get offramp quote:', error.message);
      throw new Error(`Failed to get offramp quote: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Execute offramp (withdraw crypto to bank account)
   * @param {string} walletId - Wallet ID
   * @param {number} amount - Amount in crypto
   * @param {string} asset - Asset ID (e.g., 'base:usdc')
   * @param {string} beneficiaryId - Beneficiary ID
   * @param {string} currency - Target fiat currency (default: 'NGN')
   * @returns {Promise<Object>} Offramp transaction result
   */
  async executeOfframp(walletId, amount, asset, beneficiaryId, currency = 'NGN') {
    try {
      const response = await this.api.post('/offramp', {
        wallet_id: walletId,
        amount,
        asset,
        beneficiary_id: beneficiaryId,
        currency
      });

      const offramp = response.data.data;

      return {
        transactionId: offramp.id || offramp.transaction_id,
        hash: offramp.hash,
        status: offramp.status,
        amount: offramp.amount,
        rate: offramp.rate,
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
      const response = await this.api.get(`/offramp/${transactionId}`);
      const data = response.data.data;

      return {
        id: data.id,
        status: data.status,
        amount: data.amount,
        rate: data.rate,
        hash: data.hash,
        completedAt: data.completed_at,
        failedReason: data.failed_reason
      };
    } catch (error) {
      console.error('Failed to get offramp status:', error.message);
      throw new Error(`Failed to get offramp status: ${error.response?.data?.message || error.message}`);
    }
  }

  // ==================== Balance Operations ====================

  /**
   * Get wallet balance for a specific asset
   * @param {string} walletId - Wallet ID
   * @param {string} asset - Asset ID (e.g., 'base:usdc')
   * @returns {Promise<Object>} Asset balance
   */
  async getBalance(walletId, asset) {
    try {
      const response = await this.api.get('/balance', {
        params: {
          wallet_id: walletId,
          asset
        }
      });

      const balance = response.data.data;

      return {
        asset: balance.asset,
        amount: balance.amount || 0,
        usdValue: balance.usd_value || 0
      };
    } catch (error) {
      console.error('Failed to get balance:', error.message);
      throw new Error(`Failed to get balance: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get all balances for a wallet
   * @param {string} walletId - Wallet ID
   * @returns {Promise<Array>} List of balances
   */
  async getBalances(walletId) {
    try {
      const response = await this.api.get('/balances', {
        params: { wallet_id: walletId }
      });

      const balances = response.data.data || [];

      return balances.map(balance => ({
        asset: balance.asset,
        amount: balance.amount || 0,
        usdValue: balance.usd_value || 0
      }));
    } catch (error) {
      console.error('Failed to get balances:', error.message);
      return [];
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
  async lookupAccount(bankCode, accountNumber, currency = 'NGN') {
    try {
      const response = await this.api.post('/lookup', {
        bank_code: bankCode,
        currency: currency.toLowerCase(),
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
      console.error('Failed to lookup account:', error.response?.status, error.response?.data || error.message);
      // Re-throw the original error to preserve the response object
      throw error;
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
   * Create or update webhook configuration
   * @param {string} url - Webhook URL (leave empty to disable)
   * @returns {Promise<Object>} Webhook configuration result
   */
  async createWebhook(url) {
    try {
      const response = await this.api.post('/webhook', { url });

      return {
        enabled: response.data.data?.enabled,
        url: response.data.data?.url,
        secret: response.data.data?.secret
      };
    } catch (error) {
      console.error('Failed to create webhook:', error.message);
      throw new Error(`Failed to create webhook: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get notifications for a wallet
   * @param {string} walletId - Wallet ID
   * @param {string} type - Notification type (optional)
   * @returns {Promise<Array>} List of notifications
   */
  async getNotifications(walletId, type = null) {
    try {
      const params = { wallet_id: walletId };
      if (type) params.type = type;

      const response = await this.api.get('/notifications', { params });
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to get notifications:', error.message);
      return [];
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
