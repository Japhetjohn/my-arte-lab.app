# 🚀 Quick Start Guide - MyArteLab Authentication

## What You Need to Provide Me

To complete the setup, I need you to:

1. **Gmail App Password** (for email verification)
2. **Google OAuth Client ID & Secret** (for "Sign in with Google")

Don't worry! I'll guide you step-by-step below 👇

---

## Step 1: MongoDB Compass - View Your Database 📊

### How to Install and View Your Database

1. **Download MongoDB Compass**
   - Visit: https://www.mongodb.com/try/download/compass
   - Download the version for your OS
   - Install it (it's free!)

2. **Connect to Your Database**
   - Open MongoDB Compass
   - You'll see a connection string box
   - Paste this: `mongodb://localhost:27017/myartelab`
   - Click **"Connect"**

3. **View Your Users**
   - On the left sidebar, click `myartelab` database
   - Click on `users` collection
   - You'll see all registered users with:
     - Email addresses
     - Verification status (`emailVerified`: true/false)
     - OAuth provider (`oauthProvider`: local or google)
     - User roles (creator, client, admin)
     - Profile information

**Screenshot of what you'll see:**
```
myartelab
  └── users (collection)
        ├── Document 1: {
        │     email: "user@example.com",
        │     emailVerified: false,
        │     oauthProvider: "local",
        │     role: "client",
        │     ...
        │   }
        └── Document 2: {...}
```

---

## Step 2: Gmail App Password Setup 📧

### Why do we need this?
To send verification emails to users when they sign up.

### How to Get Your Gmail App Password (5 minutes)

1. **Open Google Account Settings**
   - Go to: https://myaccount.google.com/
   - Sign in with your Gmail account

2. **Enable 2-Step Verification** (if not already enabled)
   - Click **"Security"** on the left
   - Find **"2-Step Verification"**
   - Click **"Get Started"** and follow the steps
   - (This is required for App Passwords)

3. **Create App Password**
   - Go back to Security
   - Scroll down to **"2-Step Verification"**
   - At the bottom, click **"App passwords"**
   - Select:
     - App: **Mail**
     - Device: **Other** (type "MyArteLab")
   - Click **"Generate"**

4. **Copy the Password**
   - Google will show you a **16-character password** like:
     ```
     xxxx xxxx xxxx xxxx
     ```
   - **Copy this password** (you'll give it to me)

5. **Give Me These:**
   ```
   EMAIL_USER=your-email@gmail.com
   EMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx (paste the 16-char password, remove spaces)
   ```

---

## Step 3: Google OAuth Setup 🔑

### Why do we need this?
So users can sign in with their Google account (one-click login).

### How to Create Google OAuth Credentials (10 minutes)

#### Part A: Create Project

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create New Project**
   - Click the project dropdown at the top
   - Click **"New Project"**
   - Name: `MyArteLab`
   - Click **"Create"**
   - Wait for it to be created (10 seconds)

#### Part B: Set Up OAuth

3. **Configure OAuth Consent Screen**
   - In the left menu, go to: **"APIs & Services" → "OAuth consent screen"**
   - Choose **"External"**
   - Click **"Create"**

   Fill in:
   - App name: `MyArteLab`
   - User support email: your-email@gmail.com
   - Developer contact: your-email@gmail.com
   - Click **"Save and Continue"**

   **Scopes Page:**
   - Click **"Add or Remove Scopes"**
   - Select:
     - `userinfo.email`
     - `userinfo.profile`
   - Click **"Update"**
   - Click **"Save and Continue"**

   **Test Users:**
   - Click **"Add Users"**
   - Add your email: your-email@gmail.com
   - Click **"Save and Continue"**
   - Click **"Back to Dashboard"**

4. **Create OAuth Credentials**
   - In the left menu, go to: **"APIs & Services" → "Credentials"**
   - Click **"Create Credentials"** → **"OAuth client ID"**

   Fill in:
   - Application type: **Web application**
   - Name: `MyArteLab Web Client`

   **Authorized JavaScript origins:**
   - Click **"Add URI"**
   - Add: `http://localhost:5173`
   - Click **"Add URI"** again
   - Add: `http://localhost:5000`

   **Authorized redirect URIs:**
   - Click **"Add URI"**
   - Add: `http://localhost:5000/api/auth/google/callback`

   - Click **"Create"**

5. **Copy Your Credentials**
   - A popup will show your:
     - **Client ID** (looks like: `123456-abcdef.apps.googleusercontent.com`)
     - **Client Secret** (looks like: `GOCSPX-abc123xyz`)
   - **Copy both** (you'll give them to me)

6. **Give Me These:**
   ```
   GOOGLE_CLIENT_ID=123456-abcdef.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-abc123xyz
   ```

---

## Step 4: Give Me Your Credentials 🎯

Once you have:
1. ✅ Gmail email and app password
2. ✅ Google Client ID and Secret

**Tell me:**
```
EMAIL_USER=your-email@gmail.com
EMAIL_APP_PASSWORD=your-16-char-password

GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

**I will then:**
- Update your `.env` file
- Start both servers
- Test the complete authentication flow

---

## Step 5: What Happens Next ✨

Once I have your credentials, I'll:

1. **Update the environment file**
2. **Start the backend** (port 5000)
3. **Start the frontend** (port 5173)
4. **Test everything:**
   - Email/password signup
   - Email verification
   - Google OAuth login
   - Database viewing

Then you'll have a **fully working authentication system** with:
- ✨ Modern, animated UI
- 📧 Email verification
- 🔐 Google OAuth (Sign in with Google)
- 🗄️ MongoDB database viewer
- 🎨 Your brand colors (#9747FF, #4B1D80)

---

## UI Preview - What You'll Get 🎨

### Sign Up Page Features:
- ✨ Floating animated background orbs
- 🎯 Glassmorphism card design
- 📧 Success message after registration
- 🔄 Smooth animations and transitions
- 📱 Fully responsive design
- 🎨 Brand colors throughout

### Sign In Page Features:
- 🔐 Google OAuth button (prominent)
- 📧 Email/password login
- ⚠️ Email verification warning
- 🔄 Resend verification email button
- 🎨 Same modern, animated design
- ⚡ Smooth transitions and hover effects

### Modern UI Elements:
- Rounded corners (rounded-xl, rounded-2xl)
- Shadow effects (shadow-lg, shadow-2xl)
- Hover scale animations (hover:scale-[1.02])
- Gradient backgrounds
- Backdrop blur effects
- Smooth color transitions
- Floating elements
- Professional spacing

---

## Troubleshooting 🔧

### Gmail App Password Not Working
- Make sure 2-Step Verification is enabled
- Remove all spaces from the 16-character password
- Try generating a new App Password

### Google OAuth Not Working
- Check that redirect URI matches exactly: `http://localhost:5000/api/auth/google/callback`
- Make sure you added yourself as a test user
- Clear browser cookies and try again

### MongoDB Compass Can't Connect
- Make sure MongoDB is running: `pgrep -x mongod` (✅ Already confirmed running)
- Check the connection string is exactly: `mongodb://localhost:27017/myartelab`

---

## Summary

**What I need from you:**
1. Gmail email + App Password
2. Google Client ID + Secret

**What you get:**
1. Beautiful modern UI (animations, glassmorphism, brand colors)
2. Email verification system
3. Google OAuth ("Sign in with Google")
4. MongoDB Compass database viewer
5. Fully working authentication

---

**Ready?** Provide me with the credentials above and I'll complete the setup! 🚀
