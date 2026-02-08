require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const crypto = require('crypto');

const connectDatabase = require('./config/database');
const emailConfig = require('./config/email');
const hostfiConfig = require('./config/hostfi');
const { errorMiddleware } = require('./utils/errorHandler');
const {
  preventNoSQLInjection,
  addSecurityHeaders,
  preventParameterPollution,
  securityLogger
} = require('./middleware/security');
const {
  authLimiter,
  passwordResetLimiter,
  apiLimiter,
  webhookLimiter,
  adminLimiter
} = require('./config/rateLimiting');
const { verifyAdminAuth } = require('./middleware/adminAuth');

const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const walletRoutes = require('./routes/walletRoutes');
const hostfiWalletRoutes = require('./routes/hostfiWalletRoutes');
const creatorRoutes = require('./routes/creatorRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const statsRoutes = require('./routes/statsRoutes');
const servicesRoutes = require('./routes/servicesRoutes');
const favoritesRoutes = require('./routes/favoritesRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const projectRoutes = require('./routes/projects');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

app.set('trust proxy', 1);

const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'PLATFORM_WALLET_ADDRESS',
  'WALLET_ENCRYPTION_KEY',
  'HOSTFI_CLIENT_ID',
  'HOSTFI_SECRET_KEY'
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

app.use(helmet({
  crossOriginOpenerPolicy: false,  // Required for Coinbase SDK
  crossOriginEmbedderPolicy: false,  // Required for wallet integrations
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://challenges.cloudflare.com", "https://*.coinbase.com", "https://*.walletconnect.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://processor-prod.up.railway.app", "https://api.cloudinary.com", "https://*.coinbase.com", "https://*.walletconnect.com", "wss://*.walletconnect.com", "https://*.base.org"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", "https://*.coinbase.com"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
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
  'https://app.myartelab.com',
  'http://app.myartelab.com',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (process.env.NODE_ENV === 'production' && (origin === 'https://app.myartelab.com' || origin === 'http://app.myartelab.com')) {
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

  // Detailed request/response logging for development
  app.use((req, res, next) => {
    const start = Date.now();
    const originalSend = res.send;

    res.send = function (data) {
      res.send = originalSend;
      const duration = Date.now() - start;

      console.log('\n' + '='.repeat(80));
      console.log(`📥 ${req.method} ${req.originalUrl}`);
      console.log(`⏱️  Duration: ${duration}ms`);
      console.log(`📍 Status: ${res.statusCode}`);

      if (req.body && Object.keys(req.body).length > 0) {
        const sanitizedBody = { ...req.body };
        if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
        console.log('📦 Request Body:', JSON.stringify(sanitizedBody, null, 2));
      }

      if (req.query && Object.keys(req.query).length > 0) {
        console.log('🔍 Query Params:', JSON.stringify(req.query, null, 2));
      }

      if (res.statusCode >= 400) {
        try {
          const responseData = JSON.parse(data);
          console.log('❌ Error Response:', JSON.stringify(responseData, null, 2));
        } catch (e) {
          console.log('❌ Error Response:', data?.toString().substring(0, 500));
        }
      } else if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const responseData = JSON.parse(data);
          if (responseData.success !== undefined) {
            console.log('✅ Success:', responseData.success);
            if (responseData.message) console.log('💬 Message:', responseData.message);
          }
        } catch (e) {
          // Response is not JSON
        }
      }

      console.log('='.repeat(80) + '\n');
      return res.send(data);
    };

    next();
  });
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
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
    ttl: 24 * 60 * 60, // 1 day in seconds
    autoRemove: 'native' // Auto-remove expired sessions
  }),
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
    if (!hostfiConfig.clientId || !hostfiConfig.secretKey) {
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

app.use('/api/webhooks', webhookLimiter, webhookRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/hostfi', hostfiWalletRoutes);
app.use('/api/creators', creatorRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/admin', adminLimiter, verifyAdminAuth, adminRoutes);

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

const path = require('path');

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '7d', // Cache images for 7 days
  setHeaders: (res, filepath) => {
    // Set proper content types for images
    if (filepath.endsWith('.jpg') || filepath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (filepath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filepath.endsWith('.gif')) {
      res.setHeader('Content-Type', 'image/gif');
    } else if (filepath.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/webp');
    }
  }
}));

app.use('/dist', express.static(path.join(__dirname, '../frontend/dist'), {
  setHeaders: (res, filepath) => {
    if (filepath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

app.use('/assets', express.static(path.join(__dirname, '../frontend/dist/assets'), {
  setHeaders: (res, filepath) => {
    if (filepath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

app.use(express.static(path.join(__dirname, '../frontend')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

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
  console.log(`║  Payment Gateway: HostFi`);
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // Start automatic deposit detection
  // const depositPollingService = require('./services/depositPollingService');
  // depositPollingService.start();

  // Start escrow monitoring for auto-refunds
  const escrowMonitoringService = require('./services/escrowMonitoringService');
  escrowMonitoringService.start();
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
  // Stop background services
  const depositPollingService = require('./services/depositPollingService');
  depositPollingService.stop();
  const escrowMonitoringService = require('./services/escrowMonitoringService');
  escrowMonitoringService.stop();

  server.close(async () => {
    try {
      const mongoose = require('mongoose');
      await mongoose.connection.close(false);
    } catch (error) {
      console.error('Error closing database connection:', error);
    }

    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 30000);
});

process.on('SIGINT', () => {
  process.emit('SIGTERM');
});

module.exports = app;
