require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const connectDatabase = require('./config/database');
const emailConfig = require('./config/email');
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
const creatorRoutes = require('./routes/creatorRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const statsRoutes = require('./routes/statsRoutes');
const servicesRoutes = require('./routes/servicesRoutes');
const favoritesRoutes = require('./routes/favoritesRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const projectRoutes = require('./routes/projects');
const messagesRoutes = require('./routes/messagesRoutes');
const blockRoutes = require('./routes/blockRoutes');
const adminRoutes = require('./routes/adminRoutes');
const verificationRoutes = require('./routes/verificationRoutes');
const { trackActivity } = require('./middleware/activityTracker');
const User = require('./models/User');

const app = express();

app.set('trust proxy', 1);

const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'PLATFORM_WALLET_ADDRESS',
  'WALLET_ENCRYPTION_KEY'
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
  crossOriginOpenerPolicy: false,  // Required for Coinbase SDK and OAuth popups
  crossOriginEmbedderPolicy: false,  // Required for wallet integrations
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://challenges.cloudflare.com",
        "https://*.coinbase.com",
        "https://*.walletconnect.com",
        "https://accounts.google.com/gsi/client"
      ],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com/gsi/style"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: [
        "'self'",
        "https://processor-prod.up.railway.app",
        "https://api.cloudinary.com",
        "https://*.coinbase.com",
        "https://*.walletconnect.com",
        "wss://*.walletconnect.com",
        "https://*.base.org",
        "https://accounts.google.com/gsi/",
        "https://oauth2.googleapis.com"
      ],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'", "https://*.coinbase.com", "https://accounts.google.com/gsi/"],
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
  'http://localhost:5173',
  'http://localhost:8000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8000',
  'http://0.0.0.0:5000',
  'http://0.0.0.0:8000',
  process.env.FRONTEND_URL
].filter(Boolean);

// Handle webhook endpoints before strict browser CORS to allow server-to-server notifications
app.use((req, res, next) => {
  if (req.path.startsWith('/webhooks') || req.path.startsWith('/api/webhooks')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-switch-signature, x-switch-timestamp, x-switch-event-id, Authorization');
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
  }
  next();
});

app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin / server-to-server requests (no origin header)
    if (!origin) {
      return callback(null, true);
    }

    // In production, allow the official domains
    if (process.env.NODE_ENV === 'production') {
      const productionDomains = [
        'https://app.myartelab.com',
        'https://myartelab.com',
        'https://www.myartelab.com'
      ];
      if (productionDomains.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    }

    // In development, allow localhost origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    callback(null, false);
  },
  credentials: true
}));

// Apply global API rate limit
app.use('/api', apiLimiter);

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

app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
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
app.use('/webhooks', webhookLimiter, webhookRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/creators', trackActivity, creatorRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/services', trackActivity, servicesRoutes);
app.use('/api/favorites', trackActivity, favoritesRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/projects', trackActivity, projectRoutes);
app.use('/api/messages', trackActivity, messagesRoutes);
app.use('/api/blocks', trackActivity, blockRoutes);
app.use('/api/admin', adminLimiter, verifyAdminAuth, adminRoutes);
app.use('/api/verification', verificationRoutes);

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

// Service Worker with strict no-cache headers to allow instant updates
app.get('/sw.js', (req, res) => {
  const candidates = [
    path.join(__dirname, '../frontend/sw.js'),
    path.join(__dirname, '../frontend/app/public/sw.js')
  ];
  for (const swPath of candidates) {
    if (fs.existsSync(swPath)) {
      res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Service-Worker-Allowed', '/');
      return res.sendFile(swPath);
    }
  }
  return res.status(404).end();
});

// Web App Manifest with correct MIME type
app.get('/manifest.webmanifest', (req, res) => {
  const candidates = [
    path.join(__dirname, '../frontend/manifest.webmanifest'),
    path.join(__dirname, '../frontend/app/public/manifest.webmanifest')
  ];
  for (const manifestPath of candidates) {
    if (fs.existsSync(manifestPath)) {
      res.setHeader('Content-Type', 'application/manifest+json; charset=UTF-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.sendFile(manifestPath);
    }
  }
  return res.status(404).end();
});

app.use(express.static(path.join(__dirname, '../frontend')));

// Cache the SPA index.html template in memory
const indexHtmlPath = path.join(__dirname, '../frontend/index.html');
let indexHtmlTemplate = fs.readFileSync(indexHtmlPath, 'utf8');

function escapeHtmlMeta(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getPublicOrigin(req) {
  const forwardedHost = req.headers['x-forwarded-host'];
  const rawHost = forwardedHost || req.get('host') || 'app.myartelab.com';
  const cleanHost = String(rawHost).split(':')[0].trim();
  if (!cleanHost || cleanHost === 'localhost' || cleanHost === '127.0.0.1') {
    return 'https://app.myartelab.com';
  }
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  return `${proto}://${cleanHost}`;
}

function toAbsoluteUrl(req, urlPath) {
  if (!urlPath) return null;
  if (urlPath.startsWith('http://') || urlPath.startsWith('https://')) {
    return urlPath.replace(/^https?:\/\/localhost(:5000)?/, 'https://app.myartelab.com');
  }
  const origin = getPublicOrigin(req);
  const normalized = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
  return `${origin}${normalized}`;
}

function getMimeTypeFromUrl(url) {
  if (!url) return 'image/png';
  const cleanUrl = url.split('?')[0].toLowerCase();
  if (cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg')) return 'image/jpeg';
  if (cleanUrl.endsWith('.png')) return 'image/png';
  if (cleanUrl.endsWith('.webp')) return 'image/webp';
  if (cleanUrl.endsWith('.gif')) return 'image/gif';
  if (cleanUrl.endsWith('.svg')) return 'image/svg+xml';
  return 'image/jpeg';
}

function replaceMetaTag(html, tagPattern, newTag) {
  return html.replace(tagPattern, newTag);
}

function setOrInjectMeta(html, tagPattern, fullTag) {
  if (tagPattern.test(html)) {
    return html.replace(tagPattern, fullTag);
  }
  return html.replace('</head>', `    ${fullTag}\n  </head>`);
}

function injectSocialMeta(html, {
  title,
  description,
  url,
  type = 'website',
  image,
  imageType = 'image/png',
  imageWidth = 1200,
  imageHeight = 630,
  imageAlt = 'MyArteLab',
  twitterCard = 'summary_large_image'
}) {
  let output = html;
  output = setOrInjectMeta(output, /<title>.*?<\/title>/, `<title>${escapeHtmlMeta(title)}</title>`);
  output = setOrInjectMeta(output, /<meta name="description" content="[^"]*">/, `<meta name="description" content="${escapeHtmlMeta(description)}">`);
  output = setOrInjectMeta(output, /<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${escapeHtmlMeta(url)}">`);
  output = setOrInjectMeta(output, /<meta property="og:type" content="[^"]*">/, `<meta property="og:type" content="${escapeHtmlMeta(type)}">`);
  output = setOrInjectMeta(output, /<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${escapeHtmlMeta(url)}">`);
  output = setOrInjectMeta(output, /<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${escapeHtmlMeta(title)}">`);
  output = setOrInjectMeta(output, /<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${escapeHtmlMeta(description)}">`);
  output = setOrInjectMeta(output, /<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${escapeHtmlMeta(image)}">`);
  output = setOrInjectMeta(output, /<meta property="og:image:secure_url" content="[^"]*">/, `<meta property="og:image:secure_url" content="${escapeHtmlMeta(image)}">`);
  output = setOrInjectMeta(output, /<meta property="og:image:type" content="[^"]*">/, `<meta property="og:image:type" content="${escapeHtmlMeta(imageType)}">`);
  output = setOrInjectMeta(output, /<meta property="og:image:width" content="[^"]*">/, `<meta property="og:image:width" content="${escapeHtmlMeta(imageWidth)}">`);
  output = setOrInjectMeta(output, /<meta property="og:image:height" content="[^"]*">/, `<meta property="og:image:height" content="${escapeHtmlMeta(imageHeight)}">`);
  output = setOrInjectMeta(output, /<meta property="og:image:alt" content="[^"]*">/, `<meta property="og:image:alt" content="${escapeHtmlMeta(imageAlt)}">`);
  output = setOrInjectMeta(output, /<meta property="og:site_name" content="[^"]*">/, '<meta property="og:site_name" content="MyArteLab">');
  output = setOrInjectMeta(output, /<meta property="og:locale" content="[^"]*">/, '<meta property="og:locale" content="en_US">');
  output = setOrInjectMeta(output, /<meta name="twitter:card" content="[^"]*">/, `<meta name="twitter:card" content="${escapeHtmlMeta(twitterCard)}">`);
  output = setOrInjectMeta(output, /<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${escapeHtmlMeta(title)}">`);
  output = setOrInjectMeta(output, /<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${escapeHtmlMeta(description)}">`);
  output = setOrInjectMeta(output, /<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${escapeHtmlMeta(image)}">`);
  output = setOrInjectMeta(output, /<meta name="twitter:image:alt" content="[^"]*">/, `<meta name="twitter:image:alt" content="${escapeHtmlMeta(imageAlt)}">`);
  return output;
}

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

// SEO & AI Crawlers text files
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.sendFile(path.join(__dirname, '../frontend/robots.txt'));
});

app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  res.sendFile(path.join(__dirname, '../frontend/sitemap.xml'));
});

app.get('/llms.txt', (req, res) => {
  res.type('text/plain');
  res.sendFile(path.join(__dirname, '../frontend/llms.txt'));
});

app.get('/llms-full.txt', (req, res) => {
  res.type('text/plain');
  res.sendFile(path.join(__dirname, '../frontend/llms-full.txt'));
});

// Creator profile pages get dynamic OG meta tags for social sharing
app.get('/creator/:identifier', async (req, res, next) => {
  try {
    const { identifier } = req.params;
    let creator;

    if (OBJECT_ID_REGEX.test(identifier)) {
      creator = await User.findOne({
        _id: identifier,
        role: 'creator',
        isActive: true
      }).select('-password');
    } else {
      creator = await User.findOne({
        seoSlug: identifier,
        role: 'creator',
        isActive: true
      }).select('-password');
    }

    const origin = getPublicOrigin(req);

    if (!creator) {
      const notFoundTitle = 'Creator Not Found | MyArteLab';
      const notFoundDesc = 'The requested creator profile could not be found on MyArteLab. Built for African creators, trusted by clients globally.';
      const notFoundImage = `${origin}/images/myartelab-og-1200x630.png`;
      let notFoundHtml = injectSocialMeta(indexHtmlTemplate, {
        title: notFoundTitle,
        description: notFoundDesc,
        url: `${origin}/creator/${identifier}`,
        type: 'profile',
        image: notFoundImage,
        imageType: 'image/png',
        imageWidth: 1200,
        imageHeight: 630,
        imageAlt: 'MyArteLab - African Visual Creatives Marketplace',
        twitterCard: 'summary_large_image'
      });
      notFoundHtml = setOrInjectMeta(notFoundHtml, /<meta name="robots" content="[^"]*">/, '<meta name="robots" content="noindex, nofollow">');
      res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(notFoundHtml);
    }

    const profilePath = `/creator/${creator.seoSlug || creator._id.toString()}`;
    const profileUrl = `${origin}${profilePath}`;
    const name = creator.name || `${creator.firstName || ''} ${creator.lastName || ''}`.trim() || 'Visual Creator';
    const categories = Array.isArray(creator.category) ? creator.category.join(', ') : (creator.category || 'Visual Creative');
    const title = `${name} — ${categories} | MyArteLab`;
    const description = creator.bio || `Explore ${name}'s portfolio and visual creative services on MyArteLab. Built for African creators, trusted by clients globally.`;

    let image;
    let imageType;
    let imageWidth;
    let imageHeight;
    let twitterCard;

    if (creator.avatar) {
      image = toAbsoluteUrl(req, creator.avatar);
      imageType = getMimeTypeFromUrl(image);
      imageWidth = 400;
      imageHeight = 400;
      twitterCard = 'summary';
    } else {
      image = `${origin}/images/myartelab-og-1200x630.png`;
      imageType = 'image/png';
      imageWidth = 1200;
      imageHeight = 630;
      twitterCard = 'summary_large_image';
    }

    const html = injectSocialMeta(indexHtmlTemplate, {
      title,
      description,
      url: profileUrl,
      type: 'profile',
      image,
      imageType,
      imageWidth,
      imageHeight,
      imageAlt: `${name}'s profile picture on MyArteLab`,
      twitterCard
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (error) {
    return next(error);
  }
});

// Showcase post pages get dynamic OG meta tags for social sharing
app.get('/post/:identifier', async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const origin = getPublicOrigin(req);

    const sendPostNotFound = () => {
      const notFoundTitle = 'Post Not Found | MyArteLab';
      const notFoundDesc = 'The requested showcase post could not be found on MyArteLab. Built for African creators, trusted by clients globally.';
      const notFoundImage = `${origin}/images/myartelab-og-1200x630.png`;
      let notFoundHtml = injectSocialMeta(indexHtmlTemplate, {
        title: notFoundTitle,
        description: notFoundDesc,
        url: `${origin}/post/${identifier}`,
        type: 'article',
        image: notFoundImage,
        imageType: 'image/png',
        imageWidth: 1200,
        imageHeight: 630,
        imageAlt: 'MyArteLab - African Visual Creatives Marketplace',
        twitterCard: 'summary_large_image'
      });
      notFoundHtml = setOrInjectMeta(notFoundHtml, /<meta name="robots" content="[^"]*">/, '<meta name="robots" content="noindex, nofollow">');
      res.status(404).setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(notFoundHtml);
    };

    if (!OBJECT_ID_REGEX.test(identifier)) {
      return sendPostNotFound();
    }

    const creator = await User.findOne({
      'services._id': identifier,
      isActive: true
    }).select('name firstName lastName services avatar');

    if (!creator || !Array.isArray(creator.services)) {
      return sendPostNotFound();
    }

    const service = creator.services.find(s => s._id.toString() === identifier);
    if (!service) {
      return sendPostNotFound();
    }

    const authorName = creator.name || `${creator.firstName || ''} ${creator.lastName || ''}`.trim() || 'Visual Creator';
    const postTitle = service.title || 'Visual Creative Showcase';
    const title = `${postTitle} by ${authorName} | MyArteLab`;
    const postSnippet = service.description
      ? (service.description.length > 150 ? `${service.description.slice(0, 147)}...` : service.description)
      : 'Explore visual creative projects on MyArteLab. Built for African creators, trusted by clients globally.';
    const postUrl = `${origin}/post/${identifier}`;

    let image;
    let imageType;
    let imageWidth = 1200;
    let imageHeight = 630;
    let twitterCard = 'summary_large_image';

    if (service.images && service.images[0]) {
      image = toAbsoluteUrl(req, service.images[0]);
      imageType = getMimeTypeFromUrl(image);
      imageWidth = 800;
      imageHeight = 533;
      twitterCard = 'summary_large_image';
    } else if (creator.avatar) {
      image = toAbsoluteUrl(req, creator.avatar);
      imageType = getMimeTypeFromUrl(image);
      imageWidth = 400;
      imageHeight = 400;
      twitterCard = 'summary';
    } else {
      image = `${origin}/images/myartelab-og-1200x630.png`;
      imageType = 'image/png';
      imageWidth = 1200;
      imageHeight = 630;
      twitterCard = 'summary_large_image';
    }

    const html = injectSocialMeta(indexHtmlTemplate, {
      title,
      description: postSnippet,
      url: postUrl,
      type: 'article',
      image,
      imageType,
      imageWidth,
      imageHeight,
      imageAlt: `${postTitle} by ${authorName} on MyArteLab`,
      twitterCard
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (error) {
    return next(error);
  }
});

// Default SPA catch-all
app.get('*', (req, res) => {
  res.sendFile(indexHtmlPath);
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

// Add request timeout middleware
app.use((req, res, next) => {
  // Set timeout for all requests (30 seconds)
  req.setTimeout(30000, () => {
    console.error(`Request timeout: ${req.method} ${req.originalUrl}`);
    res.status(503).json({
      success: false,
      error: 'Request timeout - please try again'
    });
  });
  next();
});

const server = app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log(`║  MyArteLab Backend Server`);
  console.log(`║  Port: ${PORT}`);
  console.log(`║  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`║  API: https://app.myartelab.com/api`);
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // Start escrow monitoring for auto-refunds
  const escrowMonitoringService = require('./services/escrowMonitoringService');
  escrowMonitoringService.start();

  // Start verification subscription expiry monitoring
  const verificationExpiryService = require('./services/verificationExpiryService');
  verificationExpiryService.start();

  // Backfill SEO slugs for existing creators that don't have one
  const generateMissingSlugs = async () => {
    try {
      if (mongoose.connection.readyState !== 1) return;
      const creators = await User.find({
        role: 'creator',
        isActive: true,
        $or: [{ seoSlug: { $exists: false } }, { seoSlug: null }, { seoSlug: '' }]
      });
      let count = 0;
      for (const creator of creators) {
        await creator.save();
        count += 1;
      }
      if (count > 0) {
        console.log(`✅ Generated SEO slugs for ${count} existing creators`);
      }

      // Generate up-to-date sitemap with live creators
      try {
        const { generate: generateSitemap } = require('../scripts/generate-sitemap');
        await generateSitemap();
      } catch (sitemapErr) {
        console.warn('⚠️ Could not auto-generate sitemap on startup:', sitemapErr.message);
      }
    } catch (error) {
      console.error('❌ Error generating missing creator slugs:', error.message);
    }
  };

  if (mongoose.connection.readyState === 1) {
    generateMissingSlugs();
  } else {
    mongoose.connection.once('connected', generateMissingSlugs);
  }
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // Log error but don't crash - let the process continue
  // In production, use a logging service like Sentry
  if (process.env.NODE_ENV === 'production') {
    // Notify admin/monitoring service
    console.error(`[CRITICAL] Unhandled rejection at ${new Date().toISOString()}`);
  }
  // Graceful shutdown only in extreme cases
  // server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // For uncaught exceptions, we should exit but gracefully
  // Give existing requests 5 seconds to complete
  console.error(`[CRITICAL] Uncaught exception at ${new Date().toISOString()}`);
  
  // Attempt graceful shutdown
  server.close(() => {
    console.log('Server closed gracefully after uncaught exception');
    process.exit(1);
  });
  
  // Force exit after 5 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error('Forced exit after timeout');
    process.exit(1);
  }, 5000);
});

process.on('SIGTERM', () => {
  // Stop background services
  const escrowMonitoringService = require('./services/escrowMonitoringService');
  escrowMonitoringService.stop();

  const verificationExpiryService = require('./services/verificationExpiryService');
  verificationExpiryService.stop();

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
