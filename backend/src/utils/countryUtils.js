/**
 * Country & Payment Corridor Utilities for MyArteLab
 * 
 * Provides ISO 3166-1 alpha-2 normalization, currency resolution,
 * and environment-aware payment corridor capability matrices for Switch and Solana.
 */

// Authoritative mapping of supported countries, currencies, and names
const COUNTRIES = {
  // --- African Corridors ---
  NG: { code: 'NG', name: 'Nigeria', currency: 'NGN', continent: 'Africa', minDeposit: 20000, defaultChannel: 'BANK' },
  GH: { code: 'GH', name: 'Ghana', currency: 'GHS', continent: 'Africa', minDeposit: 150, defaultChannel: 'MOBILEMONEY' },
  KE: { code: 'KE', name: 'Kenya', currency: 'KES', continent: 'Africa', minDeposit: 1500, defaultChannel: 'MOBILEMONEY' },
  CD: { code: 'CD', name: 'DR Congo', currency: 'CDF', continent: 'Africa', minDeposit: 35000, defaultChannel: 'MOBILEMONEY' },
  CM: { code: 'CM', name: 'Cameroon', currency: 'XAF', continent: 'Africa', minDeposit: 10000, defaultChannel: 'MOBILEMONEY' },
  BJ: { code: 'BJ', name: 'Benin', currency: 'XOF', continent: 'Africa', minDeposit: 10000, defaultChannel: 'MOBILEMONEY' },
  EG: { code: 'EG', name: 'Egypt', currency: 'EGP', continent: 'Africa', minDeposit: 500, defaultChannel: 'BANK' },
  GM: { code: 'GM', name: 'Gambia', currency: 'GMD', continent: 'Africa', minDeposit: 800, defaultChannel: 'BANK' },
  RW: { code: 'RW', name: 'Rwanda', currency: 'RWF', continent: 'Africa', minDeposit: 15000, defaultChannel: 'MOBILEMONEY' },
  SL: { code: 'SL', name: 'Sierra Leone', currency: 'SLE', continent: 'Africa', minDeposit: 250, defaultChannel: 'MOBILEMONEY' },
  TZ: { code: 'TZ', name: 'Tanzania', currency: 'TZS', continent: 'Africa', minDeposit: 30000, defaultChannel: 'MOBILEMONEY' },
  UG: { code: 'UG', name: 'Uganda', currency: 'UGX', continent: 'Africa', minDeposit: 45000, defaultChannel: 'MOBILEMONEY' },
  ZM: { code: 'ZM', name: 'Zambia', currency: 'ZMW', continent: 'Africa', minDeposit: 300, defaultChannel: 'MOBILEMONEY' },
  BW: { code: 'BW', name: 'Botswana', currency: 'BWP', continent: 'Africa', minDeposit: 150, defaultChannel: 'BANK' },
  LR: { code: 'LR', name: 'Liberia', currency: 'LRD', continent: 'Africa', minDeposit: 2500, defaultChannel: 'MOBILEMONEY' },

  // Non-Onramp African Corridors on Switch
  ZA: { code: 'ZA', name: 'South Africa', currency: 'ZAR', continent: 'Africa', minDeposit: null, defaultChannel: 'BANK' },
  ET: { code: 'ET', name: 'Ethiopia', currency: 'ETB', continent: 'Africa', minDeposit: null, defaultChannel: 'MOBILEMONEY' },
  GN: { code: 'GN', name: 'Guinea', currency: 'GNF', continent: 'Africa', minDeposit: null, defaultChannel: 'MOBILEMONEY' },
  MA: { code: 'MA', name: 'Morocco', currency: 'MAD', continent: 'Africa', minDeposit: null, defaultChannel: 'BANK' },
  MW: { code: 'MW', name: 'Malawi', currency: 'MWK', continent: 'Africa', minDeposit: null, defaultChannel: 'MOBILEMONEY' },
  CI: { code: 'CI', name: "Côte d'Ivoire", currency: 'XOF', continent: 'Africa', minDeposit: null, defaultChannel: 'MOBILEMONEY' },
  SN: { code: 'SN', name: 'Senegal', currency: 'XOF', continent: 'Africa', minDeposit: null, defaultChannel: 'MOBILEMONEY' },
  ML: { code: 'ML', name: 'Mali', currency: 'XOF', continent: 'Africa', minDeposit: null, defaultChannel: 'MOBILEMONEY' },
  TG: { code: 'TG', name: 'Togo', currency: 'XOF', continent: 'Africa', minDeposit: null, defaultChannel: 'MOBILEMONEY' },
  GA: { code: 'GA', name: 'Gabon', currency: 'XAF', continent: 'Africa', minDeposit: null, defaultChannel: 'MOBILEMONEY' },

  // --- Major International / Diaspora Corridors (Direct Solana USDC) ---
  US: { code: 'US', name: 'United States', currency: 'USD', continent: 'North America', minDeposit: null, defaultChannel: null },
  GB: { code: 'GB', name: 'United Kingdom', currency: 'GBP', continent: 'Europe', minDeposit: null, defaultChannel: null },
  CA: { code: 'CA', name: 'Canada', currency: 'CAD', continent: 'North America', minDeposit: null, defaultChannel: null },
  FR: { code: 'FR', name: 'France', currency: 'EUR', continent: 'Europe', minDeposit: null, defaultChannel: null },
  DE: { code: 'DE', name: 'Germany', currency: 'EUR', continent: 'Europe', minDeposit: null, defaultChannel: null },
  AE: { code: 'AE', name: 'United Arab Emirates', currency: 'AED', continent: 'Asia', minDeposit: null, defaultChannel: null }
};

// Aliases mapping country names, lowercase codes, and alternative spellings to ISO 3166-1 alpha-2
const ALIASES = {
  nigeria: 'NG',
  ng: 'NG',
  ghana: 'GH',
  gh: 'GH',
  kenya: 'KE',
  ke: 'KE',
  congo: 'CD',
  'dr congo': 'CD',
  'democratic republic of the congo': 'CD',
  drc: 'CD',
  cd: 'CD',
  cameroon: 'CM',
  cm: 'CM',
  benin: 'BJ',
  bj: 'BJ',
  egypt: 'EG',
  eg: 'EG',
  gambia: 'GM',
  gm: 'GM',
  rwanda: 'RW',
  rw: 'RW',
  'sierra leone': 'SL',
  sl: 'SL',
  tanzania: 'TZ',
  tz: 'TZ',
  uganda: 'UG',
  ug: 'UG',
  zambia: 'ZM',
  zm: 'ZM',
  botswana: 'BW',
  bw: 'BW',
  liberia: 'LR',
  lr: 'LR',
  'south africa': 'ZA',
  za: 'ZA',
  ethiopia: 'ET',
  et: 'ET',
  guinea: 'GN',
  gn: 'GN',
  morocco: 'MA',
  ma: 'MA',
  malawi: 'MW',
  mw: 'MW',
  'cote d\'ivoire': 'CI',
  'côte d\'ivoire': 'CI',
  'ivory coast': 'CI',
  ci: 'CI',
  senegal: 'SN',
  sn: 'SN',
  mali: 'ML',
  ml: 'ML',
  togo: 'TG',
  tg: 'TG',
  gabon: 'GA',
  ga: 'GA',
  'united states': 'US',
  usa: 'US',
  us: 'US',
  'united kingdom': 'GB',
  uk: 'GB',
  great_britain: 'GB',
  gb: 'GB',
  canada: 'CA',
  ca: 'CA',
  france: 'FR',
  fr: 'FR',
  germany: 'DE',
  de: 'DE',
  uae: 'AE',
  'united arab emirates': 'AE',
  ae: 'AE'
};

// Switch Active Corridors (documented & empirically verified against Switch API)
const SWITCH_ONRAMP_ACTIVE = new Set([
  'NG', 'GH', 'KE', 'CD', 'CM', 'BJ', 'EG', 'GM', 'RW', 'SL', 'TZ', 'UG', 'ZM', 'BW', 'LR'
]);

// In Sandbox, only NG is permitted for off-ramp remittance under the sandbox key
const SWITCH_OFFRAMP_SANDBOX_ACTIVE = new Set(['NG']);

// Corridors blocked by Switch sandbox service key ('Service not allowed for service key: REMITTANCE')
const SWITCH_OFFRAMP_SANDBOX_BLOCKED = new Set([
  'CD', 'CM', 'BJ', 'ET', 'GH', 'GM', 'GN', 'KE', 'ZA', 'MW', 'RW', 'SL', 'TZ', 'UG', 'ZM', 'LR'
]);

/**
 * Normalizes any country representation (name, code, or alias) into a valid 2-letter uppercase ISO code.
 * 
 * @param {string} input - Country name or code (e.g. "Nigeria", "ng", "USA")
 * @returns {string|null} 2-letter uppercase ISO code or null if unrecognized
 */
function normalizeCountryCode(input) {
  if (!input || typeof input !== 'string') return null;
  const clean = input.trim().toLowerCase();
  if (ALIASES[clean]) {
    return ALIASES[clean];
  }
  const upper = clean.toUpperCase();
  if (COUNTRIES[upper]) {
    return upper;
  }
  // If it's a 2-letter alphabetic string, return uppercase
  if (/^[a-z]{2}$/i.test(clean)) {
    return upper;
  }
  return null;
}

/**
 * Returns human-readable country display name for an ISO code.
 * 
 * @param {string} countryCode
 * @returns {string}
 */
function getCountryName(countryCode) {
  const norm = normalizeCountryCode(countryCode);
  return (norm && COUNTRIES[norm]?.name) || countryCode || 'Unknown';
}

/**
 * Returns default fiat currency code for a given country.
 * 
 * @param {string} countryCode
 * @returns {string}
 */
function getDefaultCurrency(countryCode) {
  const norm = normalizeCountryCode(countryCode);
  return (norm && COUNTRIES[norm]?.currency) || 'USDC';
}

/**
 * Determines environment from process.env or argument.
 * Accurately detects whether Switch is operating under a sandbox or live key.
 * 
 * @param {string} [env]
 * @returns {'sandbox' | 'production'}
 */
function resolveEnvironment(env) {
  if (env) return env.toLowerCase().includes('prod') ? 'production' : 'sandbox';
  const serviceKey = (process.env.SWITCH_SERVICE_KEY || '').trim();
  if (serviceKey.startsWith('sandbox_')) {
    return 'sandbox';
  }
  if (serviceKey.startsWith('live_') || process.env.SWITCH_ENV === 'production') {
    return 'production';
  }
  return 'sandbox';
}

/**
 * Returns the full payment corridor capabilities for a given user country in the current environment.
 * Evaluates Switch On-Ramp, Switch Off-Ramp, and Direct Solana USDC availability.
 * 
 * @param {string} countryInput - Country name or 2-letter code
 * @param {string} [env] - 'sandbox' or 'production'
 * @returns {object} Country payment capabilities object
 */
function getCountryPaymentCapabilities(countryInput, env) {
  const countryCode = normalizeCountryCode(countryInput) || 'NG';
  const countryMeta = COUNTRIES[countryCode] || {
    code: countryCode,
    name: countryInput || countryCode,
    currency: 'USD',
    continent: 'Global',
    minDeposit: null,
    defaultChannel: null
  };

  const environment = resolveEnvironment(env);

  // 1. On-ramp evaluation
  const onrampSupported = SWITCH_ONRAMP_ACTIVE.has(countryCode);
  const onramp = onrampSupported
    ? {
        supported: true,
        status: 'ACTIVE',
        currency: countryMeta.currency,
        defaultChannel: countryMeta.defaultChannel || 'BANK',
        channels: countryMeta.defaultChannel === 'MOBILEMONEY' ? ['MOBILEMONEY', 'BANK'] : ['BANK'],
        minDeposit: countryMeta.minDeposit || 10,
        instructions: `Instant local currency deposit in ${countryMeta.name} (${countryMeta.currency}) via ${countryMeta.defaultChannel === 'MOBILEMONEY' ? 'Mobile Money' : 'Bank Transfer'}.`
      }
    : {
        supported: false,
        status: 'UNSUPPORTED',
        currency: countryMeta.currency,
        reason: `Local currency deposits are not currently supported for ${countryMeta.name}. Please use Direct Solana USDC funding.`
      };

  // 2. Off-ramp evaluation
  let offramp;
  if (environment === 'production') {
    // In production, off-ramp is supported if provider has enabled remittance
    const isLiveSupported = SWITCH_ONRAMP_ACTIVE.has(countryCode) || SWITCH_OFFRAMP_SANDBOX_BLOCKED.has(countryCode);
    offramp = isLiveSupported
      ? {
          supported: true,
          status: 'ACTIVE',
          currency: countryMeta.currency,
          defaultChannel: countryMeta.defaultChannel || 'BANK',
          channels: countryMeta.defaultChannel === 'MOBILEMONEY' ? ['MOBILEMONEY', 'BANK'] : ['BANK'],
          institutionsSupported: true
        }
      : {
          supported: false,
          status: 'UNSUPPORTED',
          currency: countryMeta.currency,
          reason: `Local currency payouts are not supported for ${countryMeta.name}. Direct Solana USDC withdrawal is available.`
        };
  } else {
    // In Sandbox environment
    if (SWITCH_OFFRAMP_SANDBOX_ACTIVE.has(countryCode)) {
      offramp = {
        supported: true,
        status: 'ACTIVE',
        currency: countryMeta.currency,
        defaultChannel: countryMeta.defaultChannel || 'BANK',
        channels: ['BANK'],
        institutionsSupported: true,
        instructions: `Instant bank transfer payout to any Nigerian bank in NGN.`
      };
    } else if (SWITCH_OFFRAMP_SANDBOX_BLOCKED.has(countryCode)) {
      offramp = {
        supported: false,
        status: 'BLOCKED_PROVIDER',
        currency: countryMeta.currency,
        defaultChannel: countryMeta.defaultChannel || 'MOBILEMONEY',
        reason: `Local ${countryMeta.defaultChannel === 'MOBILEMONEY' ? 'mobile money' : 'bank'} payouts for ${countryMeta.name} are awaiting Switch provider activation in this sandbox environment. Direct Solana USDC withdrawal is fully supported.`,
        institutionsSupported: false
      };
    } else {
      offramp = {
        supported: false,
        status: 'UNSUPPORTED',
        currency: countryMeta.currency,
        reason: `Local currency payouts are not supported for ${countryMeta.name}. Direct Solana USDC withdrawal is available.`,
        institutionsSupported: false
      };
    }
  }

  // 3. Solana evaluation (Universal: 100% available across all countries)
  const solana = {
    supported: true,
    status: 'ACTIVE',
    token: 'USDC',
    network: 'Solana',
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    decimals: 6,
    depositSupported: true,
    withdrawalSupported: true,
    minWithdrawal: 1,
    instructions: 'Send or withdraw verified Circle USDC directly on the Solana blockchain.'
  };

  return {
    countryCode,
    countryName: countryMeta.name,
    defaultCurrency: countryMeta.currency,
    continent: countryMeta.continent,
    environment,
    onramp,
    offramp,
    solana
  };
}

/**
 * Returns a list of all recognized countries with metadata for UI selectors.
 */
function getAllCountriesList() {
  return Object.values(COUNTRIES).map(c => ({
    code: c.code,
    name: c.name,
    currency: c.currency,
    continent: c.continent,
    onrampActive: SWITCH_ONRAMP_ACTIVE.has(c.code),
    offrampActiveInSandbox: SWITCH_OFFRAMP_SANDBOX_ACTIVE.has(c.code)
  }));
}

module.exports = {
  COUNTRIES,
  SWITCH_ONRAMP_ACTIVE,
  SWITCH_OFFRAMP_SANDBOX_ACTIVE,
  SWITCH_OFFRAMP_SANDBOX_BLOCKED,
  normalizeCountryCode,
  getCountryName,
  getDefaultCurrency,
  resolveEnvironment,
  getCountryPaymentCapabilities,
  getAllCountriesList
};
