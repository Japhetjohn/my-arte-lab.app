require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const passport = require('./config/passport');

const connectDatabase = require('./config/database');
const tsaraConfig = require('./config/tsara');
const emailConfig = require('./config/email');
const { errorMiddleware } = require('./utils/errorHandler');

const authRoutes = require('./routes/authRoutes');
const googleAuthRoutes = require('./routes/googleAuthRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const walletRoutes = require('./routes/walletRoutes');
const creatorRoutes = require('./routes/creatorRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const statsRoutes = require('./routes/statsRoutes');
const servicesRoutes = require('./routes/servicesRoutes');
const favoritesRoutes = require('./routes/favoritesRoutes');

const app = express();

connectDatabase();

app.use(helmet());

const allowedOrigins = [
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'http://0.0.0.0:8000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
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

app.use((req, res, next) => {
  if (req.path === '/api/webhooks/tsara') {
    next();
  } else {
    express.json({ limit: '10mb' })(req, res, next);
  }
});

app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(session({
  secret: process.env.JWT_SECRET || 'myartelab_session_secret_2025',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(passport.initialize());
app.use(passport.session());

const limiter = rateLimit({
  windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'MyArteLab Backend API is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', googleAuthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/creators', creatorRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/favorites', favoritesRoutes);

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

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found'
  });
});

app.use(errorMiddleware);

try {
  tsaraConfig.validate();
  console.log('Tsara configuration validated');
} catch (error) {
  console.error('Tsara configuration error:', error.message);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

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
  console.log(`║  Payment Gateway: Tsara (${tsaraConfig.environment})`);
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
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;
