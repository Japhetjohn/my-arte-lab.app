const BOOKING_LIMITS = {
  MIN_AMOUNT: 1,
  MAX_AMOUNT: 1000000,
  MAX_PER_USER_PER_HOUR: 10,
  ESCROW_HOLD_DAYS: 30
};

const PLATFORM_CONFIG = {
  COMMISSION_RATE: parseFloat(process.env.PLATFORM_COMMISSION) || 10,
  MINIMUM_WITHDRAWAL: parseFloat(process.env.MINIMUM_WITHDRAWAL) || 20,
  SUPPORTED_CURRENCIES: ['USDC', 'DAI'],
  DEFAULT_CURRENCY: 'USDC',
  DEFAULT_NETWORK: 'Solana',
  PLATFORM_WALLET_ADDRESS: process.env.PLATFORM_WALLET_ADDRESS || 'Bqc5Cf9UAr1rM27HgDDYERSHJAcgfzVH2MnBn7sSdkTg',
  USE_TEMP_WALLETS: true // Use temporary wallets for platform fees before forwarding
};

const RATE_LIMITS = {
  AUTH: {
    WINDOW_MS: 15 * 60 * 1000,
    MAX_REQUESTS: 5,
    SKIP_SUCCESSFUL: true
  },
  API: {
    WINDOW_MS: 15 * 60 * 1000,
    MAX_REQUESTS: 1000 // Increased for development (was 100)
  },
  WEBHOOK: {
    WINDOW_MS: 1 * 60 * 1000,
    MAX_REQUESTS: 100
  },
  PASSWORD_RESET: {
    WINDOW_MS: 60 * 60 * 1000,
    MAX_REQUESTS: 3
  }
};

const SECURITY = {
  MAX_LOGIN_ATTEMPTS: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
  LOCKOUT_DURATION_MINUTES: parseInt(process.env.LOCKOUT_DURATION) || 15,
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 12,
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  JWT_REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE || '30d',
  PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-#]).{8,}$/,
  PASSWORD_MIN_LENGTH: 8
};

const VERIFICATION = {
  EMAIL_CODE_LENGTH: 6,
  EMAIL_CODE_EXPIRE_MINUTES: 30,
  PASSWORD_RESET_EXPIRE_MINUTES: 30
};

const USER_ROLES = {
  CLIENT: 'client',
  CREATOR: 'creator',
  ADMIN: 'admin'
};

const CREATOR_CATEGORIES = {
  PHOTOGRAPHER: 'photographer',
  DESIGNER: 'designer',
  VIDEOGRAPHER: 'videographer',
  ILLUSTRATOR: 'illustrator',
  OTHER: 'other'
};

const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  RELEASED: 'released',
  REFUNDED: 'refunded'
};

const TRANSACTION_TYPES = {
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
  PAYMENT: 'payment',
  EARNING: 'earning',
  ESCROW: 'escrow',
  REFUND: 'refund',
  PLATFORM_FEE: 'platform_fee',
  SWAP: 'swap'
};

const WALLET_ENCRYPTION = {
  VERSION: '1',
  ALGORITHM: 'aes-256-cbc',
  IV_LENGTH: 16,
  KEY_LENGTH: 32
};

const WEBHOOK_REPLAY_PROTECTION = {
  TTL_DAYS: 30,
  MAX_AGE_MINUTES: 5
};

const DEFAULT_LOCATION = {
  COUNTRY: 'Nigeria',
  FORMAT_SEPARATOR: ', '
};

module.exports = {
  BOOKING_LIMITS,
  PLATFORM_CONFIG,
  RATE_LIMITS,
  SECURITY,
  VERIFICATION,
  USER_ROLES,
  CREATOR_CATEGORIES,
  BOOKING_STATUS,
  PAYMENT_STATUS,
  TRANSACTION_TYPES,
  WALLET_ENCRYPTION,
  WEBHOOK_REPLAY_PROTECTION,
  DEFAULT_LOCATION
};
