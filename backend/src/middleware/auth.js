const { verifyToken } = require('../utils/jwtUtils');
const { ErrorHandler, catchAsync } = require('../utils/errorHandler');
const User = require('../models/User');

exports.protect = catchAsync(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new ErrorHandler('Not authorized to access this route', 401));
  }

  try {
    const decoded = verifyToken(token);

    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return next(new ErrorHandler('User not found', 404));
    }

    if (!user.isActive) {
      return next(new ErrorHandler('Your account has been deactivated', 403));
    }

    req.user = user;
    next();

  } catch (error) {
    return next(new ErrorHandler('Not authorized to access this route', 401));
  }
});

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
      console.warn('Optional auth token verification failed');
    }
  }

  next();
});

exports.requireEmailVerification = (req, res, next) => {
  if (!req.user.isEmailVerified) {
    return next(new ErrorHandler('Please verify your email to access this resource', 403));
  }
  next();
};

exports.requireCreatorVerification = (req, res, next) => {
  if (req.user.role === 'creator' && !req.user.isVerified) {
    return next(new ErrorHandler('Your creator account is pending verification', 403));
  }
  next();
};
