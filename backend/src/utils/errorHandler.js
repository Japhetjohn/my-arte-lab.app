class ErrorHandler extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

const sendErrorResponse = (err, res) => {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  if (process.env.NODE_ENV === 'development') {
    res.status(statusCode).json({
      success: false,
      error: message,
      statusCode,
      stack: err.stack
    });
  } else {
    const isClientError = statusCode >= 400 && statusCode < 500;
    res.status(statusCode).json({
      success: false,
      error: (err.isOperational || isClientError) ? message : 'Something went wrong',
      statusCode
    });
  }
};

const errorMiddleware = async (err, req, res, next) => {
  console.error(' Error:', err);

  const statusCode = err.statusCode || err.status || 500;
  const isClientError = statusCode >= 400 && statusCode < 500;

  // Send email notification for critical unexpected errors in production (exclude normal 4xx client errors)
  if (process.env.NODE_ENV === 'production' && !isClientError) {
    const shouldNotify =
      !err.isOperational || // Unexpected errors
      statusCode >= 500 || // Server errors
      err.name === 'MongoError' || // Database errors
      err.message?.includes('payment') || // Payment-related system errors
      err.message?.includes('wallet') || // Wallet-related system errors
      err.message?.includes('escrow'); // Escrow-related system errors

    if (shouldNotify) {
      try {
        const emailService = require('../services/emailService');
        await emailService.sendErrorNotification({
          error: err,
          req,
          additionalInfo: {
            environment: process.env.NODE_ENV,
            timestamp: new Date().toISOString()
          }
        });
      } catch (emailError) {
        console.error('Failed to send error notification:', emailError.message);
      }
    }
  }

  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(e => e.message).join(', ');
    return sendErrorResponse(new ErrorHandler(message, 400), res);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    const message = `${field} already exists`;
    return sendErrorResponse(new ErrorHandler(message, 400), res);
  }

  if (err.name === 'JsonWebTokenError') {
    return sendErrorResponse(new ErrorHandler('Invalid token', 401), res);
  }

  if (err.name === 'TokenExpiredError') {
    return sendErrorResponse(new ErrorHandler('Token expired', 401), res);
  }

  if (err.name === 'CastError') {
    return sendErrorResponse(new ErrorHandler('Invalid ID format', 400), res);
  }

  sendErrorResponse(err, res);
};

module.exports = {
  ErrorHandler,
  catchAsync,
  errorMiddleware
};
