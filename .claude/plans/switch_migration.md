# Complete Migration from bread.africa to Switch
## Replace Legacy Payment Provider with Global 65-Country Solution

---

## 📋 Current State Analysis

###  bread.africa Integration (LEGACY - TO BE REMOVED)
**What it does:**
- **Onramp:** Virtual account creation for NGN deposits → USDC
- **Offramp:** Bank withdrawals USDC → NGN (Nigeria only)

**Files using bread.africa:**
1. `backend/src/config/bread.js` - Configuration (72 countries listed but NOT actually supported)
2. `backend/src/services/breadService.js` - Service class with onramp/offramp methods
3. `backend/src/controllers/walletController.js` - Controller methods:
   - `initializeBreadAccount()` - Creates bread wallet for users
   - `getExchangeRate()` - NGN/USDC rate
   - `getOfframpQuote()` - Withdrawal quote
   - `requestBankWithdrawal()` - Execute withdrawal
   - `getSupportedBanks()` - Get Nigerian banks
   - `verifyBankAccount()` - Verify bank details
4. `backend/src/routes/walletRoutes.js` - Routes:
   - `GET /wallet/exchange-rate`
   - `POST /wallet/offramp/quote`
   - `GET /wallet/banks`
   - `POST /wallet/offramp/bank`
   - `POST /wallet/verify-bank-account`
5. `backend/src/controllers/webhookController.js` - bread.africa webhooks
6. `backend/src/routes/webhookRoutes.js` - Webhook routes
7. `backend/frontend/js/services/api.js` - Frontend API calls:
   - `getVirtualAccount()` - Onramp
   - `requestBankWithdrawal()` - Offramp
8. `backend/frontend/js/components/modals.js` - UI modals:
   - `showAddFundsModal()` - Virtual account modal
   - `showBankWithdrawal()` - Bank withdrawal form
9. `backend/src/models/User.js` - User model fields:
   - `wallet.breadWalletId`
   - `wallet.breadIdentityId`

**Actual Support:** Nigeria ONLY (despite config claiming 72 countries)

### Switch Integration (CURRENT - INCOMPLETE)
**What's implemented:**
- ✅ Offramp for 65 countries (fully tested)
- ⏳ Onramp NOT YET implemented

**Files created:**
1. `backend/src/config/switch.js` - Configuration ✅
2. `backend/src/services/switchService.js` - Service class ✅
   - Has `getOnrampQuote()` method but NO execute onramp method
3. `backend/src/controllers/walletController.js` - 5 Switch offramp methods ✅
4. `backend/src/routes/walletRoutes.js` - 5 Switch offramp routes ✅

**Actual Support:** 65 countries for offramp, onramp capability unknown

---

## 🎯 Migration Goals

1. **Complete Switch Implementation**
   - ✅ Offramp (already done - 65 countries)
   - ⏳ Onramp (needs implementation)

2. **Remove bread.africa Completely**
   - Delete all bread.africa code
   - Remove bread.africa dependencies
   - Clean up database schema (bread wallet IDs)

3. **Update Frontend**
   - Replace Fund modal with Switch onramp
   - Replace Withdraw modal with Switch offramp (country selector)

4. **Maintain Backward Compatibility**
   - Keep existing user wallet balances
   - Migrate existing beneficiaries if possible

---

## 📐 Implementation Plan

### Phase 1: Research & Document Switch Onramp API ⏰ 30 min

**Tasks:**
1. Fetch Switch onramp documentation
2. Understand onramp flow:
   - How does fiat → crypto work?
   - Virtual accounts? Bank transfers? Card payments?
   - What endpoints exist?
3. Document in `SWITCH_ONRAMP_RESEARCH.md`

**Questions to answer:**
- Does Switch use virtual accounts like bread.africa?
- Or direct bank transfers?
- What's the webhook flow?
- Country-specific requirements?

### Phase 2: Backend - Complete Switch Service ⏰ 2 hours

**File:** `backend/src/services/switchService.js`

**Add missing methods:**
1. `executeOnramp()` - Execute fiat deposit
2. Any other onramp-related methods from API docs

**Example structure (to be refined after API research):**
```javascript
async executeOnramp({
  amount,
  country,
  currency,
  asset = 'solana:usdc',
  reference,
  callbackUrl,
  // ... other params from API
}) {
  const response = await this.api.post('/onramp', {
    amount,
    country,
    currency,
    asset,
    reference,
    callback_url: callbackUrl
    // ... payload structure from API docs
  });
  return response.data;
}
```

### Phase 3: Backend - Replace Controller Methods ⏰ 3 hours

**File:** `backend/src/controllers/walletController.js`

**Remove these bread.africa methods:**
- `initializeBreadAccount()`
- `getExchangeRate()` → Replace with Switch quote
- `getOfframpQuote()` → Already have `getSwitchOfframpQuote()`
- `requestBankWithdrawal()` → Already have `requestSwitchOfframp()`
- `getSupportedBanks()` → Already have `getSwitchBanksByCountry()`
- `verifyBankAccount()` → May need Switch equivalent or remove

**Add new Switch methods:**
1. `getSwitchOnrampQuote()` - Get onramp quote (fiat amount → crypto amount)
2. `requestSwitchOnramp()` - Execute onramp deposit
3. Remove `initializeBreadAccount()` calls from registration flow

**Update existing methods:**
- `getWallet()` - Remove bread.africa wallet sync logic
- Remove all `breadService` imports and calls

### Phase 4: Backend - Update Routes ⏰ 1 hour

**File:** `backend/src/routes/walletRoutes.js`

**Remove bread.africa routes:**
```javascript
// DELETE THESE:
router.get('/exchange-rate', ...)
router.post('/offramp/quote', ...)
router.get('/banks', ...)
router.post('/offramp/bank', ...)
router.post('/verify-bank-account', ...)
```

**Add Switch onramp routes:**
```javascript
// ADD THESE:
router.post('/switch/onramp/quote', publicWalletLimiter, walletController.getSwitchOnrampQuote);
router.post('/switch/onramp', protect, walletController.requestSwitchOnramp);
```

**Final routes structure:**
```javascript
// Public Switch routes
router.get('/switch/countries', ...)  // ✅ Already exists
router.get('/switch/banks/:country', ...)  // ✅ Already exists
router.get('/switch/requirements', ...)  // ✅ Already exists
router.post('/switch/quote/offramp', ...)  // ✅ Rename from /switch/quote
router.post('/switch/quote/onramp', ...)  // ⏳ NEW

// Authenticated Switch routes
router.post('/switch/offramp', ...)  // ✅ Already exists
router.post('/switch/onramp', ...)  // ⏳ NEW
```

### Phase 5: Backend - Update Webhooks ⏰ 2 hours

**File:** `backend/src/controllers/webhookController.js`

**Remove:** `handleBreadWebhook()`

**Add:** `handleSwitchWebhook()` - Handle both onramp and offramp events

**Webhook events to handle:**
- Onramp completed → Credit user wallet
- Onramp failed → Notify user
- Offramp completed → Update transaction status
- Offramp failed → Refund user + notify

**File:** `backend/src/routes/webhookRoutes.js`

**Replace:**
```javascript
// DELETE:
router.post('/bread', webhookController.handleBreadWebhook);

// ADD:
router.post('/switch/onramp', webhookController.handleSwitchOnrampWebhook);
router.post('/switch/offramp', webhookController.handleSwitchOfframpWebhook);
// OR single endpoint:
router.post('/switch', webhookController.handleSwitchWebhook);
```

### Phase 6: Frontend - Update API Service ⏰ 1 hour

**File:** `backend/frontend/js/services/api.js`

**Remove bread.africa methods:**
```javascript
// DELETE:
async getVirtualAccount() { ... }
async requestBankWithdrawal(data) { ... }
async getOfframpQuote(data) { ... }
```

**Add Switch methods:**
```javascript
// ADD:
async getSwitchOnrampQuote(data) {
    return this.post('/wallet/switch/quote/onramp', data);
}

async requestSwitchOnramp(data) {
    return this.post('/wallet/switch/onramp', data);
}

async getSwitchCountries() {
    return this.get('/wallet/switch/countries');
}

async getSwitchBanks(country) {
    return this.get(`/wallet/switch/banks/${country}`);
}

async getSwitchRequirements(country, type = 'INDIVIDUAL') {
    return this.get(`/wallet/switch/requirements?country=${country}&type=${type}`);
}

async getSwitchOfframpQuote(data) {
    return this.post('/wallet/switch/quote/offramp', data);
}

async requestSwitchOfframp(data) {
    return this.post('/wallet/switch/offramp', data);
}
```

### Phase 7: Frontend - Redesign Modals ⏰ 4 hours

**File:** `backend/frontend/js/components/modals.js`

#### A. Replace `showAddFundsModal()` - Onramp

**New flow:**
1. Select country (dropdown with 65 countries)
2. Enter fiat amount
3. Show real-time quote (crypto amount user will receive)
4. Show payment instructions (bank details / payment method)
5. User transfers funds via bank
6. Webhook credits wallet

**Implementation:**
```javascript
export function showAddFundsModal() {
    // Step 1: Country selector
    // Step 2: Amount input + real-time quote
    // Step 3: Show payment instructions (account details or payment link)
    // Step 4: "Waiting for payment" status
}
```

**Key features:**
- Country dropdown with flags
- Currency detection (USD, EUR, NGN, etc.)
- Real-time quote updates
- Payment instructions per country
- "I've made the payment" button → Poll for confirmation

#### B. Replace `showWithdrawModal()` - Offramp

**Current:** Only shows Nigeria bank transfer option

**New flow:**
1. Select country (65 countries)
2. Select bank/payment method for that country
3. Enter amount + see real-time quote
4. Fill beneficiary details (dynamic form per country)
5. Confirm and execute

**Implementation:**
```javascript
export function showWithdrawModal() {
    // Remove old bread.africa Nigeria-only UI
    // Add country selector
    // Add dynamic bank selector per country
    // Add dynamic beneficiary form
    // Keep real-time quote feature
}

window.showCountrySelector = async function() {
    // Fetch countries from /wallet/switch/countries
    // Display in modal
}

window.showBankSelector = async function(country) {
    // Fetch banks for selected country
    // For Kenya: Show M-Pesa/Airtel
    // For Nigeria: Show all banks
    // For USA: Show routing number form
}

window.showOfframpForm = async function(country, bank) {
    // Fetch dynamic requirements
    // Render form fields based on requirements
    // Handle submission
}
```

**Key features:**
- Search/filter countries
- Bank logos
- Dynamic forms (Nigeria: 2 fields, USA: 8 fields, Brazil: CPF)
- Real-time quote
- Save beneficiary option

### Phase 8: Database Cleanup ⏰ 1 hour

**File:** `backend/src/models/User.js`

**Remove bread.africa fields:**
```javascript
// DELETE from wallet object:
breadWalletId: String,
breadIdentityId: String
```

**Optional migration script:**
```javascript
// backend/scripts/removeBreadFields.js
// Remove bread fields from all users
await User.updateMany(
  {},
  {
    $unset: {
      'wallet.breadWalletId': '',
      'wallet.breadIdentityId': ''
    }
  }
);
```

### Phase 9: Remove bread.africa Files ⏰ 30 min

**Delete these files:**
1. `backend/src/config/bread.js`
2. `backend/src/services/breadService.js`
3. `backend/scripts/migrateToBread.js`
4. Remove bread.africa references from `backend/package.json`
5. Remove from `.env`:
   ```env
   BREAD_SERVICE_KEY=...
   BREAD_ACCOUNT_CODE=...
   BREAD_API_URL=...
   BREAD_WEBHOOK_URL=...
   BREAD_WEBHOOK_SECRET=...
   BREAD_FEE_WALLET_EVM=...
   BREAD_FEE_WALLET_SVM=...
   BREAD_SETTLEMENT_WALLET_EVM=...
   BREAD_SETTLEMENT_WALLET_SVM=...
   ```

### Phase 10: Testing ⏰ 2 hours

**Onramp testing:**
1. Test country selection (all 65 countries)
2. Test quote endpoint (multiple countries)
3. Test onramp execution (small amount)
4. Verify webhook handling
5. Confirm wallet credit

**Offramp testing:**
1. Test withdrawal to Nigeria (existing feature)
2. Test withdrawal to Kenya (M-Pesa)
3. Test withdrawal to USA
4. Verify dynamic forms work
5. Confirm webhook updates

**End-to-end testing:**
1. New user registration (no bread.africa initialization)
2. Fund wallet via Switch onramp
3. Make a booking (wallet deduction)
4. Withdraw via Switch offramp
5. Verify balance updates

### Phase 11: Documentation Update ⏰ 1 hour

**Update files:**
1. `backend/README.md` - Remove bread.africa references, add Switch
2. `backend/SWITCH_TEST_REPORT.md` - Add onramp test results
3. Create `backend/SWITCH_COMPLETE_GUIDE.md` - Full user guide

---

## 🔍 Key Decisions Needed

### 1. Onramp Flow Clarification
**Question:** How does Switch onramp work?
- Virtual accounts (like bread.africa)?
- Direct bank transfers?
- Payment links?
- Card payments?

**Action:** Research Switch onramp API first before implementation

### 2. Beneficiary Migration
**Question:** Should we migrate existing bread.africa beneficiaries to Switch format?
- bread.africa beneficiaries are Nigeria-only
- Switch supports multi-country beneficiaries

**Options:**
- A. Keep beneficiaries, add country field (default to 'NG')
- B. Clear all beneficiaries, let users re-add with country
- C. Auto-migrate with country='NG'

**Recommendation:** Option A - Add country='NG' to existing beneficiaries

### 3. Transaction History
**Question:** What about existing bread.africa transactions?
- Keep in database with provider='bread.africa'
- All new transactions use provider='switch'

**Recommendation:** Keep historical data for accounting

---

## 📊 Estimated Timeline

| Phase | Task | Time | Priority |
|-------|------|------|----------|
| 1 | Research Switch Onramp API | 30 min | HIGH |
| 2 | Complete Switch Service | 2 hrs | HIGH |
| 3 | Replace Controller Methods | 3 hrs | HIGH |
| 4 | Update Routes | 1 hr | HIGH |
| 5 | Update Webhooks | 2 hrs | HIGH |
| 6 | Update API Service | 1 hr | MEDIUM |
| 7 | Redesign Modals | 4 hrs | MEDIUM |
| 8 | Database Cleanup | 1 hr | LOW |
| 9 | Remove bread.africa Files | 30 min | LOW |
| 10 | Testing | 2 hrs | HIGH |
| 11 | Documentation | 1 hr | MEDIUM |

**Total:** ~18 hours of development time

**Critical Path:** Phases 1-5 (Backend) must be completed before Phases 6-7 (Frontend)

---

## 🚨 Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Switch onramp API different from bread.africa | High | Research API thoroughly first (Phase 1) |
| Users lose access during migration | High | Test thoroughly, deploy during low-traffic hours |
| Existing beneficiaries incompatible | Medium | Auto-migrate with country='NG' default |
| Webhook format changes | Medium | Implement robust error handling |
| Frontend breaks during transition | High | Test all user flows before deployment |

---

## ✅ Definition of Done

**Backend:**
- [ ] All bread.africa code removed
- [ ] Switch onramp fully implemented
- [ ] Switch offramp working for all 65 countries
- [ ] Webhooks handle both onramp and offramp
- [ ] All tests passing
- [ ] No bread.africa imports or references

**Frontend:**
- [ ] Fund modal uses Switch onramp
- [ ] Withdraw modal supports all 65 countries
- [ ] Country selector with search
- [ ] Dynamic forms work for all countries
- [ ] Real-time quotes working
- [ ] No errors in console

**Database:**
- [ ] bread.africa fields removed from User model
- [ ] Existing transactions preserved
- [ ] Beneficiaries migrated if needed

**Documentation:**
- [ ] README updated
- [ ] Test report complete
- [ ] User guide created

---

## 🎯 Success Metrics

1. **Coverage:** Support all 65 countries
2. **User Experience:**
   - Fund wallet: Max 5 clicks from start to payment instructions
   - Withdraw: Max 7 clicks from start to confirmation
3. **Performance:**
   - Quote retrieval: < 2 seconds
   - Transaction execution: < 5 seconds
4. **Reliability:**
   - 99.9% success rate on valid transactions
   - Webhook processing: < 30 seconds

---

## 📝 Open Questions (Need User Input)

1. **Onramp Priority:** Should we implement onramp first, or can we launch with offramp-only and add onramp later?
2. **Beneficiary Migration:** Keep existing beneficiaries with country='NG' or clear all?
3. **Testing Approach:** Test on production or create staging environment first?
4. **Deployment Strategy:** Big-bang migration or gradual rollout?

---

**Plan Status:** Ready for review and approval
**Next Step:** User approval → Begin Phase 1 (API Research)
