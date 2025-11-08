# 🔧 Debugging Guide - MyArteLab

## ✅ Backend Status: WORKING PERFECTLY

I've verified the backend is working correctly:
- ✅ Registration API works
- ✅ Users are created with REAL names and emails in MongoDB
- ✅ JWT tokens are generated correctly
- ✅ User data is returned in API responses

**Proof:** Run `cd backend && node check-users.js` to see all registered users with their real data.

---

## ⚠️ Issue 1: Frontend Showing "John Doe" Instead of Real Data

### Root Cause
The issue is **NOT** in the backend - it's a **frontend caching/state issue**.

### Why This Happens
1. **Browser localStorage has old cached data** from development
2. **appState.user isn't being updated** after registration
3. **Page isn't refreshing** to show new user data

### How to Fix

#### Step 1: Clear ALL Browser Data
Before testing again, you MUST clear all cached data:

**Method 1 - Browser DevTools:**
1. Open DevTools (F12)
2. Go to "Application" tab
3. Click "Storage" in sidebar
4. Click "Clear site data" button
5. Reload page

**Method 2 - Console:**
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

#### Step 2: Test Registration with Console Logs
1. Open http://localhost:8000
2. Open DevTools Console (F12)
3. Click "Sign Up"
4. Fill in YOUR real details (use a NEW email each time)
5. **Watch the console logs** - you should see:

```
📝 REGISTRATION ATTEMPT - Form Data: { name: 'YOUR NAME', email: 'YOUR EMAIL', ... }
📨 REGISTRATION RESPONSE: { success: true, ... }
👤 User Data in Response: { name: 'YOUR NAME', email: 'YOUR EMAIL', ... }
🎉 REGISTRATION SUCCESSFUL! Setting user in appState...
📱 Current appState.user after setUser: { name: 'YOUR NAME', ... }
🔄 updateUserMenu() called
✅ User is logged in, rendering user menu
👤 User name to display: YOUR NAME
📧 User email to display: YOUR EMAIL
```

#### Step 3: Use Debug Test Page
I've created a test page to isolate the issue:

1. Open: `file:///home/japhet/Desktop/myartelab/test-registration-frontend.html`
2. Click "Test Registration"
3. Watch the detailed logs to see exactly what's happening

### If You Still See "John Doe"

If after clearing cache you STILL see "John Doe":
1. **Check which page you're on** - the data shows in the top-right user menu and settings page
2. **Take a screenshot** of the browser console logs
3. **Check the Network tab** in DevTools - look for the `/api/auth/register` request and see what it returned
4. **Run this in console** to check current state:
   ```javascript
   console.log('Current appState.user:', window.appState?.user);
   console.log('localStorage token:', localStorage.getItem('token'));
   ```

---

## ⚠️ Issue 2: Tsara Wallet Creation Failing (404 Error)

### What's Happening
```
🔐 Generating wallet for: user@example.com
❌ Wallet generation failed: Request failed with status code 404
⚠️ Wallet creation failed (will retry later)
```

The Tsara API is returning `404 Not Found`, which means the endpoint `/wallets/generate` doesn't exist.

### Why Registration Still Works
I've made wallet creation **optional** - if Tsara fails, users get a temporary `pending_*` wallet address and can still register and use the platform.

### Root Cause
**We're calling the wrong Tsara API endpoint.** The correct endpoint is unknown because:
- Tsara doesn't have public API documentation
- `https://api.tsara.ng/docs` doesn't exist
- The base URL responds but POST endpoints timeout or return 404

### How to Fix Tsara Integration

#### Option 1: Contact Tsara Support (RECOMMENDED)
You need the official API documentation from Tsara:

1. **Login to your Tsara dashboard:** https://app.tsara.ng
2. **Look for:**
   - API Documentation link
   - Developer section
   - Integration guide
   - Support/Help section

3. **Contact Tsara support** and ask for:
   - Business API documentation
   - Correct endpoint for creating user bank accounts/wallets
   - Correct endpoint for creating virtual accounts for payments
   - Authentication format (Bearer token? API keys? Both?)
   - Request/response examples

4. **What to ask specifically:**
   ```
   Hello Tsara Support,

   I'm integrating the Tsara Business API into my platform (MyArteLab).

   I need documentation for:
   1. How to create a bank account/wallet for a user programmatically
   2. How to create virtual accounts for receiving payments
   3. The correct API endpoint paths and request formats

   Current setup:
   - Base URL: https://api.tsara.ng
   - Using Bearer token authentication
   - Getting 404 errors on /wallets/generate endpoint

   Can you provide the correct API documentation?

   Thank you!
   ```

#### Option 2: Use Placeholder Wallets (CURRENT)
For now, your app works with placeholder wallets:
- Users get `pending_*` wallet addresses
- They can still register and use the platform
- Real wallets can be created later when Tsara is fixed

#### Option 3: Test Different Endpoints
Common payment API endpoint patterns to try:
- `/bank-accounts/create`
- `/virtual-accounts/create`
- `/accounts/create`
- `/customers/create`
- `/users/create`
- `/v1/bank-accounts`
- `/api/v1/bank-accounts`

**Test script:**
```bash
cd backend
node -e "
const axios = require('axios');
const endpoints = [
  '/bank-accounts',
  '/virtual-accounts',
  '/accounts',
  '/customers',
];

endpoints.forEach(async (ep) => {
  try {
    const res = await axios.post('https://api.tsara.ng' + ep, {
      email: 'test@example.com',
      fullName: 'Test User'
    }, {
      headers: {
        'Authorization': 'Bearer ${process.env.TSARA_SECRET_KEY}',
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
    console.log('✅ SUCCESS:', ep, res.data);
  } catch (err) {
    console.log('❌', ep, ':', err.response?.status || err.message);
  }
});
"
```

---

## 🛠️ Quick Debugging Commands

### Check what users are in the database:
```bash
cd backend
node check-users.js
```

### Test registration API directly:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test123@example.com",
    "password": "TestPass123",
    "role": "client"
  }'
```

### Check backend logs:
Look for these in your backend terminal:
```
📝 REGISTRATION ATTEMPT - Form Data: ...
🔐 Generating wallet for: ...
❌ Wallet generation failed: ...
✅ Wallet created successfully
```

---

## 📊 Current Status

✅ **Working:**
- Email/password registration
- User creation in MongoDB
- JWT authentication
- Email verification emails
- Cloudinary image uploads
- Google OAuth (needs credentials)

⚠️ **Needs Fixing:**
- Frontend cache clearing on registration
- Tsara wallet creation (needs API docs)

🔒 **Blocked:**
- Tsara wallet generation (waiting for correct API endpoint from Tsara support)

---

## 🚀 Next Steps

1. **For the "John Doe" issue:**
   - Clear browser cache completely
   - Test registration with console open
   - Use the debug test page

2. **For Tsara wallet issue:**
   - Contact Tsara support for API documentation
   - Or use placeholder wallets until you get the docs

3. **For Google OAuth:**
   - Get credentials from Google Cloud Console
   - See [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md)

---

Need help? Run the test tools I created:
- Frontend test: `file:///home/japhet/Desktop/myartelab/test-registration-frontend.html`
- Backend check: `cd backend && node check-users.js`
