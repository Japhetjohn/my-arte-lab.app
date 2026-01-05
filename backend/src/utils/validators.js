const { BOOKING_LIMITS, SECURITY } = require('./constants');

function isValidEmail(email) {
  const emailRegex = /^\S+@\S+\.\S+$/;
  return emailRegex.test(email);
}

function isValidPassword(password) {
  if (!password || typeof password !== 'string') {
    return false;
  }

  if (password === 'OAUTH_USER_NO_PASSWORD') {
    return true;
  }

  if (password.length < SECURITY.PASSWORD_MIN_LENGTH) {
    return false;
  }

  return SECURITY.PASSWORD_REGEX.test(password);
}

function getPasswordStrength(password) {
  if (!password) return { strength: 0, message: 'No password provided' };

  let strength = 0;
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[@$!%*?&_\-#]/.test(password),
    longLength: password.length >= 12
  };

  strength += checks.length ? 1 : 0;
  strength += checks.uppercase ? 1 : 0;
  strength += checks.lowercase ? 1 : 0;
  strength += checks.number ? 1 : 0;
  strength += checks.special ? 1 : 0;
  strength += checks.longLength ? 1 : 0;

  const messages = {
    0: 'Very weak',
    1: 'Very weak',
    2: 'Weak',
    3: 'Fair',
    4: 'Good',
    5: 'Strong',
    6: 'Very strong'
  };

  return {
    strength,
    maxStrength: 6,
    percentage: (strength / 6) * 100,
    message: messages[strength],
    checks
  };
}

function isValidBookingAmount(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return { valid: false, error: 'Amount must be a valid number' };
  }

  if (amount < BOOKING_LIMITS.MIN_AMOUNT) {
    return {
      valid: false,
      error: `Minimum booking amount is ${BOOKING_LIMITS.MIN_AMOUNT} USDC`
    };
  }

  if (amount > BOOKING_LIMITS.MAX_AMOUNT) {
    return {
      valid: false,
      error: `Maximum booking amount is ${BOOKING_LIMITS.MAX_AMOUNT} USDC`
    };
  }

  // Check decimal places (handle floating point precision)
  const decimalPlaces = (amount.toString().split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    return {
      valid: false,
      error: 'Amount can have at most 2 decimal places'
    };
  }

  return { valid: true };
}

function isValidWalletAddress(address, network = 'Solana') {
  if (!address || typeof address !== 'string') {
    return false;
  }

  if (network === 'Solana') {
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return base58Regex.test(address);
  }

  return false;
}

function isValidObjectId(id) {
  if (!id || typeof id !== 'string') {
    return false;
  }

  return /^[0-9a-fA-F]{24}$/.test(id);
}

function isValidURL(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidPhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
}

function isValidCountryCode(code) {
  if (!code || typeof code !== 'string') {
    return false;
  }

  return /^[A-Z]{2}$/.test(code.toUpperCase());
}

function sanitizeNumericInput(value, options = {}) {
  const {
    min = -Infinity,
    max = Infinity,
    decimals = 2,
    defaultValue = 0
  } = options;

  const num = parseFloat(value);

  if (isNaN(num)) {
    return defaultValue;
  }

  const clamped = Math.max(min, Math.min(max, num));
  const factor = Math.pow(10, decimals);
  return Math.round(clamped * factor) / factor;
}

function validateRequiredFields(obj, requiredFields) {
  const missing = [];

  for (const field of requiredFields) {
    if (field.includes('.')) {
      const parts = field.split('.');
      let value = obj;
      let exists = true;

      for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part];
        } else {
          exists = false;
          break;
        }
      }

      if (!exists || value === null || value === undefined || value === '') {
        missing.push(field);
      }
    } else {
      if (!(field in obj) || obj[field] === null || obj[field] === undefined || obj[field] === '') {
        missing.push(field);
      }
    }
  }

  return {
    valid: missing.length === 0,
    missing
  };
}

module.exports = {
  isValidEmail,
  isValidPassword,
  getPasswordStrength,
  isValidBookingAmount,
  isValidWalletAddress,
  isValidObjectId,
  isValidURL,
  isValidPhoneNumber,
  isValidCountryCode,
  sanitizeNumericInput,
  validateRequiredFields
};
