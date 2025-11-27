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
  supportedFiatCurrencies: ['NGN', 'USD', 'CAD', 'INR', 'GBP', 'AUD', 'MXN', 'CNY', 'HKD', 'BRL', 'EUR'],
  supportedCryptoCurrencies: ['USDC', 'USDT', 'CNGN'],
  defaultCryptoCurrency: 'USDC',

  // Supported Countries for Offramp
  supportedCountries: {
    NG: {
      name: 'Nigeria',
      currency: 'NGN',
      fields: ['bank_code', 'account_number'],
      identityTypes: ['BVN', 'NIN']
    },
    US: {
      name: 'United States',
      currency: 'USD',
      fields: ['routing_number', 'account_number'],
      identityTypes: ['Link']
    },
    CA: {
      name: 'Canada',
      currency: 'CAD',
      fields: ['transit_number', 'institution_number', 'account_number'],
      identityTypes: ['Link']
    },
    IN: {
      name: 'India',
      currency: 'INR',
      fields: ['ifsc_code', 'account_number'],
      identityTypes: ['Link']
    },
    GB: {
      name: 'United Kingdom',
      currency: 'GBP',
      fields: ['sort_code', 'account_number'],
      identityTypes: ['Link']
    },
    AU: {
      name: 'Australia',
      currency: 'AUD',
      fields: ['bsb_number', 'account_number'],
      identityTypes: ['Link']
    },
    MX: {
      name: 'Mexico',
      currency: 'MXN',
      fields: ['clabe_number'],
      identityTypes: ['Link']
    },
    CN: {
      name: 'China',
      currency: 'CNY',
      fields: ['cnaps_code', 'account_number'],
      identityTypes: ['Link']
    },
    HK: {
      name: 'Hong Kong',
      currency: 'HKD',
      fields: ['clearing_code', 'account_number'],
      identityTypes: ['Link']
    },
    BR: {
      name: 'Brazil',
      currency: 'BRL',
      fields: ['pix_code'],
      identityTypes: ['Link']
    },
    EU: {
      name: 'Europe (SEPA)',
      currency: 'EUR',
      fields: ['iban', 'swift_code'],
      identityTypes: ['Link']
    }
  },

  // Supported Blockchain Networks
  supportedNetworks: {
    USDC: ['ethereum', 'base', 'arbitrum', 'solana', 'bsc', 'polygon', 'optimism', 'avalanche'],
    USDT: ['ethereum', 'arbitrum', 'solana', 'polygon', 'bsc', 'optimism', 'avalanche'],
    CNGN: ['base', 'bsc']
  },

  // Webhook Event Types (from bread.africa documentation)
  events: {
    ONRAMP_PENDING: 'onramp:pending',
    ONRAMP_PROCESSING: 'onramp:processing',
    ONRAMP_COMPLETED: 'onramp:completed',
    ONRAMP_FAILED: 'onramp:failed',
    OFFRAMP_PENDING: 'offramp:pending',
    OFFRAMP_PROCESSING: 'offramp:processing',
    OFFRAMP_COMPLETED: 'offramp:completed',
    OFFRAMP_FAILED: 'offramp:failed'
  },

  // Payment Methods (only bank transfer documented)
  paymentMethods: {
    BANK_TRANSFER: 'bank_transfer',
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
  },

  /**
   * Get country configuration
   * @param {string} countryCode - Country code (e.g., 'NG', 'US')
   * @returns {Object|null} Country configuration
   */
  getCountryConfig(countryCode) {
    return this.supportedCountries[countryCode.toUpperCase()] || null;
  },

  /**
   * Check if country is supported
   * @param {string} countryCode - Country code
   * @returns {boolean}
   */
  isCountrySupported(countryCode) {
    return !!this.supportedCountries[countryCode.toUpperCase()];
  },

  /**
   * Get all supported countries as array
   * @returns {Array} Array of country objects
   */
  getAllCountries() {
    return Object.keys(this.supportedCountries).map(code => ({
      code,
      ...this.supportedCountries[code]
    }));
  },

  /**
   * Get required fields for a country
   * @param {string} countryCode - Country code
   * @returns {Array} Required fields
   */
  getCountryFields(countryCode) {
    const country = this.getCountryConfig(countryCode);
    return country ? country.fields : [];
  },

  /**
   * Get identity types for a country
   * @param {string} countryCode - Country code
   * @returns {Array} Identity types
   */
  getIdentityTypes(countryCode) {
    const country = this.getCountryConfig(countryCode);
    return country ? country.identityTypes : ['Link'];
  }
};

module.exports = breadConfig;
