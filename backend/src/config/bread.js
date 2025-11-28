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
  minOfframpAmount: parseFloat(process.env.MIN_OFFRAMP_AMOUNT) || 1,   // USDC
  maxOfframpAmount: parseFloat(process.env.MAX_OFFRAMP_AMOUNT) || 10000, // USDC

  // Supported Currencies (72+ countries supported)
  supportedFiatCurrencies: [
    // Africa
    'XOF', 'GHS', 'KES', 'NGN', 'TZS', 'ZAR',
    // Asia
    'AUD', 'BDT', 'CNY', 'HKD', 'INR', 'IDR', 'JPY', 'MYR', 'NPR', 'NZD',
    'PKR', 'PHP', 'SGD', 'KRW', 'LKR', 'THB', 'TRY', 'VND',
    // Europe
    'EUR', 'CZK', 'DKK', 'NOK', 'PLN', 'RON', 'SEK', 'GBP',
    // Middle East
    'EGP', 'ILS', 'JOD', 'QAR', 'SAR', 'AED',
    // North America
    'USD', 'CAD', 'DOP', 'GTQ', 'HNL', 'MXN', 'CRC',
    // South America
    'ARS', 'BOB', 'BRL', 'CLP', 'COP', 'PEN', 'JMD'
  ],
  supportedCryptoCurrencies: ['USDC', 'USDT', 'CNGN'],
  defaultCryptoCurrency: 'USDC',

  // Supported Countries for Onramp/Offramp (72+ countries)
  supportedCountries: {
    // === AFRICA ===
    NG: {
      name: 'Nigeria',
      currency: 'NGN',
      region: 'Africa',
      fields: ['bank_code', 'account_number'],
      identityTypes: ['BVN', 'NIN', 'Link']
    },
    GH: {
      name: 'Ghana',
      currency: 'GHS',
      region: 'Africa',
      fields: ['bank_code', 'account_number'],
      identityTypes: ['Link']
    },
    KE: {
      name: 'Kenya',
      currency: 'KES',
      region: 'Africa',
      fields: ['bank_code', 'account_number'],
      identityTypes: ['Link']
    },
    TZ: {
      name: 'Tanzania',
      currency: 'TZS',
      region: 'Africa',
      fields: ['bank_code', 'account_number'],
      identityTypes: ['Link']
    },
    ZA: {
      name: 'South Africa',
      currency: 'ZAR',
      region: 'Africa',
      fields: ['bank_code', 'account_number'],
      identityTypes: ['Link']
    },
    CI: {
      name: 'Côte d\'Ivoire',
      currency: 'XOF',
      region: 'Africa',
      fields: ['bank_code', 'account_number'],
      identityTypes: ['Link']
    },

    // === ASIA & OCEANIA ===
    IN: {
      name: 'India',
      currency: 'INR',
      region: 'Asia',
      fields: ['ifsc_code', 'account_number'],
      identityTypes: ['Link']
    },
    CN: {
      name: 'China',
      currency: 'CNY',
      region: 'Asia',
      fields: ['cnaps_code', 'account_number'],
      identityTypes: ['Link']
    },
    HK: {
      name: 'Hong Kong',
      currency: 'HKD',
      region: 'Asia',
      fields: ['clearing_code', 'account_number'],
      identityTypes: ['Link']
    },
    AU: {
      name: 'Australia',
      currency: 'AUD',
      region: 'Oceania',
      fields: ['bsb_number', 'account_number'],
      identityTypes: ['Link']
    },
    NZ: {
      name: 'New Zealand',
      currency: 'NZD',
      region: 'Oceania',
      fields: ['bank_code', 'account_number'],
      identityTypes: ['Link']
    },
    JP: {
      name: 'Japan',
      currency: 'JPY',
      region: 'Asia',
      fields: ['bank_code', 'branch_code', 'account_number'],
      identityTypes: ['Link']
    },
    SG: {
      name: 'Singapore',
      currency: 'SGD',
      region: 'Asia',
      fields: ['bank_code', 'account_number'],
      identityTypes: ['Link']
    },
    MY: {
      name: 'Malaysia',
      currency: 'MYR',
      region: 'Asia',
      fields: ['bank_code', 'account_number'],
      identityTypes: ['Link']
    },
    TH: {
      name: 'Thailand',
      currency: 'THB',
      region: 'Asia',
      fields: ['bank_code', 'account_number'],
      identityTypes: ['Link']
    },
    ID: {
      name: 'Indonesia',
      currency: 'IDR',
      region: 'Asia',
      fields: ['bank_code', 'account_number'],
      identityTypes: ['Link']
    },
    PH: {
      name: 'Philippines',
      currency: 'PHP',
      region: 'Asia',
      fields: ['bank_code', 'account_number'],
      identityTypes: ['Link']
    },
    VN: {
      name: 'Vietnam',
      currency: 'VND',
      region: 'Asia',
      fields: ['bank_code', 'account_number'],
      identityTypes: ['Link']
    },
    BD: {
      name: 'Bangladesh',
      currency: 'BDT',
      region: 'Asia',
      fields: ['bank_code', 'account_number'],
      identityTypes: ['Link']
    },
    PK: {
      name: 'Pakistan',
      currency: 'PKR',
      region: 'Asia',
      fields: ['bank_code', 'account_number'],
      identityTypes: ['Link']
    },
    LK: {
      name: 'Sri Lanka',
      currency: 'LKR',
      region: 'Asia',
      fields: ['bank_code', 'account_number'],
      identityTypes: ['Link']
    },
    NP: {
      name: 'Nepal',
      currency: 'NPR',
      region: 'Asia',
      fields: ['bank_code', 'account_number'],
      identityTypes: ['Link']
    },
    KR: {
      name: 'South Korea',
      currency: 'KRW',
      region: 'Asia',
      fields: ['bank_code', 'account_number'],
      identityTypes: ['Link']
    },
    TR: {
      name: 'Turkey',
      currency: 'TRY',
      region: 'Asia',
      fields: ['iban'],
      identityTypes: ['Link']
    },

    // === EUROPE ===
    GB: {
      name: 'United Kingdom',
      currency: 'GBP',
      region: 'Europe',
      fields: ['sort_code', 'account_number'],
      identityTypes: ['Link']
    },
    EU: {
      name: 'Europe (SEPA)',
      currency: 'EUR',
      region: 'Europe',
      fields: ['iban', 'swift_code'],
      identityTypes: ['Link'],
      note: 'Covers 27 EU countries'
    },
    DK: {
      name: 'Denmark',
      currency: 'DKK',
      region: 'Europe',
      fields: ['iban'],
      identityTypes: ['Link']
    },
    NO: {
      name: 'Norway',
      currency: 'NOK',
      region: 'Europe',
      fields: ['iban'],
      identityTypes: ['Link']
    },
    SE: {
      name: 'Sweden',
      currency: 'SEK',
      region: 'Europe',
      fields: ['iban'],
      identityTypes: ['Link']
    },
    PL: {
      name: 'Poland',
      currency: 'PLN',
      region: 'Europe',
      fields: ['iban'],
      identityTypes: ['Link']
    },
    CZ: {
      name: 'Czech Republic',
      currency: 'CZK',
      region: 'Europe',
      fields: ['iban'],
      identityTypes: ['Link']
    },
    RO: {
      name: 'Romania',
      currency: 'RON',
      region: 'Europe',
      fields: ['iban'],
      identityTypes: ['Link']
    },

    // === MIDDLE EAST ===
    AE: {
      name: 'United Arab Emirates',
      currency: 'AED',
      region: 'Middle East',
      fields: ['iban', 'swift_code'],
      identityTypes: ['Link']
    },
    SA: {
      name: 'Saudi Arabia',
      currency: 'SAR',
      region: 'Middle East',
      fields: ['iban'],
      identityTypes: ['Link']
    },
    QA: {
      name: 'Qatar',
      currency: 'QAR',
      region: 'Middle East',
      fields: ['iban'],
      identityTypes: ['Link']
    },
    IL: {
      name: 'Israel',
      currency: 'ILS',
      region: 'Middle East',
      fields: ['bank_code', 'branch_code', 'account_number'],
      identityTypes: ['Link']
    },
    JO: {
      name: 'Jordan',
      currency: 'JOD',
      region: 'Middle East',
      fields: ['iban'],
      identityTypes: ['Link']
    },
    EG: {
      name: 'Egypt',
      currency: 'EGP',
      region: 'Middle East',
      fields: ['bank_code', 'account_number'],
      identityTypes: ['Link']
    },

    // === NORTH AMERICA ===
    US: {
      name: 'United States',
      currency: 'USD',
      region: 'North America',
      fields: ['routing_number', 'account_number'],
      identityTypes: ['Link']
    },
    CA: {
      name: 'Canada',
      currency: 'CAD',
      region: 'North America',
      fields: ['transit_number', 'institution_number', 'account_number'],
      identityTypes: ['Link']
    },
    MX: {
      name: 'Mexico',
      currency: 'MXN',
      region: 'North America',
      fields: ['clabe_number'],
      identityTypes: ['Link']
    },
    DO: {
      name: 'Dominican Republic',
      currency: 'DOP',
      region: 'North America',
      fields: ['bank_code', 'account_number'],
      identityTypes: ['Link']
    },
    GT: {
      name: 'Guatemala',
      currency: 'GTQ',
      region: 'North America',
      fields: ['bank_code', 'account_number'],
      identityTypes: ['Link']
    },
    HN: {
      name: 'Honduras',
      currency: 'HNL',
      region: 'North America',
      fields: ['bank_code', 'account_number'],
      identityTypes: ['Link']
    },
    CR: {
      name: 'Costa Rica',
      currency: 'CRC',
      region: 'North America',
      fields: ['bank_code', 'account_number'],
      identityTypes: ['Link']
    },

    // === SOUTH AMERICA ===
    BR: {
      name: 'Brazil',
      currency: 'BRL',
      region: 'South America',
      fields: ['pix_code'],
      identityTypes: ['Link']
    },
    AR: {
      name: 'Argentina',
      currency: 'ARS',
      region: 'South America',
      fields: ['cbu_number'],
      identityTypes: ['Link']
    },
    CL: {
      name: 'Chile',
      currency: 'CLP',
      region: 'South America',
      fields: ['bank_code', 'account_number'],
      identityTypes: ['Link']
    },
    CO: {
      name: 'Colombia',
      currency: 'COP',
      region: 'South America',
      fields: ['bank_code', 'account_number'],
      identityTypes: ['Link']
    },
    PE: {
      name: 'Peru',
      currency: 'PEN',
      region: 'South America',
      fields: ['bank_code', 'account_number'],
      identityTypes: ['Link']
    },
    BO: {
      name: 'Bolivia',
      currency: 'BOB',
      region: 'South America',
      fields: ['bank_code', 'account_number'],
      identityTypes: ['Link']
    },
    EC: {
      name: 'Ecuador',
      currency: 'USD',
      region: 'South America',
      fields: ['bank_code', 'account_number'],
      identityTypes: ['Link']
    },
    JM: {
      name: 'Jamaica',
      currency: 'JMD',
      region: 'South America',
      fields: ['bank_code', 'account_number'],
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
        error: `Minimum withdrawal amount is $${this.minOfframpAmount} USDC`
      };
    }

    if (amount > this.maxOfframpAmount) {
      return {
        valid: false,
        error: `Maximum withdrawal amount is $${this.maxOfframpAmount.toLocaleString()} USDC`
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
