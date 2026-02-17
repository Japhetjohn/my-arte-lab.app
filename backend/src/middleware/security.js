/**
 * Security middleware for preventing common attacks
 */

const { sanitizeObject } = require('../utils/sanitize');

/**
 * Middleware to prevent NoSQL injection attacks
 * Sanitizes req.body, req.query, and req.params
 */
exports.preventNoSQLInjection = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

/**
 * Middleware to add security headers
 */
exports.addSecurityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  res.removeHeader('X-Powered-By');

  next();
};

/**
 * Middleware to prevent parameter pollution
 * Ensures query parameters are not arrays (unless expected)
 */
exports.preventParameterPollution = (allowedArrayParams = []) => {
  return (req, res, next) => {
    if (req.query) {
      Object.keys(req.query).forEach(key => {
        if (Array.isArray(req.query[key]) && !allowedArrayParams.includes(key)) {
          req.query[key] = req.query[key][0];
        }
      });
    }
    next();
  };
};

/**
 * Request logging for security monitoring
 */
exports.securityLogger = (req, res, next) => {
  const securityEvents = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/wallet/withdraw',
    '/api/wallet/offramp/bank'
  ];

  if (securityEvents.some(path => req.path.includes(path))) {
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      userId: req.user ? req.user._id : 'anonymous'
    };

    console.log('[SECURITY]', JSON.stringify(logData));
  }

  next();
};
