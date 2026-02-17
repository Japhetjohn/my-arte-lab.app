
module.exports = {
  USER_ROLES: {
    CLIENT: 'client',
    CREATOR: 'creator',
    ADMIN: 'admin'
  },

  BOOKING_STATUS: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    DISPUTED: 'disputed'
  },

  PAYMENT_STATUS: {
    PENDING: 'pending',
    PAID: 'paid',
    FAILED: 'failed',
    REFUNDED: 'refunded',
    CANCELLED: 'cancelled'
  },

  TRANSACTION_TYPES: {
    PAYMENT: 'payment',
    WITHDRAWAL: 'withdrawal',
    REFUND: 'refund',
    COMMISSION: 'commission',
    ESCROW_RELEASE: 'escrow_release'
  },

  TRANSACTION_STATUS: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
  },

  STABLECOINS: {
    USDC: 'USDC',
    DAI: 'DAI'
  },

  NETWORK: {
    SOLANA: 'Solana'
  },

  WITHDRAWAL_STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    REJECTED: 'rejected',
    FAILED: 'failed'
  },

  REVIEW_STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected'
  },

  MESSAGES: {
    SUCCESS: {
      REGISTRATION: 'Registration successful',
      LOGIN: 'Login successful',
      LOGOUT: 'Logout successful',
      PROFILE_UPDATED: 'Profile updated successfully',
      WALLET_CREATED: 'Wallet created successfully',
      BOOKING_CREATED: 'Booking created successfully',
      BOOKING_UPDATED: 'Booking updated successfully',
      PAYMENT_SUCCESSFUL: 'Payment successful',
      WITHDRAWAL_INITIATED: 'Withdrawal initiated successfully',
      REVIEW_SUBMITTED: 'Review submitted successfully'
    },
    ERROR: {
      UNAUTHORIZED: 'Unauthorized access',
      INVALID_CREDENTIALS: 'Invalid credentials',
      USER_EXISTS: 'User already exists',
      USER_NOT_FOUND: 'User not found',
      BOOKING_NOT_FOUND: 'Booking not found',
      INSUFFICIENT_BALANCE: 'Insufficient balance',
      PAYMENT_FAILED: 'Payment failed',
      WITHDRAWAL_FAILED: 'Withdrawal failed',
      INVALID_REQUEST: 'Invalid request',
      SERVER_ERROR: 'Internal server error'
    }
  },

  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500
  },

  FILE_UPLOAD: {
    MAX_SIZE: 5 * 1024 * 1024,
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp']
  },

  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100
  },

  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000,
    MAX_REQUESTS: 100
  }
};
