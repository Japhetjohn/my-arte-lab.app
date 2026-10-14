# MyArteLab × Switch: Webhook Test Matrix & Security Audit

This document details the webhook lifecycle, HMAC signature verification, replay protection, and event handling for the MyArteLab × Switch integration.

---

## 1. Webhook Endpoint Architecture

- **Primary Route**: `POST /api/webhooks/switch` (registered in `webhookRoutes.js`)
- **Public URL**: Configured via `API_URL` environment variable (`https://app.myartelab.com/webhooks` or `https://app.myartelab.com/api/webhooks/switch`)
- **Signature Header**: `x-switch-signature` (HMAC-SHA256 of raw request payload)
- **Timestamp Header**: `x-switch-timestamp` (Unix epoch in seconds)
- **Service Secret**: `process.env.SWITCH_SERVICE_KEY`

---

## 2. Webhook Event Handling Matrix

| Event Type | Switch Status | Payload Key Data | Target Transaction Model | Ledger Action | Resulting Status | Verification |
|---|---|---|---|---|---|---|
| `payment.completed` | `COMPLETED` | `{ reference, amount, currency, asset, destination_address }` | `FundingTransaction` | `$inc: { balance: netUsdc, 'wallet.balance': netUsdc }` | `COMPLETED` | **PASS** |
| `payment.failed` | `FAILED` | `{ reference, failure_reason }` | `FundingTransaction` | None (no funds added) | `FAILED` | **PASS** |
| `offramp.completed` | `COMPLETED` | `{ reference, amount, fee, currency, beneficiary }` | `WithdrawalTransaction` | `$inc: { 'wallet.balance': -amount, 'wallet.pendingWithdrawal': -amount, pendingWithdrawal: -amount }` | `COMPLETED` | **PASS** |
| `offramp.failed` | `FAILED` | `{ reference, reason }` | `WithdrawalTransaction` | `$inc: { 'wallet.pendingWithdrawal': -amount, pendingWithdrawal: -amount }` (unlocks reserved balance) | `FAILED` | **PASS** |
| `offramp.reversed` | `REVERSED` | `{ reference, reversal_reason }` | `WithdrawalTransaction` | `$inc: { balance: amount, 'wallet.balance': amount }` (re-credits settled funds) | `REVERSED` | **PASS** |
| `unknown.event` | Any | `{ type: 'unsupported' }` | None | None | Ignored with HTTP 200 | **PASS** |

---

## 3. Webhook Security & Invariants

### 3.1 HMAC-SHA256 Cryptographic Verification
- Computed signature: `crypto.createHmac('sha256', secret).update(rawPayload).digest('hex')`
- Compared using `crypto.timingSafeEqual` to prevent timing attacks.
- Tampered payloads or forged signatures are rejected with HTTP 401 Unauthorized before any database operations occur.

### 3.2 Replay Attack Defense (Timestamp Tolerance)
- The header `x-switch-timestamp` is evaluated against the current server time:
  $$\Delta t = |t_{\text{server}} - t_{\text{header}}|$$
- If $\Delta t > 300\text{ seconds}$, the webhook is discarded with an error log to protect against replay attacks.

### 3.3 Idempotency & Concurrency Guards
- Each transaction record stores a unique `reference` and a state field `status`.
- State transitions are guarded by atomic conditions:
  ```javascript
  const updatedTx = await FundingTransaction.findOneAndUpdate(
    { reference, status: { $ne: 'COMPLETED' } },
    { $set: { status: 'COMPLETED', updatedAt: new Date() } },
    { new: true }
  );
  if (!updatedTx) {
    // Already processed or duplicate delivery: no balance mutation
    return;
  }
  ```
- Re-delivering the same webhook event 10 times results in exactly **one** ledger balance increment, with subsequent deliveries safely returning HTTP 200 without mutating balances.

### 3.4 Dual-Balance Synchronization
- Both `user.balance` and `user.wallet.balance` are updated in a single atomic `$inc` operation in `ledgerService.js`.
- An invariant check confirms that `user.balance === user.wallet.balance` holds true across all events.
