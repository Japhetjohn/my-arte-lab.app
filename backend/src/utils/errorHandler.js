/**
 * Custom Error Handler Class
 */
class ErrorHandler extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async error wrapper - catches errors in async route handlers
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Send error response
 */
const sendErrorResponse = (err, res) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Development error (include stack trace)
  if (process.env.NODE_ENV === 'development') {
    res.status(statusCode).json({
      success: false,
      error: message,
      statusCode,
      stack: err.stack
    });
  } else {
    // Production error (hide stack trace)
    res.status(statusCode).json({
      success: false,
      error: err.isOperational ? message : 'Something went wrong',
      statusCode
    });
  }
};

/**
 * Global error handling middleware
 */
const errorMiddleware = (err, req, res, next) => {
  console.error('❌ Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(e => e.message).join(', ');
    return sendErrorResponse(new ErrorHandler(message, 400), res);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    const message = `${field} already exists`;
    return sendErrorResponse(new ErrorHandler(message, 400), res);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendErrorResponse(new ErrorHandler('Invalid token', 401), res);
  }

  if (err.name === 'TokenExpiredError') {
    return sendErrorResponse(new ErrorHandler('Token expired', 401), res);
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return sendErrorResponse(new ErrorHandler('Invalid ID format', 400), res);
  }

  // Default error
  sendErrorResponse(err, res);
};

module.exports = {
  ErrorHandler,
  catchAsync,
  errorMiddleware
};
