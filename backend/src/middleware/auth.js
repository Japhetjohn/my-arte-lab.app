const { verifyToken } = require('../utils/jwtUtils');
const { ErrorHandler, catchAsync } = require('../utils/errorHandler');
const User = require('../models/User');

/**
 * Protect routes - require authentication
 */
exports.protect = catchAsync(async (req, res, next) => {
  let token;

  // Get token from header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new ErrorHandler('Not authorized to access this route', 401));
  }

  try {
    // Verify token
    const decoded = verifyToken(token);

    // Get user from token
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return next(new ErrorHandler('User not found', 404));
    }

    if (!user.isActive) {
      return next(new ErrorHandler('Your account has been deactivated', 403));
    }

    // Attach user to request
    req.user = user;
    next();

  } catch (error) {
    return next(new ErrorHandler('Not authorized to access this route', 401));
  }
});

/**
 * Authorize specific roles
 * @param {...String} roles - Allowed roles
 */
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorHandler('Not authorized', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ErrorHandler(`Role '${req.user.role}' is not authorized to access this resource`, 403));
    }

    next();
  };
};

/**
 * Optional authentication - attach user if token exists, but don't require it
 */
exports.optionalAuth = catchAsync(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id).select('-password');
      if (user && user.isActive) {
        req.user = user;
      }
    } catch (error) {
      // Silently fail - authentication is optional
      console.warn('Optional auth token verification failed');
    }
  }

  next();
});

/**
 * Verify email is verified
 */
exports.requireEmailVerification = (req, res, next) => {
  if (!req.user.isEmailVerified) {
    return next(new ErrorHandler('Please verify your email to access this resource', 403));
  }
  next();
};

/**
 * Verify creator is verified
 */
exports.requireCreatorVerification = (req, res, next) => {
  if (req.user.role === 'creator' && !req.user.isVerified) {
    return next(new ErrorHandler('Your creator account is pending verification', 403));
  }
  next();
};
