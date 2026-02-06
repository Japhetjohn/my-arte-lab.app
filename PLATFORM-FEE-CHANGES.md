# Platform Fee Changes - Critical Fix

## Summary
Fixed critical bug where platform fees were being incorrectly charged on deposits instead of bookings.

## Previous (WRONG) Behavior
- ❌ Users deposit $100 → Platform takes 10% → User gets $90
- ❌ Fee deducted at deposit time
- ❌ Users lose 10% immediately on every deposit

## New (CORRECT) Behavior
- ✅ Users deposit $100 → User gets $100 (full amount)
- ✅ Client books creator for $100 → Funds held in escrow
- ✅ Creator completes work → Client approves
- ✅ Platform takes 10% → Creator gets $90, Platform gets $10
- ✅ Fee only charged on successful paid bookings

## Business Logic

### Deposits (On-Ramp) - NO FEES
```javascript
// Fiat Deposit: User deposits $100
User Balance: +$100 (full amount)
Platform Fee: $0
```

```javascript
// Crypto Deposit: User deposits 100 USDC
User Balance: +100 USDC (full amount)
Platform Fee: 0 USDC
```

### Bookings - 10% PLATFORM FEE
```javascript
// Booking Created: $100
Total: $100
Platform Fee: $10 (10%)
Creator Amount: $90

// When funds released after work completion:
Creator receives: $90
Platform receives: $10
```

## Code Changes

### Files Modified

#### 1. `backend/src/controllers/hostfiWebhookController.js`
**Fiat Deposit Webhook (lines 83-124):**
```javascript
// BEFORE (WRONG):
const feeBreakdown = hostfiService.calculatePlatformFee(amount);
user.wallet.balance += feeBreakdown.amountAfterFee;  // User loses 10%

// AFTER (CORRECT):
user.wallet.balance += amount;  // User gets 100%
```

**Crypto Deposit Webhook (lines 164-210):**
```javascript
// BEFORE (WRONG):
const feeBreakdown = hostfiService.calculatePlatformFee(amount);
user.wallet.balance += feeBreakdown.amountAfterFee;  // User loses 10%

// AFTER (CORRECT):
user.wallet.balance += amount;  // User gets 100%
```

#### 2. `backend/src/services/hostfiService.js`
```javascript
// BEFORE: Hardcoded 1%
this.platformFeePercent = 1;

// AFTER: Read from environment
this.platformFeePercent = parseInt(process.env.PLATFORM_COMMISSION) || 10;
```

#### 3. `backend/src/services/bookingService.js`
**NO CHANGES NEEDED** - Already correctly implemented!

Platform fee calculation (lines 372-374):
```javascript
const platformCommission = PLATFORM_CONFIG.COMMISSION_RATE;  // 10%
const platformFee = (amount * platformCommission) / 100;
const creatorAmount = amount - platformFee;
```

Fee collection when funds released (lines 268-299):
```javascript
// Creator receives amount minus platform fee
await User.findOneAndUpdate(
  { _id: creator._id },
  {
    $inc: {
      'wallet.balance': booking.creatorAmount,  // 90%
      'wallet.totalEarnings': booking.creatorAmount
    }
  }
);

// Platform fee transaction recorded
await Transaction.create({
  type: 'platform_fee',
  amount: booking.platformFee,  // 10%
  toAddress: platformWalletInfo.address
});
```

## Impact Analysis

### Revenue Impact
**Example: User deposits $1000 and books a creator for $1000**

**Before (WRONG):**
1. User deposits $1000 → Gets $900 (loses $100 to platform)
2. User books creator for $900 → Platform fee $90 → Creator gets $810
3. **Total platform revenue: $190** (unfair double charging!)
4. **Creator only gets: $810** (should be $900)

**After (CORRECT):**
1. User deposits $1000 → Gets $1000 (full amount)
2. User books creator for $1000 → Platform fee $100 → Creator gets $900
3. **Total platform revenue: $100** (fair single charge)
4. **Creator gets: $900** (correct amount)

### User Experience Impact
**Before:**
- Users confused why deposits are less than expected
- Creators get less than they should
- Platform charges twice (deposit + booking)

**After:**
- Users get exactly what they deposit
- Creators get 90% of booking amount
- Platform charges once (only on successful bookings)

## Gas Sponsor Wallet

Added gas sponsor wallet for transaction fee sponsorship:

```env
GAS_SPONSOR_WALLET=CpFf7PMWhbgVgyL1spwP6mzNRJCsi7GRskyCsu6W59UJ
GAS_SPONSOR_PRIVATE_KEY=[226,161,9,165,66,146,30,81,...]
GAS_SPONSOR_SEED=obscure letter obvious truth lion empower odor own tape panic drop palm
```

## Testing Checklist

### Deposit Tests
- [ ] Fiat deposit of $100 → User receives exactly $100
- [ ] Crypto deposit of 100 USDC → User receives exactly 100 USDC
- [ ] Check transaction records show platformFee: 0

### Booking Tests
- [ ] Create booking for $100 → Platform fee calculated as $10
- [ ] Complete booking → Creator receives $90
- [ ] Platform fee transaction created for $10
- [ ] Check transaction records show correct fee split

### Webhook Tests
- [ ] Fiat deposit webhook processes without fee deduction
- [ ] Crypto deposit webhook processes without fee deduction
- [ ] Check PM2 logs show "no fees on deposits"

## Deployment

### 1. Push to GitHub
```bash
git push origin main
```

### 2. Deploy to VPS
```bash
ssh root@165.232.178.102
cd /var/www/myartelab/backend
bash vps-deploy-fix.sh
```

### 3. Verify Configuration
```bash
# Check environment variables
grep -E "PLATFORM_COMMISSION|GAS_SPONSOR_WALLET|UPLOAD_DIR" .env

# Check PM2 logs
pm2 logs myartelab --lines 100
```

### 4. Test Deposits
- Test fiat deposit via HostFi
- Test crypto deposit via HostFi
- Verify users get full amounts

## Files Changed

### Committed:
- ✅ `backend/src/controllers/hostfiWebhookController.js`
- ✅ `backend/src/services/hostfiService.js`

### Not Committed (.gitignore):
- 🔒 `backend/.env` (contains secrets)

### New Files:
- 📄 `vps-deploy-fix.sh`
- 📄 `PLATFORM-FEE-CHANGES.md`
- 📄 `CRITICAL-FIXES-SUMMARY.md`

## Commits

```
806ec23 - fix: Remove platform fee from deposits - fee only on paid bookings
d85e64d - fix: Platform fee now reads from PLATFORM_COMMISSION env (10%)
393c057 - fix: Use 'SOL' instead of 'Solana' for HostFi network parameter
```

---

**Date:** February 5, 2026
**Critical Priority:** HIGH - Affects revenue and user experience
**Status:** Ready for deployment
