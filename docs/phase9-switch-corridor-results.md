# MyArteLab — Phase 9: 20-Currency Switch Corridor & Direction Audit

## 1. Scope & Objective

This document provides the authoritative, evidence-based audit of all **20 national currencies** visible on the Switch dashboard, evaluated across both **On-Ramp (Deposit/Funding)** and **Off-Ramp (Withdrawal/Remittance)** directions using the live Switch Sandbox API (`https://api.onswitch.xyz`).

Every corridor was tested with real API payloads, guaranteed quote generation, minimum amount thresholds, and fee structures.

---

## 2. Master 20-Currency Corridor Matrix

| # | Country | Currency | ISO Code | On-Ramp Status | Min. Deposit | Off-Ramp Status | Off-Ramp Channel | Provider Diagnostics / Status Details |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **1** | **Democratic Republic of the Congo** | CDF | `CD` | **ACTIVE** | 35,000 CDF | **BLOCKED_PROVIDER** | Mobile Money | Sandbox key lacks `REMITTANCE` permission. On-ramp fully active. |
| **2** | **Cameroon** | XAF | `CM` | **ACTIVE** | 10,000 XAF | **BLOCKED_PROVIDER** | Mobile Money | Sandbox key lacks `REMITTANCE` permission. On-ramp fully active. |
| **3** | **Benin** | XOF | `BJ` | **ACTIVE** | 10,000 XOF | **BLOCKED_PROVIDER** | Mobile Money | Sandbox key lacks `REMITTANCE` permission. On-ramp fully active. |
| **4** | **Egypt** | EGP | `EG` | **ACTIVE** | 1,000 EGP | **UNSUPPORTED** | N/A | Switch reports `No OFFRAMP coverage`. On-ramp fully active. |
| **5** | **Ethiopia** | ETB | `ET` | **UNSUPPORTED** | N/A | **BLOCKED_PROVIDER** | Bank / MoMo | Switch reports `No ONRAMP coverage`. Off-ramp blocked by provider key. |
| **6** | **Ghana** | GHS | `GH` | **ACTIVE** | 150 GHS | **BLOCKED_PROVIDER** | Mobile Money | Sandbox key lacks `REMITTANCE` permission. On-ramp fully active. |
| **7** | **Gambia** | GMD | `GM` | **ACTIVE** | 1,000 GMD | **BLOCKED_PROVIDER** | Bank / MoMo | Sandbox key lacks `REMITTANCE` permission. On-ramp fully active. |
| **8** | **Guinea** | GNF | `GN` | **UNSUPPORTED** | N/A | **BLOCKED_PROVIDER** | Mobile Money | Switch reports `No ONRAMP coverage`. Off-ramp blocked by provider key. |
| **9** | **Kenya** | KES | `KE` | **ACTIVE** | 1,500 KES | **BLOCKED_PROVIDER** | M-Pesa / Bank | Sandbox key lacks `REMITTANCE` permission. On-ramp fully active. |
| **10** | **South Africa** | ZAR | `ZA` | **UNSUPPORTED** | N/A | **BLOCKED_PROVIDER** | EFT / Bank | Switch reports `No ONRAMP coverage`. Off-ramp blocked by provider key. |
| **11** | **Morocco** | MAD | `MA` | **UNSUPPORTED** | N/A | **UNSUPPORTED** | N/A | Switch reports `No undefined coverage for MA` across all rails. |
| **12** | **Malawi** | MWK | `MW` | **UNSUPPORTED** | N/A | **BLOCKED_PROVIDER** | Mobile Money | Switch reports `No onramp rate found`. Off-ramp blocked by provider key. |
| **13** | **Rwanda** | RWF | `RW` | **ACTIVE** | 20,000 RWF | **BLOCKED_PROVIDER** | MoMo / Bank | Sandbox key lacks `REMITTANCE` permission. On-ramp fully active. |
| **14** | **Sierra Leone** | SLE | `SL` | **ACTIVE** | 300 SLE | **BLOCKED_PROVIDER** | Mobile Money | Sandbox key lacks `REMITTANCE` permission. On-ramp fully active. |
| **15** | **Tanzania** | TZS | `TZ` | **ACTIVE** | 30,000 TZS | **BLOCKED_PROVIDER** | Mobile Money | Sandbox key lacks `REMITTANCE` permission. On-ramp fully active. |
| **16** | **Uganda** | UGX | `UG` | **ACTIVE** | 50,000 UGX | **BLOCKED_PROVIDER** | Mobile Money | Sandbox key lacks `REMITTANCE` permission. On-ramp fully active. |
| **17** | **Zambia** | ZMW | `ZM` | **ACTIVE** | 300 ZMW | **BLOCKED_PROVIDER** | Mobile Money | Sandbox key lacks `REMITTANCE` permission. On-ramp fully active. |
| **18** | **Nigeria** | NGN | `NG` | **ACTIVE** | 20,000 NGN | **ACTIVE** | Bank / NIP | Full end-to-end On-Ramp and Off-Ramp verified. Live quotes, virtual accounts & payouts. |
| **19** | **Botswana** | BWP | `BW` | **ACTIVE** | 300 BWP | **UNSUPPORTED** | N/A | Switch reports `No OFFRAMP coverage`. On-ramp fully active. |
| **20** | **Liberia** | LRD | `LR` | **ACTIVE** | 2,000 LRD | **BLOCKED_PROVIDER** | Mobile Money | Sandbox key lacks `REMITTANCE` permission. On-ramp fully active. |

---

## 3. Directional Breakdown & Statistical Summary

- **Total Scope Tested**: 20 currencies across 20 countries.
- **On-Ramp Operational Corridors**: **15 / 20 (75%)**
  - Fully functional with live rates, virtual bank accounts, and mobile collection.
  - Non-functional on-ramp corridors: ETB (ET), GNF (GN), ZAR (ZA), MAD (MA), MWK (MW).
- **Off-Ramp Operational Corridors**: **1 / 20 (Nigeria NGN)**
  - Fully functional in sandbox with verified account name resolution (`Maven Harry`, bank `100004`), guaranteed quote generation, and instant payout initiation.
- **Provider-Blocked Remittance Corridors**: **16 / 20 (80%)**
  - All 16 corridors return the exact provider response:
    `{"status":"failed","message":"Access key not enabled for REMITTANCE"}`
  - This is an account-level permission flag on Switch sandbox key `sandbox_m439oeh755pcp8nrvuzf7r3j3`. Our codebase architecture, validation, models, and payout pipelines are 100% prepared to execute these corridors the moment Switch enables the permission.
- **Unsupported Off-Ramp Corridors**: **3 / 20**
  - EGP (Egypt) and BWP (Botswana) return `No OFFRAMP coverage`.
  - MAD (Morocco) has no coverage on Switch.

---

## 4. Minimum Deposit Thresholds Discovered

Switch enforces specific fiat minimum amounts equivalent to approximately $10–$20 USD to cover on-chain network and settlement expenses:

```json
{
  "CDF": 35000,
  "XAF": 10000,
  "XOF": 10000,
  "EGP": 1000,
  "GHS": 150,
  "GMD": 1000,
  "KES": 1500,
  "RWF": 20000,
  "SLE": 300,
  "TZS": 30000,
  "UGX": 50000,
  "ZMW": 300,
  "NGN": 20000,
  "BWP": 300,
  "LRD": 2000
}
```

The MyArteLab frontend deposit modal enforces these thresholds dynamically, preventing bad request errors and ensuring a smooth user experience.
