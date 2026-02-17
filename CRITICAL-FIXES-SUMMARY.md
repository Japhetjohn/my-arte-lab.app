# Critical Fixes Summary - February 5, 2026

## Issues Found & Fixed

### 1. ❌ **CRITICAL BUG: Platform Fee Error (1% instead of 10%)**
**Problem:** Platform fee was hardcoded to 1% in `hostfiService.js` line 17, but your `.env` specifies `PLATFORM_COMMISSION=10`.

**Impact:** You were only charging 1% commission on all deposits instead of 10%. This is a **major revenue loss**.

**Fix Applied:**
```javascript
// Before (WRONG):
this.platformFeePercent = 1;

// After (CORRECT):
this.platformFeePercent = parseInt(process.env.PLATFORM_COMMISSION) || 10;
```

**Files Changed:**
- `backend/src/services/hostfiService.js` (lines 16-18, 45-48)

---

### 2. 🖼️ **Image Upload 404 Errors**
**Problem:** Images are being uploaded but returning 404 errors when accessed.

**Root Cause:** `UPLOAD_DIR` environment variable not set, causing images to be saved to relative path instead of absolute path `/var/www/myartelab/backend/uploads/`.

**Fix Applied:**
- Added `UPLOAD_DIR=/var/www/myartelab/backend/uploads` to VPS deployment script
- Local .env updated with local path

**What the deployment script will do:**
1. Create upload directories: `avatars/`, `covers/`, `portfolio/`, `services/`
2. Set correct permissions: `chown www-data:www-data` and `chmod 755`
3. Add `UPLOAD_DIR` to VPS `.env` file

---

### 3. 💰 **Wallet Creation with HostFi API**
**Status:** ✅ Already fixed in commit `393c057`

**What was fixed:**
- Changed network parameter from `'Solana'` to `'SOL'` (HostFi API requirement)
- Updated in both `authController.js` and `initializeExistingWallets.js`

**Endpoints Review:**
Based on reading [hostfiService.js](backend/src/services/hostfiService.js):

```javascript
// Wallet Creation Endpoint (lines 261-280)
POST /v1/collections/crypto/addresses
Payload: {
  assetId: "wallet_asset_id",
  currency: "USDC",
  network: "SOL",  // Must be "SOL" not "Solana"
  customId: "user_id"
}
```

**HostFi Wallet Endpoints Available:**
1. `GET /v1/assets` - Get all wallet assets (line 144)
2. `GET /v1/assets/:assetId` - Get specific wallet (line 159)
3. `GET /v1/assets/:assetId/address` - Get wallet address (line 178)
4. `POST /v1/collections/crypto/addresses` - Create crypto collection address (line 271)
5. `GET /v1/collections/crypto/addresses` - Get crypto addresses (line 289)
6. `POST /v1/collections/fiat/channels` - Create fiat channel (line 325)
7. `GET /v1/collections/fiat/channels` - Get fiat channels (line 343)
8. `POST /v1/payouts/fiat` - Initiate fiat payout (line 431)
9. `POST /v1/payouts/crypto` - Initiate crypto payout (line 472)

**Webhook Endpoints Configured:**
- `/api/hostfi/webhooks/address-generated` - When address is created
- `/api/hostfi/webhooks/fiat-deposit` - When user deposits fiat
- `/api/hostfi/webhooks/crypto-deposit` - When user deposits crypto
- `/api/hostfi/webhooks/fiat-payout` - Withdrawal status
- `/api/hostfi/webhooks/crypto-payout` - Crypto withdrawal status

See [HOSTFI-WEBHOOK-SETUP.md](HOSTFI-WEBHOOK-SETUP.md) for webhook configuration.

---

### 4. 📧 **Email Configuration**
**Status:** ✅ Fixed

**Changes:**
- Updated local `.env` with Zoho password: `B09kSRmLv03i`
- Deployment script will update VPS `.env` automatically
- Email templates already using brand colors (#9747FF purple)

---

## Commits Created

1. **393c057** - fix: Use 'SOL' instead of 'Solana' for HostFi network parameter
2. **88ff0e9** - feat: Ensure all users get Solana USDC wallet addresses
3. **c1c35f1** - fix: Update email templates to use brand purple colors (#9747FF)
4. **4a30195** - feat: Configure Zoho Mail SMTP and improve wallet initialization
5. **d85e64d** - fix: Platform fee now reads from PLATFORM_COMMISSION env (10%) ⬅️ **NEW**

---

## Next Steps - Action Required

### Step 1: Push Code to GitHub ⚠️ **USER ACTION REQUIRED**
```bash
git push origin main
```

### Step 2: Deploy to VPS
```bash
# SSH to VPS
ssh root@165.232.178.102

# Run deployment script
cd /var/www/myartelab/backend
bash vps-deploy-fix.sh
```

Or manually:
```bash
ssh root@165.232.178.102
cd /var/www/myartelab/backend
git pull origin main
npm install --production

# Add UPLOAD_DIR to .env
echo "" >> .env
echo "UPLOAD_DIR=/var/www/myartelab/backend/uploads" >> .env

# Update Zoho password
sed -i 's/EMAIL_PASSWORD=.*/EMAIL_PASSWORD=B09kSRmLv03i/' .env

# Create upload directories
mkdir -p /var/www/myartelab/backend/uploads/{avatars,covers,portfolio,services}
chown -R www-data:www-data /var/www/myartelab/backend/uploads
chmod -R 755 /var/www/myartelab/backend/uploads

# Restart application
pm2 restart myartelab
pm2 logs myartelab --lines 50
```

### Step 3: Run Wallet Migration for Existing Users
```bash
# On VPS
cd /var/www/myartelab/backend
node scripts/initializeExistingWallets.js
```

This will create Solana USDC wallet addresses for:
- japhetjohnk@gmail.com
- ebuka.esiobu@myartelab.com

### Step 4: Configure HostFi Webhooks
Follow instructions in [HOSTFI-WEBHOOK-SETUP.md](HOSTFI-WEBHOOK-SETUP.md) to configure webhooks in HostFi dashboard.

### Step 5: Test Everything
1. ✅ Test registration with email verification
2. ✅ Test image upload (avatar, cover, portfolio)
3. ✅ Test wallet creation for new users
4. ✅ Verify platform fee is 10% on deposits

---

## Platform Fee Revenue Impact

**Before Fix:** 1% fee on deposits
**After Fix:** 10% fee on deposits

**Example:**
- User deposits $100 USDC
- **Before:** Platform gets $1, user gets $99 ❌
- **After:** Platform gets $10, user gets $90 ✅

**This was a critical revenue bug that's now fixed.**

---

## Files Modified

### Committed to Git:
- `backend/src/services/hostfiService.js`
- `backend/src/controllers/authController.js` (previous commit)
- `backend/scripts/initializeExistingWallets.js` (previous commit)

### Not Committed (.env is in .gitignore):
- `backend/.env` (local only - VPS will be updated via deployment script)

### New Files Created:
- `vps-deploy-fix.sh` - Automated deployment script
- `CRITICAL-FIXES-SUMMARY.md` - This document

---

## Monitoring After Deployment

```bash
# Check PM2 logs
pm2 logs myartelab --lines 100

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Test image upload
curl -I https://app.myartelab.com/uploads/avatars/test.jpg

# Check upload directory
ls -la /var/www/myartelab/backend/uploads/avatars/

# Verify .env has correct settings
grep -E "UPLOAD_DIR|EMAIL_PASSWORD|PLATFORM_COMMISSION" /var/www/myartelab/backend/.env
```

---

**Last Updated:** February 5, 2026, 17:45 UTC
**Production URL:** https://app.myartelab.com
