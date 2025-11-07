const crypto = require('crypto');

/**
 * Crypto Helper Functions
 */

/**
 * Generate random token
 */
const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash data using SHA256
 */
const hashData = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Verify webhook signature
 */
const verifyWebhookSignature = (payload, signature, secret) => {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};

/**
 * Generate reference ID
 */
const generateReferenceId = (prefix = 'REF') => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Encrypt sensitive data
 */
const encryptData = (data, key) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted
  };
};

/**
 * Decrypt sensitive data
 */
const decryptData = (encryptedData, iv, key) => {
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(key),
    Buffer.from(iv, 'hex')
  );
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

module.exports = {
  generateToken,
  hashData,
  verifyWebhookSignature,
  generateReferenceId,
  encryptData,
  decryptData
};
