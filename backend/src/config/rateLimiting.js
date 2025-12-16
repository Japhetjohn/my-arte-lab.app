const rateLimit = require('express-rate-limit');
const { RATE_LIMITS } = require('../utils/constants');

const authLimiter = rateLimit({
  windowMs: RATE_LIMITS.AUTH.WINDOW_MS,
  max: RATE_LIMITS.AUTH.MAX_REQUESTS,
  message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: RATE_LIMITS.AUTH.SKIP_SUCCESSFUL,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts. Please try again later.',
      retryAfter: Math.ceil(RATE_LIMITS.AUTH.WINDOW_MS / 1000 / 60)
    });
  }
});

const passwordResetLimiter = rateLimit({
  windowMs: RATE_LIMITS.PASSWORD_RESET.WINDOW_MS,
  max: RATE_LIMITS.PASSWORD_RESET.MAX_REQUESTS,
  message: 'Too many password reset attempts, please try again after 1 hour',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.body.email || req.ip;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many password reset requests. Please try again later.',
      retryAfter: 60
    });
  }
});

const apiLimiter = rateLimit({
  windowMs: RATE_LIMITS.API.WINDOW_MS,
  max: RATE_LIMITS.API.MAX_REQUESTS,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil(RATE_LIMITS.API.WINDOW_MS / 1000 / 60)
    });
  }
});

const webhookLimiter = rateLimit({
  windowMs: RATE_LIMITS.WEBHOOK.WINDOW_MS,
  max: RATE_LIMITS.WEBHOOK.MAX_REQUESTS,
  message: 'Too many webhook requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.webhookVerified === true;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Webhook rate limit exceeded'
    });
  }
});

module.exports = {
  authLimiter,
  passwordResetLimiter,
  apiLimiter,
  webhookLimiter
};
