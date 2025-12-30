/**
 * Admin Authentication Middleware
 * Protects admin routes with API key authentication
 */

const { errorResponse } = require('../utils/apiResponse');
const crypto = require('crypto');

/**
 * Middleware to verify admin API key
 * API key should be sent in X-Admin-API-Key header
 */
exports.verifyAdminAuth = (req, res, next) => {
  try {
    const apiKey = req.headers['x-admin-api-key'];

    if (!apiKey) {
      return errorResponse(res, 401, 'Unauthorized - Admin API key required');
    }

    // Hash the provided API key to compare with stored hash
    const hashedKey = crypto
      .createHash('sha256')
      .update(apiKey)
      .digest('hex');

    // Compare with environment variable
    const adminKeyHash = process.env.ADMIN_API_KEY_HASH;

    if (!adminKeyHash) {
      console.error('ADMIN_API_KEY_HASH not configured in environment');
      return errorResponse(res, 500, 'Admin authentication not configured');
    }

    if (hashedKey !== adminKeyHash) {
      // Log failed admin access attempt
      console.warn(`[SECURITY] Failed admin authentication attempt from IP: ${req.ip}`);
      return errorResponse(res, 403, 'Unauthorized - Invalid admin API key');
    }

    // Log successful admin access
    console.log(`[SECURITY] Admin access granted from IP: ${req.ip} to ${req.path}`);

    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    return errorResponse(res, 500, 'Authentication error');
  }
};

/**
 * Legacy support for admin secret in request body
 * @deprecated Use verifyAdminAuth middleware instead
 */
exports.verifyAdminSecret = (req, res, next) => {
  try {
    const { adminSecret } = req.body;

    if (!adminSecret) {
      return errorResponse(res, 401, 'Unauthorized - Admin secret required');
    }

    if (adminSecret !== process.env.ADMIN_SECRET) {
      console.warn(`[SECURITY] Failed admin authentication attempt from IP: ${req.ip}`);
      return errorResponse(res, 403, 'Unauthorized - Invalid admin secret');
    }

    console.log(`[SECURITY] Admin access granted from IP: ${req.ip} to ${req.path}`);
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    return errorResponse(res, 500, 'Authentication error');
  }
};
