# 🚀 Quick Start Guide - MyArteLab

## Starting the Backend (No More Port Errors!)

### ✅ The Easy Way (Recommended)
```bash
cd backend
npm run dev:clean
```

This will:
1. ✅ Automatically kill any process on port 5000
2. ✅ Start the backend server
3. ✅ No more "EADDRINUSE" errors!

### Alternative Commands

**Just kill the port:**
```bash
cd backend
npm run kill-port
```

**Start normally (if you're sure port is free):**
```bash
cd backend
npm run dev
```

**Manual kill if scripts don't work:**
```bash
lsof -ti:5000 | xargs kill -9
```

---

## Starting the Frontend

```bash
cd frontend
npm run dev
```

**Frontend URL:** http://localhost:8000

---

## Full Development Workflow

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev:clean
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

---

## Common Issues & Solutions

### ❌ Error: "Port 5000 already in use"
**Solution:** Use `npm run dev:clean` instead of `npm run dev`

### ❌ Error: "Cannot GET /"
**Solution:** Make sure you're accessing http://localhost:8000 (frontend), not port 5000

### ❌ Browser shows "John Doe"
**Solution:** Clear browser cache:
```javascript
// Open browser console (F12) and run:
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### ❌ Registration validation error
**Solution:** Use a strong password:
- ✅ At least 8 characters
- ✅ One uppercase letter
- ✅ One lowercase letter
- ✅ One number
- Example: `SecurePass123`

---

## Environment Setup

### Backend (.env)
```bash
cd backend
cp .env.example .env
```

**Required variables:**
- MongoDB connection
- Tsara API keys
- Cloudinary credentials
- JWT secret
- Email service

### Frontend
No .env needed - it uses http://localhost:5000 by default

---

## Testing

### Test Registration API:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "TestPass123",
    "role": "client"
  }'
```

### Check Backend Health:
```bash
curl http://localhost:5000/health
```

### Check Database Users:
```bash
cd backend
node check-users.js
```

---

## Project Structure

```
myartelab/
├── backend/          # Node.js + Express API
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── server.js
│   ├── kill-port.sh  # Port cleanup script
│   └── package.json
│
├── frontend/         # Vanilla JS SPA
│   ├── js/
│   │   ├── pages/
│   │   ├── services/
│   │   └── app.js
│   ├── css/
│   └── index.html
│
└── docs/            # Documentation
    ├── DEBUGGING_GUIDE.md
    ├── GOOGLE_OAUTH_SETUP.md
    └── TSARA_INTEGRATION_FIXED.md
```

---

## Features Status

| Feature | Status | Notes |
|---------|--------|-------|
| Email/Password Auth | ✅ Working | Use strong password |
| Google OAuth | 🔑 Ready | Needs credentials |
| Tsara Wallets | ✅ Fixed | Solana stablecoin |
| Cloudinary Uploads | ✅ Working | Images stored on CDN |
| Booking System | ✅ Working | With escrow payments |
| Email Verification | ✅ Working | Gmail SMTP |

---

## Quick Commands Cheat Sheet

```bash
# Backend
npm run dev:clean     # Start backend (auto-kill port)
npm run kill-port     # Just kill port 5000
npm run dev          # Start normally
npm test             # Run tests

# Frontend
npm run dev          # Start frontend

# Database
node backend/check-users.js  # Check registered users

# Git
git status           # Check changes
git add .            # Stage all changes
git commit -m "msg"  # Commit changes
git push             # Push to GitHub
```

---

## Documentation

- **[DEBUGGING_GUIDE.md](DEBUGGING_GUIDE.md)** - Troubleshooting guide
- **[TSARA_INTEGRATION_FIXED.md](TSARA_INTEGRATION_FIXED.md)** - Tsara API details
- **[GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md)** - Google OAuth setup

---

## Support

**Need help?**
1. Check the debugging guide
2. Look at backend logs in terminal
3. Check browser console (F12)
4. Review the documentation files

---

**Last Updated:** 2025-11-09
**Backend:** ✅ Running | **Frontend:** ✅ Ready | **Database:** ✅ Connected
