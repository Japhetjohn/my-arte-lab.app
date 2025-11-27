/**
 * bread.africa Payment Processor Configuration
 * Handles fiat onramp/offramp for bank transfers and mobile money
 */

const breadConfig = {
  // API Configuration
  apiUrl: process.env.BREAD_API_URL || 'https://processor-prod.up.railway.app',
  serviceKey: process.env.BREAD_SERVICE_KEY,
  accountCode: process.env.BREAD_ACCOUNT_CODE || '2591621208',

  // Webhook Configuration
  webhookUrl: process.env.BREAD_WEBHOOK_URL,
  webhookSecret: process.env.BREAD_WEBHOOK_SECRET,

  // Wallet Addresses (from account setup)
  feeWallet: {
    evm: process.env.BREAD_FEE_WALLET_EVM,
    svm: process.env.BREAD_FEE_WALLET_SVM
  },
  settlementWallet: {
    evm: process.env.BREAD_SETTLEMENT_WALLET_EVM,
    svm: process.env.BREAD_SETTLEMENT_WALLET_SVM
  },

  // Platform Settings
  commission: parseFloat(process.env.PLATFORM_COMMISSION) || 10, // percentage

  // Transaction Limits
  minOnrampAmount: parseFloat(process.env.MIN_ONRAMP_AMOUNT) || 1000,  // NGN
  maxOnrampAmount: parseFloat(process.env.MAX_ONRAMP_AMOUNT) || 1000000, // NGN
  minOfframpAmount: parseFloat(process.env.MIN_OFFRAMP_AMOUNT) || 20,   // USDC
  maxOfframpAmount: parseFloat(process.env.MAX_OFFRAMP_AMOUNT) || 10000, // USDC

  // Supported Currencies
  supportedFiatCurrencies: ['NGN'],
  supportedCryptoCurrencies: ['USDC', 'USDT', 'DAI'],
  defaultCryptoCurrency: 'USDC',

  // Mobile Money Providers
  mobileMoneyProviders: [
    { code: 'MTN', name: 'MTN Mobile Money' },
    { code: 'AIRTEL', name: 'Airtel Money' },
    { code: 'GLO', name: 'Glo Mobile Money' },
    { code: '9MOBILE', name: '9mobile Money' }
  ],

  // Webhook Event Types
  events: {
    ONRAMP_INITIATED: 'onramp.initiated',
    ONRAMP_SUCCESS: 'onramp.success',
    ONRAMP_FAILED: 'onramp.failed',
    ONRAMP_PENDING: 'onramp.pending',
    OFFRAMP_INITIATED: 'offramp.initiated',
    OFFRAMP_SUCCESS: 'offramp.success',
    OFFRAMP_FAILED: 'offramp.failed',
    OFFRAMP_PENDING: 'offramp.pending'
  },

  // Payment Methods
  paymentMethods: {
    BANK_TRANSFER: 'bank_transfer',
    MOBILE_MONEY: 'mobile_money',
    CRYPTO: 'crypto'
  },

  // Transaction Types
  transactionTypes: {
    ONRAMP: 'onramp',
    OFFRAMP: 'offramp'
  },

  /**
   * Validate configuration
   * @throws {Error} If required configuration is missing
   */
  validate() {
    const required = ['serviceKey', 'accountCode'];
    const missing = required.filter(key => !this[key]);

    if (missing.length > 0) {
      throw new Error(`Missing required bread.africa configuration: ${missing.join(', ')}`);
    }

    if (!this.apiUrl) {
      throw new Error('BREAD_API_URL is required');
    }

    return true;
  },

  /**
   * Get headers for API requests
   * @returns {Object} Headers object
   */
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-service-key': this.serviceKey
    };
  },

  /**
   * Check if currency is supported for onramp
   * @param {string} currency - Currency code
   * @returns {boolean}
   */
  isFiatSupported(currency) {
    return this.supportedFiatCurrencies.includes(currency.toUpperCase());
  },

  /**
   * Check if cryptocurrency is supported
   * @param {string} currency - Currency code
   * @returns {boolean}
   */
  isCryptoSupported(currency) {
    return this.supportedCryptoCurrencies.includes(currency.toUpperCase());
  },

  /**
   * Validate onramp amount
   * @param {number} amount - Amount in NGN
   * @returns {Object} Validation result
   */
  validateOnrampAmount(amount) {
    if (amount < this.minOnrampAmount) {
      return {
        valid: false,
        error: `Minimum deposit amount is ₦${this.minOnrampAmount.toLocaleString()}`
      };
    }

    if (amount > this.maxOnrampAmount) {
      return {
        valid: false,
        error: `Maximum deposit amount is ₦${this.maxOnrampAmount.toLocaleString()}`
      };
    }

    return { valid: true };
  },

  /**
   * Validate offramp amount
   * @param {number} amount - Amount in USDC
   * @returns {Object} Validation result
   */
  validateOfframpAmount(amount) {
    if (amount < this.minOfframpAmount) {
      return {
        valid: false,
        error: `Minimum withdrawal amount is $${this.minOfframpAmount}`
      };
    }

    if (amount > this.maxOfframpAmount) {
      return {
        valid: false,
        error: `Maximum withdrawal amount is $${this.maxOfframpAmount.toLocaleString()}`
      };
    }

    return { valid: true };
  }
};

module.exports = breadConfig;
