# MyArteLab × Switch: User Wallet Initialization & Security Audit

This document details the lifecycle, security safeguards, and idempotency guarantees for non-custodial user wallet creation via the Switch integration.

---

## 1. Wallet Lifecycle Architecture

```mermaid
flowchart TD
    UserSignup["1. User Signup / First Access"] --> CheckExisting["2. Check Existing SwitchWallet by userId"]
    CheckExisting -->|Wallet Exists| ReturnPublic["3. Return Public Wallet (Solana Address)"]
    CheckExisting -->|No Wallet| CallSwitch["4. Call Switch POST /wallet"]
    CallSwitch --> ReceiveKey["5. Switch Returns Solana Address & Private Key"]
    ReceiveKey --> EncryptKey["6. AES-256-GCM Encrypt Private Key"]
    EncryptKey --> SaveDB["7. Save SwitchWallet (Unique user index)"]
    SaveDB --> StripKey["8. Strip Private Key from Public Response"]
    StripKey --> LinkUser["9. Link solanaAddress to user.wallet"]
    LinkUser --> Ready["10. Wallet Ready for On-Ramp & Off-Ramp"]
```

---

## 2. Cryptographic Security & Private Key Protection

1. **Zero Client Exposure**:
   - The private key returned by Switch during wallet generation is never transmitted to the frontend client.
   - The `SwitchWallet` schema explicitly configures `select: false` on `encryptedPrivateKey`, and a custom `toJSON` transformer deletes `encryptedPrivateKey` before any JSON serialization.

2. **AES-256-GCM Encryption at Rest**:
   - The private key is encrypted immediately using `walletEncryption.encryptPrivateKey()` with the secret `WALLET_ENCRYPTION_KEY`.
   - The initialization vector (IV) and authentication tag are stored alongside the ciphertext, preventing tampering or unauthorized extraction.

3. **Settlement Asset Binding (`solana:usdc`)**:
   - Every generated wallet is bound to Solana USDC.
   - The Solana public address (`solanaAddress`) is stored on both `SwitchWallet` and `user.wallet.solanaAddress`, enabling on-chain deposit attribution and payout routing.

---

## 3. Idempotency & Concurrency Defenses

1. **Unique Index Constraint**:
   - The MongoDB schema enforces `{ user: 1 }` and `{ switchWalletId: 1 }` as unique indexes.
2. **Concurrent Request Handling**:
   - If two parallel requests attempt to create a wallet for the same user simultaneously, the first write succeeds while the second triggers an `E11000` duplicate key exception.
   - The service catches `E11000` and immediately retrieves the existing wallet record:
     ```javascript
     try {
       walletRecord = await SwitchWallet.create({ ... });
     } catch (dbErr) {
       if (dbErr.code === 11000) {
         walletRecord = await SwitchWallet.findOne({ user: userId });
       } else {
         throw dbErr;
       }
     }
     ```
   - This guarantees that exactly one wallet is provisioned per user, eliminating orphan wallets or balance fragmentation.

---

## 4. Test Verification & Acceptance Results

| Test Case | Scenario | Expected Outcome | Actual Result | Status |
|---|---|---|---|---|
| **7.1** | New user wallet provisioning | Generates valid Solana address | `Gy2n4pZePk1vZyx76GtNERaLSgcoQYD2MnohMxFWbtCV` | **PASS** |
| **7.2** | Key privacy verification | `private_key` undefined in public payload | `undefined` (Key strictly hidden) | **PASS** |
| **7.3** | Repeated retrieval idempotency | Returns identical `switchWalletId` | Returned exact same ID on repeat call | **PASS** |
| **7.4** | Solana address stability | Returns identical `solanaAddress` | Returned exact same Solana address | **PASS** |
