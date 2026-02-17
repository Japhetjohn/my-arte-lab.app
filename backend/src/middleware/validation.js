const { body, param, query, validationResult } = require('express-validator');
const { errorResponse } = require('../utils/apiResponse');

exports.handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const extractedErrors = {};
    errors.array().forEach(err => {
      extractedErrors[err.param] = err.msg;
    });

    return errorResponse(res, 400, 'Validation failed', extractedErrors);
  }

  next();
};

exports.validateRegister = [
  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters'),

  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-#])/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&_-#)'),

  body('localArea')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Local area must be between 2 and 100 characters'),

  body('state')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('State must be between 2 and 100 characters'),

  body('country')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Country must be between 2 and 100 characters'),

  body('role')
    .optional()
    .isIn(['client', 'creator']).withMessage('Role must be either client or creator'),

  body('category')
    .if(body('role').equals('creator'))
    .notEmpty().withMessage('Category is required for creators')
    .isIn(['photographer', 'designer', 'videographer', 'illustrator', 'other']).withMessage('Invalid category')
];

exports.validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
];

exports.validateBooking = [
  body('creatorId')
    .notEmpty().withMessage('Creator ID is required')
    .isMongoId().withMessage('Invalid creator ID'),

  body('serviceTitle')
    .trim()
    .notEmpty().withMessage('Service title is required')
    .isLength({ max: 200 }).withMessage('Service title cannot exceed 200 characters'),

  body('serviceDescription')
    .trim()
    .notEmpty().withMessage('Service description is required')
    .isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),

  body('category')
    .notEmpty().withMessage('Category is required'),

  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 1 }).withMessage('Amount must be at least 1'),

  body('currency')
    .optional()
    .isIn(['USDT', 'USDC', 'DAI']).withMessage('Invalid currency'),

  body('startDate')
    .notEmpty().withMessage('Start date is required')
    .isISO8601().withMessage('Invalid start date format'),

  body('endDate')
    .notEmpty().withMessage('End date is required')
    .isISO8601().withMessage('Invalid end date format')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    })
];

exports.validateReview = [
  body('rating')
    .notEmpty().withMessage('Rating is required')
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),

  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Comment cannot exceed 1000 characters'),

  body('ratings.communication')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('Communication rating must be between 1 and 5'),

  body('ratings.quality')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('Quality rating must be between 1 and 5'),

  body('ratings.timeliness')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('Timeliness rating must be between 1 and 5'),

  body('ratings.professionalism')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('Professionalism rating must be between 1 and 5')
];

exports.validateWithdrawal = [
  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: parseFloat(process.env.MINIMUM_WITHDRAWAL) || 20 })
    .withMessage(`Minimum withdrawal amount is ${process.env.MINIMUM_WITHDRAWAL || 20}`),

  body('externalAddress')
    .notEmpty().withMessage('Withdrawal address is required')
    .trim()
    .isLength({ min: 32, max: 44 }).withMessage('Invalid Solana wallet address length')
    .matches(/^[1-9A-HJ-NP-Za-km-z]+$/).withMessage('Invalid Solana wallet address format (must be base58)'),

  body('currency')
    .optional()
    .isIn(['USDT', 'USDC', 'DAI']).withMessage('Invalid currency')
];

exports.validateProfileUpdate = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters'),

  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Bio cannot exceed 500 characters'),

  body('location.localArea')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Local area cannot exceed 100 characters'),

  body('location.state')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('State name cannot exceed 100 characters'),

  body('location.country')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Country name cannot exceed 100 characters'),

  body('skills')
    .optional()
    .isArray().withMessage('Skills must be an array'),

  body('skills.*')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Each skill cannot exceed 50 characters')
];

exports.validateObjectId = (paramName = 'id') => [
  param(paramName)
    .isMongoId().withMessage(`Invalid ${paramName}`)
];

exports.validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

exports.validateBookingQuery = [
  query('status')
    .optional()
    .isIn(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'disputed', 'rejected'])
    .withMessage('Invalid booking status'),

  query('type')
    .optional()
    .isIn(['client', 'creator'])
    .withMessage('Type must be either client or creator')
];
