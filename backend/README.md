# MyArteLab Backend

🎨 **Complete backend API for MyArteLab** - A modern creator marketplace with stablecoin payments via Tsara.

## Features

✅ **Complete Authentication System**
- User registration with automatic Tsara wallet generation
- JWT-based authentication
- Password reset & email verification
- Account security (rate limiting, lockout protection)

✅ **Booking Management**
- Create bookings with automatic escrow wallet generation
- Unique wallet address per booking
- Real-time payment tracking via webhooks
- Complete booking lifecycle management

✅ **Automated Payment System**
- Integration with Tsara payment gateway
- Stablecoin payments (USDT, USDC, DAI)
- Automatic 10% platform fee, 90% creator earnings
- Escrow-based fund release system
- Secure payment verification

✅ **Wallet & Transactions**
- Individual wallets for all users
- Complete transaction history
- Creator withdrawal system
- Balance tracking and reporting

✅ **Creator Discovery**
- Advanced search and filtering
- Category-based browsing
- Rating and review system
- Featured creators

✅ **Reviews & Ratings**
- Client reviews for completed bookings
- Creator response to reviews
- Detailed rating metrics
- Helpful vote system

---

## Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT (jsonwebtoken, bcryptjs)
- **Payment Gateway:** Tsara (Stablecoin payments)
- **Email:** Nodemailer (Gmail/SendGrid)
- **File Storage:** Local/Cloudinary
- **Security:** Helmet, CORS, Rate Limiting
- **Validation:** Express-validator

---

## Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   │   ├── database.js   # MongoDB connection
│   │   ├── tsara.js      # Tsara payment config
│   │   └── email.js      # Email service config
│   ├── controllers/      # Request handlers
│   │   ├── authController.js
│   │   ├── bookingController.js
│   │   ├── walletController.js
│   │   ├── creatorController.js
│   │   ├── reviewController.js
│   │   └── webhookController.js
│   ├── middleware/       # Custom middleware
│   │   ├── auth.js       # Authentication & authorization
│   │   └── validation.js # Input validation
│   ├── models/           # MongoDB schemas
│   │   ├── User.js
│   │   ├── Booking.js
│   │   ├── Transaction.js
│   │   └── Review.js
│   ├── routes/           # API routes
│   │   ├── authRoutes.js
│   │   ├── bookingRoutes.js
│   │   ├── walletRoutes.js
│   │   ├── creatorRoutes.js
│   │   ├── reviewRoutes.js
│   │   └── webhookRoutes.js
│   ├── services/         # Business logic
│   │   └── tsaraService.js # Tsara API integration
│   ├── utils/            # Helper functions
│   │   ├── jwtUtils.js
│   │   ├── errorHandler.js
│   │   └── apiResponse.js
│   └── server.js         # Main server file
├── tests/                # Unit & integration tests
├── .env.example          # Environment variables template
├── package.json
├── API_DOCUMENTATION.md  # Complete API docs
└── README.md            # This file
```

---

## Installation & Setup

### Prerequisites

- Node.js 18+ and npm
- MongoDB (local or Atlas)
- Tsara account with API keys

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

### Step 2: Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
# Server
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:8000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/myartelab

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRE=7d

# Tsara Payment Gateway
TSARA_PUBLIC_KEY=pk_live_your_public_key
TSARA_SECRET_KEY=sk_live_your_secret_key
TSARA_WEBHOOK_SECRET=your_webhook_secret
PLATFORM_WALLET_ADDRESS=your_platform_wallet_address

# Email (Choose Gmail or SendGrid)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=MyArteLab <noreply@myartelab.com>

# Platform Settings
PLATFORM_COMMISSION=10
MINIMUM_WITHDRAWAL=20
```

### Step 3: Start MongoDB

**Option A: Local MongoDB**
```bash
sudo systemctl start mongod
```

**Option B: MongoDB Atlas**
- Use connection string in `MONGODB_URI`

### Step 4: Run the Server

**Development mode (with auto-restart):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

**Server will start on:** `http://localhost:5000`

---

## API Endpoints

### Base URL
```
http://localhost:5000/api
```

### Quick Reference

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/auth/register` | POST | Register user | No |
| `/auth/login` | POST | Login | No |
| `/auth/me` | GET | Get current user | Yes |
| `/bookings` | POST | Create booking | Yes |
| `/bookings/:id/release-funds` | POST | Release escrow funds | Yes |
| `/wallet` | GET | Get wallet info | Yes |
| `/wallet/withdraw` | POST | Withdraw funds | Yes (Creator) |
| `/creators` | GET | Search creators | No |
| `/creators/:id` | GET | Get creator profile | No |
| `/reviews` | POST | Create review | Yes (Client) |
| `/webhooks/tsara` | POST | Payment webhook | No (Verified) |

**Full API Documentation:** See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

---

## Payment Flow

### 1. User Registration
```
User signs up → Tsara wallet automatically created → Wallet address stored in database
```

### 2. Booking Creation
```
Client creates booking → Unique escrow wallet generated → Client sends payment to escrow address
```

### 3. Payment Confirmation
```
Payment received → Tsara webhook notifies backend → Booking status updated to "paid"
```

### 4. Work Completion
```
Creator completes work → Marks booking as complete → Client receives notification
```

### 5. Fund Release
```
Client releases funds → Backend calls Tsara API → 90% to creator, 10% to platform → Wallets updated
```

### 6. Withdrawal
```
Creator requests withdrawal → Tsara processes → Funds sent to external wallet
```

---

## Tsara Integration

### Wallet Generation

Every user gets a Tsara wallet on registration:

```javascript
// Automatic on signup
const wallet = await tsaraService.generateWallet({
  userId: user._id,
  email: user.email,
  name: user.name,
  role: user.role
});
```

### Escrow Wallet Generation

Each booking gets a unique escrow address:

```javascript
const escrowWallet = await tsaraService.generateEscrowWallet({
  bookingId: booking.bookingId,
  amount: booking.amount,
  currency: 'USDT',
  clientId: client._id,
  creatorId: creator._id
});
```

### Fund Release (90/10 Split)

```javascript
await tsaraService.releaseEscrowFunds({
  escrowAddress: booking.escrowWallet.address,
  creatorAddress: creator.wallet.address,
  platformAddress: platformWalletAddress,
  creatorAmount: booking.creatorAmount, // 90%
  platformFee: booking.platformFee,     // 10%
  currency: 'USDT'
});
```

### Webhook Handling

```javascript
// Automatic payment detection
POST /api/webhooks/tsara
→ Verifies signature
→ Updates booking status
→ Creates transaction records
→ Notifies users
```

---

## Testing

### Manual Testing

**1. Health Check:**
```bash
curl http://localhost:5000/health
```

**2. Register User:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "Test1234",
    "role": "creator",
    "category": "photographer"
  }'
```

**3. Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234"
  }'
```

**4. Get Creators:**
```bash
curl http://localhost:5000/api/creators
```

### Test Webhook

```bash
curl -X POST http://localhost:5000/api/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment.success",
    "data": {
      "wallet_address": "0x123...",
      "amount": 100
    }
  }'
```

---

## Database Schemas

### User Schema
- Authentication & profile
- Tsara wallet (address, balance, earnings)
- Role (client/creator/admin)
- Portfolio & services (creators)

### Booking Schema
- Client & creator references
- Service details & pricing
- Unique escrow wallet per booking
- Payment & booking status
- Messages & deliverables

### Transaction Schema
- Type (deposit, payment, earning, withdrawal)
- Amount & currency
- Blockchain transaction hash
- Tsara payment ID
- Status tracking

### Review Schema
- Rating (1-5 stars)
- Detailed ratings (communication, quality, etc.)
- Comments & responses
- Helpful votes

---

## Security Features

✅ **Authentication**
- JWT with expiration
- Bcrypt password hashing (12 rounds)
- Account lockout (5 failed attempts)
- Password reset with expiring tokens

✅ **API Security**
- Helmet security headers
- CORS protection
- Rate limiting (100 req/15min)
- Input validation & sanitization

✅ **Payment Security**
- Webhook signature verification
- Escrow-based transactions
- Transaction logging
- Balance verification

---

## Environment Variables

See `.env.example` for complete list. Key variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | Secret for JWT signing | Yes |
| `TSARA_PUBLIC_KEY` | Tsara public API key | Yes |
| `TSARA_SECRET_KEY` | Tsara secret API key | Yes |
| `PLATFORM_WALLET_ADDRESS` | Platform wallet for fees | Yes |
| `EMAIL_USER` | Email service username | Yes |
| `EMAIL_PASSWORD` | Email service password | Yes |

---

## Troubleshooting

### Database Connection Error
```
Error: MongoServerError: Authentication failed
```
**Solution:** Check MongoDB connection string and credentials

### Tsara Wallet Generation Failed
```
Error: Failed to create wallet
```
**Solution:**
- Verify Tsara API keys in `.env`
- Check Tsara service status
- Review Tsara documentation

### Email Sending Failed
```
Error: Email could not be sent
```
**Solution:**
- For Gmail: Enable 2FA and create app password
- For SendGrid: Verify API key and sender authentication

### Port Already in Use
```
Error: EADDRINUSE
```
**Solution:**
```bash
# Find and kill process using port 5000
lsof -ti:5000 | xargs kill -9
```

---

## Development Scripts

```bash
# Start development server (auto-restart)
npm run dev

# Start production server
npm start

# Run tests
npm test

# Lint code
npm run lint
```

---

## Production Deployment

### Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong `JWT_SECRET`
- [ ] Configure production MongoDB (Atlas recommended)
- [ ] Update `FRONTEND_URL` to production domain
- [ ] Set up Tsara webhook URL
- [ ] Configure SendGrid for email (not Gmail)
- [ ] Enable SSL/HTTPS
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Configure log aggregation
- [ ] Set up automatic backups

### Recommended Hosting

- **API:** Railway, Render, Heroku, DigitalOcean
- **Database:** MongoDB Atlas
- **Email:** SendGrid, Mailgun
- **Monitoring:** Sentry, LogRocket

---

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## License

MIT License - See LICENSE file for details

---

## Support

- **Documentation:** [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Issues:** Open a GitHub issue
- **Email:** support@myartelab.com

---

## Acknowledgments

- **Payment Gateway:** Tsara (https://usetsara.com)
- **Framework:** Express.js
- **Database:** MongoDB

---

**Built with ❤️ for the African creator economy**
