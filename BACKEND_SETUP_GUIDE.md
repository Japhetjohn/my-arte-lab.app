# MyArteLab Backend Setup Guide
## Complete Step-by-Step Instructions

This guide will walk you through gathering everything needed to build your complete backend with Tsara stablecoin payments.

---

## 📋 Quick Checklist

Before we start coding, you'll need:

- [ ] **Tsara API Credentials** (Public & Secret keys)
- [ ] **MongoDB Connection** (Local or Cloud)
- [ ] **Email Service** (for notifications)
- [ ] **File Storage Solution** (for images)
- [ ] **Tech Stack Confirmation** (Node.js preferences)

---

## 1️⃣ TSARA PAYMENT GATEWAY

### What You Need from Tsara:
- **API Public Key** (used in frontend)
- **API Secret Key** (used in backend - keep secure!)
- **Webhook Secret** (for payment notifications)
- **Supported Stablecoins** (USDT, USDC, etc.)
- **API Documentation URL**

### How to Get It:

**Step 1: Visit Tsara Dashboard**
- Go to https://usetsara.com
- Sign up or log in to your account

**Step 2: Create Account/Business Profile**
- Complete KYC (Know Your Customer) verification
- Add your business details (MyArteLab)
- Verify your email/phone

**Step 3: Access API Credentials**
- Navigate to Settings → API Keys or Developer Section
- Generate API keys (Test & Live mode)
- Copy both keys somewhere safe

**Step 4: Configure Webhooks**
- Set webhook URL (I'll provide this after building backend)
- Copy the webhook secret
- Enable events: `payment.success`, `payment.failed`, `withdrawal.completed`

**Step 5: Test Mode First**
- Make sure to get TEST API keys first
- We'll build and test everything before going live

### What to Provide Me:
```
TSARA_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx
TSARA_SECRET_KEY=sk_test_xxxxxxxxxxxxx
TSARA_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
SUPPORTED_STABLECOINS=USDT,USDC,DAI
```

**📝 NOTE:** If Tsara documentation is available, please share the link with me so I can integrate properly.

**⚠️ IMPORTANT:** Is usetsara.com already live? If you have an account, please check:
- Dashboard URL
- Developer documentation link
- Any integration examples they provide

---

## 2️⃣ MONGODB DATABASE

### Option A: Local MongoDB (Simplest for Development)

**Check if MongoDB is already running:**
```bash
# Run this command in your terminal
mongosh

# Or check if MongoDB service is running
sudo systemctl status mongod
```

**If MongoDB is installed:**
- Connection String: `mongodb://localhost:27017/myartelab`
- No additional setup needed!

**If MongoDB is NOT installed on Kali Linux:**
```bash
# Install MongoDB
sudo apt update
sudo apt install -y mongodb

# Start MongoDB service
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Verify it's running
sudo systemctl status mongodb
```

### Option B: MongoDB Atlas (Cloud - Free Tier Available)

**Step 1: Create Account**
- Go to https://www.mongodb.com/cloud/atlas
- Click "Try Free" and sign up
- Verify your email

**Step 2: Create Cluster**
- Choose "Shared" (Free tier - M0)
- Select region closest to you (Africa recommended)
- Cluster name: `myartelab-cluster`
- Click "Create Cluster" (takes 1-3 minutes)

**Step 3: Setup Database Access**
- Go to "Database Access" in left menu
- Click "Add New Database User"
- Username: `myartelab_admin`
- Password: Generate secure password (save it!)
- User Privileges: "Atlas admin"
- Click "Add User"

**Step 4: Network Access**
- Go to "Network Access" in left menu
- Click "Add IP Address"
- Click "Allow Access from Anywhere" (for development)
- Or add your specific IP address
- Click "Confirm"

**Step 5: Get Connection String**
- Go to "Database" in left menu
- Click "Connect" on your cluster
- Choose "Connect your application"
- Driver: Node.js, Version: 5.5 or later
- Copy the connection string

**Example Connection String:**
```
mongodb+srv://myartelab_admin:<password>@myartelab-cluster.xxxxx.mongodb.net/myartelab?retryWrites=true&w=majority
```

**Replace `<password>` with your actual password!**

### What to Provide Me:
```
MONGODB_URI=mongodb://localhost:27017/myartelab
# OR
MONGODB_URI=mongodb+srv://username:password@cluster.xxxxx.mongodb.net/myartelab
```

**Which option do you prefer?** Local or Cloud?

---

## 3️⃣ EMAIL SERVICE (For Notifications)

Your platform needs to send emails for:
- Email verification
- Password reset
- Booking confirmations
- Payment notifications
- Withdrawal confirmations

### Recommended Options:

### Option A: Gmail SMTP (Easiest, Free)

**Step 1: Enable 2-Factor Authentication**
- Go to https://myaccount.google.com/security
- Enable "2-Step Verification"

**Step 2: Generate App Password**
- Go to https://myaccount.google.com/apppasswords
- App: Mail
- Device: Other (Custom name) → "MyArteLab Backend"
- Click "Generate"
- Copy the 16-character password (save it!)

**Step 3: Configure**
```
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx (16-char app password)
EMAIL_FROM=MyArteLab <noreply@myartelab.com>
```

**Limitations:**
- 500 emails per day limit
- Good for development/testing
- Not ideal for production at scale

### Option B: SendGrid (Professional, Free Tier: 100 emails/day)

**Step 1: Create Account**
- Go to https://sendgrid.com
- Sign up for free account
- Verify your email

**Step 2: Create API Key**
- Dashboard → Settings → API Keys
- Click "Create API Key"
- Name: "MyArteLab Backend"
- Permissions: "Full Access"
- Click "Create & View"
- **Copy the API key immediately** (you can't see it again!)

**Step 3: Sender Authentication**
- Settings → Sender Authentication
- Choose "Single Sender Verification"
- Fill in your email details
- Verify the confirmation email

**Configuration:**
```
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@myartelab.com
```

### Option C: Mailgun (Alternative, 5000 emails/month free)

Similar to SendGrid, very reliable.

**Which email service do you prefer?** I recommend **Gmail for now** (quick setup) and we can upgrade to SendGrid later.

---

## 4️⃣ FILE STORAGE (Images & Documents)

### Option A: Local File System (Simplest)

**Pros:**
- No setup needed
- Free
- Fast for development

**Cons:**
- Files stored on server
- Hard to scale
- Lost if server resets

**Configuration:**
```
FILE_STORAGE=local
UPLOAD_DIR=/home/japhet/Desktop/myartelab/uploads
```

I'll create the uploads folder structure:
```
uploads/
├── avatars/
├── covers/
├── portfolios/
└── documents/
```

### Option B: Cloudinary (Recommended - Free Tier: 25GB)

**Pros:**
- Image optimization & resizing
- CDN (fast worldwide delivery)
- Image transformations
- Free tier is generous

**Step 1: Create Account**
- Go to https://cloudinary.com
- Sign up for free account
- Verify email

**Step 2: Get Credentials**
- Dashboard shows your credentials immediately:
  - Cloud Name
  - API Key
  - API Secret

**Step 3: Configure Upload Presets**
- Settings → Upload
- Enable "Unsigned uploading" (or use signed)
- Create preset: "myartelab_uploads"

**Configuration:**
```
FILE_STORAGE=cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=xxxxxxxxxxxxxxxxxxxxx
CLOUDINARY_UPLOAD_PRESET=myartelab_uploads
```

### Option C: AWS S3 (Professional)

More complex setup, better for large scale production.

**Which storage do you prefer?** I recommend **Cloudinary** for production quality with easy setup.

---

## 5️⃣ TECH STACK PREFERENCES

### Backend Framework

**I'll build with:**
- **Node.js** + **Express.js**
- **MongoDB** with **Mongoose ODM**
- **JWT** for authentication
- **Bcrypt** for password hashing

**Options:**
- **JavaScript** (easier, faster to build)
- **TypeScript** (more structured, better for long-term)

**Which do you prefer?** I recommend **JavaScript** for faster development, but TypeScript is better for maintenance.

### Additional Tools I'll Include:

✅ **Security:**
- Helmet (security headers)
- CORS (cross-origin requests)
- Rate limiting (prevent abuse)
- Input validation (Joi/Express-validator)

✅ **Development:**
- Nodemon (auto-restart on changes)
- Morgan (request logging)
- Dotenv (environment variables)

✅ **Features:**
- File upload (Multer)
- Email sending (Nodemailer)
- Crypto payments (Tsara SDK)
- API documentation (auto-generated)

---

## 6️⃣ BUSINESS LOGIC CLARIFICATIONS

### Payment Flow

**Current Understanding:**
- Platform commission: **10%** per booking
- Payment in stablecoins only (USDT, USDC, etc.)

**Questions:**

1. **Booking Payment:**
   - Client pays 100% upfront?
   - Or milestone-based payments?
   - Example: $100 booking → $90 to creator, $10 to platform?

2. **Escrow System:**
   - Hold payment until work is completed?
   - Or instant release to creator?
   - Dispute resolution process?

3. **Creator Withdrawals:**
   - Minimum withdrawal amount? (e.g., $20)
   - Withdrawal fee? (0% or platform covers gas fees?)
   - Processing time? (instant or 24-48 hours?)

4. **Refund Policy:**
   - Full refund before work starts?
   - Partial refund if work in progress?
   - Who pays the refund? (creator or platform?)

5. **Currency Display:**
   - Show prices in USD equivalent?
   - Or only in stablecoin amounts?
   - Multiple stablecoin options for payment?

---

## 📝 SUMMARY: What to Provide Me

Please gather and send me the following:

### 1. Tsara Credentials:
```env
TSARA_PUBLIC_KEY=pk_test_xxxxx
TSARA_SECRET_KEY=sk_test_xxxxx
TSARA_WEBHOOK_SECRET=whsec_xxxxx
TSARA_DOCS_URL=https://docs.usetsara.com (if available)
```

### 2. MongoDB:
```env
MONGODB_URI=mongodb://localhost:27017/myartelab
# Or your Atlas connection string
```

### 3. Email Service:
```env
# If Gmail:
EMAIL_SERVICE=gmail
EMAIL_USER=youremail@gmail.com
EMAIL_PASSWORD=your-app-password

# If SendGrid:
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.xxxxx
EMAIL_FROM=noreply@myartelab.com
```

### 4. File Storage:
```env
# If Cloudinary:
FILE_STORAGE=cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=123456789
CLOUDINARY_API_SECRET=xxxxx

# Or just say "use local storage for now"
```

### 5. Preferences:
- JavaScript or TypeScript?
- Any specific requirements?

### 6. Business Logic Answers:
- How should booking payments work?
- Escrow or instant release?
- Minimum withdrawal amount?
- Refund policy?

---

## 🚀 Next Steps

**Once you provide the above:**

1. I'll create the complete backend structure
2. Set up all database models/schemas
3. Build all API endpoints
4. Integrate Tsara payments
5. Add authentication & security
6. Create email templates
7. Set up file uploads
8. Add wallet & transaction system
9. Connect to your frontend
10. Test everything end-to-end
11. Provide API documentation

**Estimated Timeline:**
- Backend core: 2-3 hours
- Payment integration: 1-2 hours (depends on Tsara docs)
- Testing & polish: 1 hour
- **Total: ~4-6 hours of focused work**

---

## ❓ Questions?

If you're unsure about any of these, just tell me:
- "Use the simplest option for now"
- "I need help with X"
- "Let's start with development setup and upgrade later"

I'm here to guide you through every step! 🚀

---

**Ready to start?** Just provide what you can, and we'll figure out the rest together!
