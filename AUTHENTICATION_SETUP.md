# MyArteLab Authentication Setup Guide

This guide will help you set up the complete authentication system with email verification and Google OAuth.

## 🎨 Brand Colors Applied
- **Accent Color**: `#9747FF` (Titles, buttons, links, icons)
- **Background Color**: `#4B1D80` (Login/Signup page backgrounds)

---

## 📋 Prerequisites

Before you begin, make sure you have:
- MongoDB installed and running (✅ Already installed and running)
- Node.js and npm installed
- A Gmail account for sending verification emails
- Google Cloud account for OAuth (free)

---

## 🔧 Step 1: Configure Environment Variables

### Server Configuration

Open `/server/.env` and update the following values:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/myartelab
JWT_SECRET=myartelab_super_secret_key_change_in_production_2024

# Email Configuration (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_APP_PASSWORD=your-app-password-here

# Client URL (Frontend)
CLIENT_URL=http://localhost:5173

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
SESSION_SECRET=your-session-secret-here-change-in-production
```

---

## 📧 Step 2: Set Up Gmail App Password

1. **Go to your Google Account**: https://myaccount.google.com/
2. **Enable 2-Step Verification**:
   - Go to Security → 2-Step Verification
   - Follow the steps to enable it
3. **Create App Password**:
   - Go to Security → 2-Step Verification → App passwords
   - Select "Mail" as the app and "Other" as the device
   - Name it "MyArteLab" and click Generate
   - Copy the 16-character password (looks like: xxxx xxxx xxxx xxxx)
4. **Update .env**:
   ```env
   EMAIL_USER=your-email@gmail.com
   EMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx  # Remove spaces when pasting
   ```

---

## 🔑 Step 3: Set Up Google OAuth

### Create Google Cloud Project

1. **Go to Google Cloud Console**: https://console.cloud.google.com/

2. **Create a New Project**:
   - Click "Select a project" → "New Project"
   - Name: "MyArteLab"
   - Click "Create"

3. **Enable Google+ API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click "Enable"

4. **Create OAuth 2.0 Credentials**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Configure consent screen if prompted:
     - User Type: External
     - App name: MyArteLab
     - User support email: your-email@gmail.com
     - Developer contact: your-email@gmail.com
     - Add scopes: email, profile
     - Add test users: your-email@gmail.com
   - Application type: "Web application"
   - Name: "MyArteLab Web Client"
   - Authorized JavaScript origins:
     ```
     http://localhost:5173
     http://localhost:5000
     ```
   - Authorized redirect URIs:
     ```
     http://localhost:5000/api/auth/google/callback
     ```
   - Click "Create"

5. **Copy Credentials**:
   - You'll see a modal with your Client ID and Client Secret
   - Copy both values

6. **Update .env**:
   ```env
   GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret-here
   ```

---

## 🗄️ Step 4: Set Up MongoDB Compass (Database Viewer)

### Install MongoDB Compass

1. **Download**: https://www.mongodb.com/try/download/compass
2. **Install** the application for your operating system

### Connect to Your Database

1. **Open MongoDB Compass**
2. **Connection String**:
   ```
   mongodb://localhost:27017/myartelab
   ```
3. **Click "Connect"**
4. **You'll see**:
   - Database: `myartelab`
   - Collections: `users`, `bookings`, `reviews`, `transactions`

### Viewing Users

1. **Select** the `myartelab` database
2. **Click** on the `users` collection
3. **You can now**:
   - View all registered users
   - Check email verification status (`emailVerified` field)
   - See OAuth provider (`oauthProvider`: local or google)
   - View user roles (creator, client, admin)
   - Manually edit documents if needed

---

## 🚀 Step 5: Start the Application

### Terminal 1 - Backend
```bash
cd server
npm install  # If not already done
npm run dev
```

The server will start on http://localhost:5000

### Terminal 2 - Frontend
```bash
cd client
npm install  # If not already done
npm run dev
```

The app will start on http://localhost:5173

---

## ✅ Step 6: Test the Authentication System

### Test Email/Password Registration

1. **Go to**: http://localhost:5173/signup?role=client
2. **Fill out the form**:
   - Name: Test User
   - Email: your-test-email@gmail.com
   - Password: test123
   - Location: Lagos, Nigeria
3. **Click "Create Account"**
4. **You should see**: Success message about verification email
5. **Check your email inbox**: You'll receive a verification email
6. **Click the verification link** in the email
7. **You'll be redirected** to the verification success page

### Test Google OAuth

1. **Go to**: http://localhost:5173/login
2. **Click** "Sign in with Google"
3. **Select your Google account**
4. **Grant permissions**
5. **You'll be automatically logged in** and redirected to the dashboard

### Test Login with Email Verification Check

1. **Go to**: http://localhost:5173/login
2. **Enter credentials** from your registered account
3. **If email not verified**: Warning banner appears with resend option
4. **If email verified**: Redirected to dashboard

---

## 🎯 Features Implemented

### Authentication Methods
✅ Email/Password registration and login
✅ Google OAuth sign-in
✅ Email verification with token
✅ Resend verification email
✅ JWT-based session management

### Security Features
✅ Password hashing with bcryptjs
✅ JWT token expiration (30 days)
✅ Email verification required
✅ Secure session management
✅ CORS protection

### User Experience
✅ Brand colors (#9747FF accent, #4B1D80 background)
✅ Success/error messaging
✅ Loading states
✅ Email verification warnings
✅ OAuth seamless integration
✅ Responsive design

---

## 📊 API Endpoints

### Public Routes
- `POST /api/auth/register` - Register with email/password
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/verify-email/:token` - Verify email
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - Google OAuth callback

### Protected Routes (Requires JWT Token)
- `GET /api/auth/me` - Get current user
- `POST /api/auth/resend-verification` - Resend verification email

---

## 🐛 Troubleshooting

### Email Not Sending

**Problem**: Verification emails not arriving

**Solutions**:
1. Check Gmail App Password is correct (16 characters, no spaces)
2. Verify 2-Step Verification is enabled
3. Check spam/junk folder
4. Check server console for error messages
5. Try using a different Gmail account

### Google OAuth Not Working

**Problem**: OAuth redirect fails or shows error

**Solutions**:
1. Verify Google Client ID and Secret are correct
2. Check redirect URI matches exactly: `http://localhost:5000/api/auth/google/callback`
3. Ensure Google+ API is enabled
4. Add your email as a test user in OAuth consent screen
5. Clear browser cookies and try again

### MongoDB Connection Issues

**Problem**: "MongoDB connection error"

**Solutions**:
1. Check MongoDB is running: `pgrep -x mongod`
2. Start MongoDB if not running
3. Verify connection string in .env
4. Check MongoDB Compass can connect

### Token Expired Error

**Problem**: "Invalid or expired verification token"

**Solutions**:
1. Verification tokens expire after 24 hours
2. Click "Resend verification email" on login page
3. Check your email for the new verification link

---

## 🔒 Security Recommendations for Production

Before deploying to production:

1. **Change all secrets** in .env file
2. **Use environment variables** in production (not .env file)
3. **Enable HTTPS** (set `NODE_ENV=production`)
4. **Use production email service** (SendGrid, AWS SES)
5. **Update OAuth redirect URIs** to production domain
6. **Enable rate limiting** on auth endpoints
7. **Add CAPTCHA** to prevent bots
8. **Set secure cookie flags** in session configuration

---

## 📝 Database Schema

### User Model Fields

```javascript
{
  email: String (unique, required)
  password: String (hashed, optional for OAuth)
  role: String (creator | client | admin)

  // OAuth fields
  oauthProvider: String (local | google)
  oauthId: String

  // Email verification
  emailVerified: Boolean
  emailVerificationToken: String (hashed)
  emailVerificationExpires: Date

  // Profile
  profile: {
    name: String
    location: String
    category: String (photography | design)
    bio: String
    portfolio: Array
    rates: Array
  }

  // Other fields
  wallet: Object
  verified: Boolean
  reviews: Array
  rating: Number
  totalReviews: Number
  createdAt: Date
  updatedAt: Date
}
```

---

## 🎓 Next Steps

Now that authentication is set up:

1. **Test all flows** thoroughly
2. **Customize email templates** in `/server/utils/emailService.js`
3. **Add password reset** functionality (if needed)
4. **Implement user profile** editing
5. **Add role-based features** for creators and clients
6. **Set up payment integration** for bookings

---

## 💡 Support

If you encounter any issues:
1. Check the server console for error messages
2. Check the browser console for frontend errors
3. Review the troubleshooting section above
4. Verify all environment variables are set correctly

---

**Created**: 2025-10-26
**Stack**: Vue.js 3, Express.js, MongoDB, Passport.js, Nodemailer
