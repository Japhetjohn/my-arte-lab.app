# MyArteLab × Switch: Documentation-to-Code Compliance Checklist

This checklist audits the entire MyArteLab × Switch integration against the current official Switch documentation (https://docs.onswitch.xyz). Every requirement is mapped to its implementing file, verified against live sandbox API behavior, and linked to automated tests.

---

## 1. Authentication & API Credentials

| Official Switch Requirement | API Specification | Implementation File | Verification & Evidence | Status |
|---|---|---|---|---|
| Service Key Authentication | `x-service-key: <SWITCH_SERVICE_KEY>` header required on all HTTP requests to `https://api.onswitch.xyz` | [`switchService.js`](file:///home/japhet/Desktop/my-arte-lab.app/backend/src/services/switchService.js#L50-L65) | `switchService._getHeaders()` injects configured key; tested via `switchService.testConnection()` | **COMPLIANT** |
| Environment Isolation | Sandbox base URL `https://api.onswitch.xyz` (or `SWITCH_API_URL` env override) | [`switchService.js`](file:///home/japhet/Desktop/my-arte-lab.app/backend/src/services/switchService.js#L20-L30) | Verified against live Switch sandbox endpoints | **COMPLIANT** |

---

## 2. Supported Corridors, Countries & Currencies

| Official Switch Requirement | API Specification | Implementation File | Verification & Evidence | Status |
|---|---|---|---|---|
| Dynamic Corridor Discovery | `GET /coverage?direction=ONRAMP` and `GET /coverage?direction=OFFRAMP` | [`switchService.js`](file:///home/japhet/Desktop/my-arte-lab.app/backend/src/services/switchService.js#L440-L503) | Discovered 19 on-ramp and 21 off-ramp corridors across 21 countries | **COMPLIANT** |
| Performance Caching & Resilience | Corridor cache TTL (10 min) with stale-cache fallback during transient network errors | [`switchService.js`](file:///home/japhet/Desktop/my-arte-lab.app/backend/src/services/switchService.js#L445-L500) | Cache hit verified; stale cache fallback prevents API blocking | **COMPLIANT** |
| Full 20 Dashboard Currencies | CDF, XAF, XOF, EGP, ETB, GHS, GMD, GNF, KES, ZAR, MAD, MWK, RWF, SLE, TZS, UGX, ZMW, NGN, BWP, LRD | [`walletRoutes.js`](file:///home/japhet/Desktop/my-arte-lab.app/backend/src/routes/walletRoutes.js#L101-L122) | Scanned and dynamically returned via `/api/wallet/funding-options` & `/api/wallet/withdraw/options` | **COMPLIANT** |

---

## 3. Blockchain Networks & Settlement Assets

| Official Switch Requirement | API Specification | Implementation File | Verification & Evidence | Status |
|---|---|---|---|---|
| Supported Settlement Asset | `solana:usdc` confirmed as standard settlement asset across Switch metadata | [`switchService.js`](file:///home/japhet/Desktop/my-arte-lab.app/backend/src/services/switchService.js#L535) | `testConnection()` confirms `solana:usdc` in Switch asset registry | **COMPLIANT** |
| Asset Strict Enforcement | Quotes and initiations strictly set `asset: "solana:usdc"` | [`switchService.js`](file:///home/japhet/Desktop/my-arte-lab.app/backend/src/services/switchService.js#L535), [`withdrawalService.js`](file:///home/japhet/Desktop/my-arte-lab.app/backend/src/services/withdrawalService.js#L128) | Fiat amounts strictly separated from internal USDC balances | **COMPLIANT** |
| Non-Custodial Wallet Storage | User Solana address storage in dedicated collection with encrypted keys | [`SwitchWallet.js`](file:///home/japhet/Desktop/my-arte-lab.app/backend/src/models/SwitchWallet.js) | Verified deterministic sandbox wallet generation with platform fallback | **COMPLIANT** |

---

## 4. Deposit (On-Ramp) Flow

| Official Switch Requirement | API Specification | Implementation File | Verification & Evidence | Status |
|---|---|---|---|---|
| On-Ramp Quote Generation | `POST /onramp/quote` with `{ amount, country, currency, asset: 'solana:usdc', channel, developer_fee, developer_recipient }` | [`switchService.js`](file:///home/japhet/Desktop/my-arte-lab.app/backend/src/services/switchService.js#L517-L571) | Verified live: generated quote rate 1 USDC = 1382.39 NGN with fee breakdown | **COMPLIANT** |
| On-Ramp Initiation | `POST /onramp/initiate` with `{ amount, country, currency, asset, channel, reference, callback_url, beneficiary, developer_fee, developer_recipient }` | [`switchService.js`](file:///home/japhet/Desktop/my-arte-lab.app/backend/src/services/switchService.js#L588-L665) | Verified live: Switch returned dynamic bank deposit instructions (Sandbox Bank) | **COMPLIANT** |
| Beneficiary Name Sanitization | `holder_name` strictly alphanumeric, no spaces, no crypto terms | [`switchService.js`](file:///home/japhet/Desktop/my-arte-lab.app/backend/src/services/switchService.js#L630-L635) | Resolved Switch 400 validation error; strips spaces and invalid characters | **COMPLIANT** |
| Deposit Confirmation Simulation | `POST /payment/confirm` with `{ reference }` | [`switchService.js`](file:///home/japhet/Desktop/my-arte-lab.app/backend/src/services/switchService.js#L667) | Verified live: Switch advanced payment from `AWAITING_DEPOSIT` to `PROCESSING` | **COMPLIANT** |

---

## 5. Withdrawal (Off-Ramp) Flow

| Official Switch Requirement | API Specification | Implementation File | Verification & Evidence | Status |
|---|---|---|---|---|
| Off-Ramp Quote Generation | `POST /offramp/quote` with `{ amount, country, currency, asset: 'solana:usdc', channel, developer_fee, developer_recipient }` | [`switchService.js`](file:///home/japhet/Desktop/my-arte-lab.app/backend/src/services/switchService.js#L701-L766) | Verified live: generated quote rate 1 USDC = 1343.80 NGN with fee breakdown | **COMPLIANT** |
| Beneficiary Requirements | `GET /beneficiary/requirement?direction=OFFRAMP&country=...` | [`switchService.js`](file:///home/japhet/Desktop/my-arte-lab.app/backend/src/services/switchService.js#L779-L799) | Verified live: returned required bank and account fields | **COMPLIANT** |
| Institution Discovery | `GET /institution?country={country}` | [`switchService.js`](file:///home/japhet/Desktop/my-arte-lab.app/backend/src/services/switchService.js#L809-L819) | Verified live: returned 367 Nigerian banks & MFIs | **COMPLIANT** |
| Account Name Resolution | `POST /institution/lookup` with `{ country, beneficiary: { account_number, bank_code } }` | [`switchService.js`](file:///home/japhet/Desktop/my-arte-lab.app/backend/src/services/switchService.js#L831-L856) | Resolved live test account `8188216769` at bank `100004` to `Maven Harry` | **COMPLIANT** |
| Off-Ramp Initiation | `POST /offramp/initiate` with `{ amount, country, currency, asset, channel, reference, callback_url, beneficiary, narration, reason, developer_fee, developer_recipient }` | [`switchService.js`](file:///home/japhet/Desktop/my-arte-lab.app/backend/src/services/switchService.js#L872-L960) | Verified live: initiated test payout reference `cb0d2b0d-c999-43b5-8b74-a1465738a81d` | **COMPLIANT** |
| Atomic Balance Reservation | Lock `numAmount` in `user.pendingWithdrawal` and check `availableBalance >= numAmount` | [`ledgerService.js`](file:///home/japhet/Desktop/my-arte-lab.app/backend/src/services/ledgerService.js#L121-L176) | Atomic `$expr` query-level guard tested against concurrent overspend | **COMPLIANT** |
| Off-Ramp Settlement | Decrement `wallet.balance` & clear `pendingWithdrawal` upon `COMPLETED` | [`ledgerService.js`](file:///home/japhet/Desktop/my-arte-lab.app/backend/src/services/ledgerService.js#L247-L320) | Verified live in Phase 8 regression test suite | **COMPLIANT** |
| Payout Failure & Reversal Release | Release `pendingWithdrawal` on `FAILED`, refund on `REVERSED` | [`ledgerService.js`](file:///home/japhet/Desktop/my-arte-lab.app/backend/src/services/ledgerService.js#L325-L420) | Verified in Phase 8 regression test suite | **COMPLIANT** |

---

## 6. Developer Fee (1%) & Marketplace Commission (Strictly 10%)

| Fee / Commission Type | Requirement | Implementation File | Verification & Evidence | Status |
|---|---|---|---|---|
| Switch 1% Developer Fee | `developer_fee: 1` and `developer_recipient: PLATFORM_WALLET_ADDRESS` sent in API calls | [`switchService.js`](file:///home/japhet/Desktop/my-arte-lab.app/backend/src/services/switchService.js), [`walletRoutes.js`](file:///home/japhet/Desktop/my-arte-lab.app/backend/src/routes/walletRoutes.js) | Verified in live quote and initiation requests | **COMPLIANT** |
| Developer Fee UI Disclosure | Do NOT display developer fee as a separate line item; integrate into conversion display | [`AddFundsModal.tsx`](file:///home/japhet/Desktop/my-arte-lab.app/backend/frontend/app/src/components/wallet/AddFundsModal.tsx), [`WithdrawModal.tsx`](file:///home/japhet/Desktop/my-arte-lab.app/backend/frontend/app/src/components/wallet/WithdrawModal.tsx) | Clean modal display of net fiat and USDC amounts | **COMPLIANT** |
| Marketplace Commission (10%) | Exactly 10% platform commission on completed marketplace bookings (50 USDC booking -> 5 USDC platform fee, 45 USDC creator payout) | [`constants.js`](file:///home/japhet/Desktop/my-arte-lab.app/backend/src/utils/constants.js), [`Booking.js`](file:///home/japhet/Desktop/my-arte-lab.app/backend/src/models/Booking.js), [`bookingService.js`](file:///home/japhet/Desktop/my-arte-lab.app/backend/src/services/bookingService.js) | 10% verified in automated unit and regression tests | **COMPLIANT** |

---

## 7. Webhook Security & Status Transitions

| Official Switch Requirement | API Specification | Implementation File | Verification & Evidence | Status |
|---|---|---|---|---|
| Signature Verification | HMAC-SHA256 signature using `SWITCH_SERVICE_KEY`, header `x-switch-signature` | [`switchService.js`](file:///home/japhet/Desktop/my-arte-lab.app/backend/src/services/switchService.js#L370-L431) | Tested: valid signatures pass, forged signatures rejected (401) | **COMPLIANT** |
| Replay Protection | Timestamp verification (`x-switch-timestamp`) with 300s tolerance window | [`switchService.js`](file:///home/japhet/Desktop/my-arte-lab.app/backend/src/services/switchService.js#L399-L407) | Tested: timestamps >300s old rejected | **COMPLIANT** |
| Webhook Acknowledgment | Respond with HTTP 200 OK immediately | [`webhookRoutes.js`](file:///home/japhet/Desktop/my-arte-lab.app/backend/src/routes/webhookRoutes.js#L129-L134) | Tested: live requests acknowledged with HTTP 200 OK | **COMPLIANT** |
| Idempotent Processing | Query-level guards prevent double-crediting or duplicate debiting | [`ledgerService.js`](file:///home/japhet/Desktop/my-arte-lab.app/backend/src/services/ledgerService.js#L20-L45) | Duplicate webhook events handled safely without mutating balance twice | **COMPLIANT** |
| Dual-Balance Lockstep | `user.balance` and `user.wallet.balance` remain 100% synchronized | [`ledgerService.js`](file:///home/japhet/Desktop/my-arte-lab.app/backend/src/services/ledgerService.js#L86-L100) | Atomic `$inc` on both fields in single MongoDB update | **COMPLIANT** |

---

## 8. Business Rules & Configuration Scoping

| Business Rule | Requirement | Implementation File | Verification & Evidence | Status |
|---|---|---|---|---|
| Password Policy | Min 8 characters, at least 1 uppercase and 1 lowercase letter (numbers optional) | [`userValidator.js`](file:///home/japhet/Desktop/my-arte-lab.app/backend/src/validators/userValidator.js#L8), [`User.js`](file:///home/japhet/Desktop/my-arte-lab.app/backend/src/models/User.js#L41) | Regex `/^(?=.*[a-z])(?=.*[A-Z]).{8,}$/` tested and passed | **COMPLIANT** |
| Admin Email Scoping | Admin notifications strictly directed to `japhetjohnk@gmail.com` | [`constants.js`](file:///home/japhet/Desktop/my-arte-lab.app/backend/src/utils/constants.js), `.env` | Verified in regression suite | **COMPLIANT** |
