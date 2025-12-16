require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const crypto = require('crypto');

const connectDatabase = require('./config/database');
const emailConfig = require('./config/email');
const switchConfig = require('./config/switch');
const { errorMiddleware } = require('./utils/errorHandler');
const {
  preventNoSQLInjection,
  addSecurityHeaders,
  preventParameterPollution,
  securityLogger
} = require('./middleware/security');
const {
  verifySwitchWebhookSignature,
  preventWebhookReplay
} = require('./middleware/webhookSecurity');
const {
  authLimiter,
  passwordResetLimiter,
  apiLimiter,
  webhookLimiter
} = require('./config/rateLimiting');

const authRoutes = require('./routes/authRoutes');
const privyAuthRoutes = require('./routes/privyAuthRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const walletRoutes = require('./routes/walletRoutes');
const creatorRoutes = require('./routes/creatorRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const statsRoutes = require('./routes/statsRoutes');
const servicesRoutes = require('./routes/servicesRoutes');
const favoritesRoutes = require('./routes/favoritesRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// Trust proxy - Required for Render and other cloud platforms
// This allows Express to correctly read X-Forwarded-* headers
app.set('trust proxy', 1);

// Validate required environment variables
const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'PLATFORM_WALLET_ADDRESS',
  'WALLET_ENCRYPTION_KEY',
  'SWITCH_WEBHOOK_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`);
  console.error('Please check your .env file and ensure all required variables are set.');
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

if (process.env.WALLET_ENCRYPTION_KEY === process.env.JWT_SECRET) {
  console.error('❌ CRITICAL: WALLET_ENCRYPTION_KEY must be different from JWT_SECRET');
  process.exit(1);
}

if (process.env.WALLET_ENCRYPTION_KEY.length < 32) {
  console.error('❌ CRITICAL: WALLET_ENCRYPTION_KEY must be at least 32 characters');
  process.exit(1);
}

connectDatabase();

// Configure Helmet with security-hardened CSP
app.use(helmet({
  crossOriginOpenerPolicy: false,
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://auth.privy.io", "https://*.privy.io", "https://challenges.cloudflare.com", "https://*.coinbase.com", "https://*.walletconnect.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://auth.privy.io"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://processor-prod.up.railway.app", "https://api.cloudinary.com", "https://auth.privy.io", "https://*.privy.io", "wss://*.privy.io", "https://*.coinbase.com", "https://*.walletconnect.com", "wss://*.walletconnect.com", "https://*.base.org"],
      fontSrc: ["'self'", "data:", "https://auth.privy.io"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", "https://auth.privy.io", "https://*.privy.io", "https://*.coinbase.com"],
      baseUri: ["'self'"],
      formAction: ["'self'", "https://auth.privy.io"],
      frameAncestors: ["'none'"],
      workerSrc: ["'self'", "blob:"]
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5000',
  'http://localhost:8000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:8000',
  'http://0.0.0.0:5000',
  'http://0.0.0.0:8000',
  'https://my-arte-lab-app.onrender.com',
  'https://auth.privy.io',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, health checks, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // In production, allow same-origin requests from exact Render domain
    if (process.env.NODE_ENV === 'production' && origin === 'https://my-arte-lab-app.onrender.com') {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(preventNoSQLInjection);
app.use(addSecurityHeaders);
app.use(preventParameterPollution());
app.use(securityLogger);

app.use(session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'strict'
  }
}));

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', passwordResetLimiter);
app.use('/api/auth/reset-password', passwordResetLimiter);

app.get('/health', async (req, res) => {
  const health = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    status: 'OK',
    checks: {}
  };

  // Check database connectivity
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.admin().ping();
      health.checks.database = 'connected';
    } else {
      health.checks.database = 'disconnected';
      health.status = 'DEGRADED';
    }
  } catch (error) {
    health.checks.database = `error: ${error.message}`;
    health.status = 'DEGRADED';
  }

  try {
    if (!switchConfig.serviceKey) {
      health.checks.paymentGateway = 'not_configured';
      health.status = 'DEGRADED';
    } else {
      health.checks.paymentGateway = 'configured';
    }
  } catch (error) {
    health.checks.paymentGateway = `error: ${error.message}`;
    health.status = 'DEGRADED';
  }

  try {
    if (!process.env.WALLET_ENCRYPTION_KEY || !process.env.JWT_SECRET) {
      health.checks.security = 'missing_keys';
      health.status = 'DEGRADED';
    } else {
      health.checks.security = 'keys_configured';
    }
  } catch (error) {
    health.checks.security = `error: ${error.message}`;
  }

  const statusCode = health.status === 'OK' ? 200 : 503;
  res.status(statusCode).json(health);
});

app.use('/api/webhooks', verifySwitchWebhookSignature, preventWebhookReplay, webhookLimiter, webhookRoutes);
app.use('/api/auth', privyAuthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/creators', creatorRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'MyArteLab API v1.0',
    documentation: 'See API_DOCUMENTATION.md for details',
    endpoints: {
      auth: '/api/auth',
      bookings: '/api/bookings',
      wallet: '/api/wallet',
      creators: '/api/creators',
      reviews: '/api/reviews',
      webhooks: '/api/webhooks',
      stats: '/api/stats'
    }
  });
});

// Serve frontend static files
const path = require('path');

// Serve built Vite assets from dist directory with correct MIME types
app.use('/dist', express.static(path.join(__dirname, '../frontend/dist'), {
  setHeaders: (res, filepath) => {
    if (filepath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// Also serve /assets directly from /dist/assets for Vite compatibility
app.use('/assets', express.static(path.join(__dirname, '../frontend/dist/assets'), {
  setHeaders: (res, filepath) => {
    if (filepath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Handle client-side routing - send index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// API 404 handler - must come AFTER static file serving
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found'
  });
});

app.use(errorMiddleware);

emailConfig.verifyConnection().catch(err => {
  console.warn('Email service not configured properly');
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log(`║  MyArteLab Backend Server`);
  console.log(`║  Port: ${PORT}`);
  console.log(`║  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`║  API: http://localhost:${PORT}/api`);
  console.log(`║  Payment Gateway: Switch`);
  console.log('╚════════════════════════════════════════════════════════╝\n');
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('SIGTERM', () => {
  server.close(async () => {
    // Close database connection
    try {
      const mongoose = require('mongoose');
      await mongoose.connection.close(false);
    } catch (error) {
      console.error('Error closing database connection:', error);
    }

    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 30000);
});

process.on('SIGINT', () => {
  process.emit('SIGTERM');
});

module.exports = app;
