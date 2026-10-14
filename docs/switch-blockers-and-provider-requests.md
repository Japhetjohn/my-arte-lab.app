# MyArteLab × Switch: Integration Blockers & Provider Intervention Requests

This document outlines the provider-side restrictions identified during the comprehensive Phase 8 audit of the MyArteLab × Switch integration, along with the formal technical request to be submitted to Switch Developer Support (`support@onswitch.xyz` / Switch Developer Portal).

---

## 1. Executive Summary

MyArteLab has completed the full technical implementation of the Switch On-Ramp and Off-Ramp integration across backend services, webhook lifecycle handlers, atomic database ledger reservations, and user-facing frontend modals.

- **Nigeria (NGN)**: Fully verified and operational for both On-Ramp (Bank deposit) and Off-Ramp (Domestic payout with account name resolution).
- **On-Ramp Corridors**: Successfully verified across 14+ African countries via Mobile Money and Bank rails.
- **Off-Ramp Corridors (Non-NG)**: Blocked at the provider level with API error:
  `{"status":"failed","message":"Access key not enabled for REMITTANCE"}`

This restriction is caused by organization/key-level permissions on our Switch sandbox credential and cannot be resolved through client code modifications.

---

## 2. Sandbox Credential Profile

- **Base URL**: `https://api.onswitch.xyz`
- **Service Key**: `sandbox_m439oeh755pcp8nrvuzf7r3j3`
- **Platform Settlement Wallet**: `Gy2n4pZePk1vZyx76GtNERaLSgcoQYD2MnohMxFWbtCV` (Solana USDC)
- **Developer Fee Configuration**: `1%` via `developer_fee: 1` parameter

---

## 3. Formal Request to Switch Developer Support

### 3.1 Primary Request: Enable `REMITTANCE` Permission
Please activate the `REMITTANCE` feature flag / scope on our sandbox service key (`sandbox_m439oeh755pcp8nrvuzf7r3j3`) to enable payout testing for the following 18 cross-border African corridors:

| # | Country | Currency | Payout Rail | Switch Endpoint Tested | Provider Response |
|---|---|---|---|---|---|
| 1 | Ghana (GH) | GHS | `MOBILEMONEY`, `BANK` | `POST /offramp/quote`, `POST /offramp/initiate` | `Access key not enabled for REMITTANCE` |
| 2 | Kenya (KE) | KES | `MOBILEMONEY`, `BANK` | `POST /offramp/quote`, `POST /offramp/initiate` | `Access key not enabled for REMITTANCE` |
| 3 | DR Congo (CD) | CDF | `MOBILEMONEY` | `POST /offramp/quote`, `POST /offramp/initiate` | `Access key not enabled for REMITTANCE` |
| 4 | Cameroon (CM) | XAF | `MOBILEMONEY` | `POST /offramp/quote`, `POST /offramp/initiate` | `Access key not enabled for REMITTANCE` |
| 5 | Benin (BJ) | XOF | `MOBILEMONEY` | `POST /offramp/quote`, `POST /offramp/initiate` | `Access key not enabled for REMITTANCE` |
| 6 | Gambia (GM) | GMD | `MOBILEMONEY` | `POST /offramp/quote`, `POST /offramp/initiate` | `Access key not enabled for REMITTANCE` |
| 7 | Rwanda (RW) | RWF | `MOBILEMONEY` | `POST /offramp/quote`, `POST /offramp/initiate` | `Access key not enabled for REMITTANCE` |
| 8 | Sierra Leone (SL) | SLE | `MOBILEMONEY` | `POST /offramp/quote`, `POST /offramp/initiate` | `Access key not enabled for REMITTANCE` |
| 9 | Tanzania (TZ) | TZS | `MOBILEMONEY` | `POST /offramp/quote`, `POST /offramp/initiate` | `Access key not enabled for REMITTANCE` |
| 10 | Uganda (UG) | UGX | `MOBILEMONEY` | `POST /offramp/quote`, `POST /offramp/initiate` | `Access key not enabled for REMITTANCE` |
| 11 | Zambia (ZM) | ZMW | `MOBILEMONEY` | `POST /offramp/quote`, `POST /offramp/initiate` | `Access key not enabled for REMITTANCE` |
| 12 | Liberia (LR) | LRD | `MOBILEMONEY` | `POST /offramp/quote`, `POST /offramp/initiate` | `Access key not enabled for REMITTANCE` |
| 13 | Ethiopia (ET) | ETB | `BANK` | `POST /offramp/quote`, `POST /offramp/initiate` | `Access key not enabled for REMITTANCE` |
| 14 | Guinea (GN) | GNF | `MOBILEMONEY` | `POST /offramp/quote`, `POST /offramp/initiate` | `Access key not enabled for REMITTANCE` |
| 15 | South Africa (ZA) | ZAR | `BANK` | `POST /offramp/quote`, `POST /offramp/initiate` | `Access key not enabled for REMITTANCE` |
| 16 | Malawi (MW) | MWK | `MOBILEMONEY`, `BANK` | `POST /offramp/quote`, `POST /offramp/initiate` | `Access key not enabled for REMITTANCE` |
| 17 | Côte d'Ivoire (CI) | XOF | `MOBILEMONEY` | `POST /offramp/quote`, `POST /offramp/initiate` | `Access key not enabled for REMITTANCE` |
| 18 | Senegal (SN) | XOF | `MOBILEMONEY` | `POST /offramp/quote`, `POST /offramp/initiate` | `Access key not enabled for REMITTANCE` |

---

### 3.2 Secondary Clarifications Requested

1. **Morocco (MAD)**:
   - Current API response: `No undefined coverage for MA`.
   - Request: What is the expected rollout timeline for Moroccan Dirham (MAD) support?

2. **Egypt (EGP) & Botswana (BWP) Off-Ramp**:
   - Current API response: On-ramp quotes succeed via `MOBILEMONEY`, but off-ramp coverage is unavailable.
   - Request: Will off-ramp payouts (e.g. Vodafone Cash for Egypt, Orange Money for Botswana) become available in sandbox/production?

3. **On-Ramp Coverage for ETB, GNF, ZAR, MWK**:
   - Current API response: Off-ramp coverage exists (pending remittance permission), but `POST /onramp/quote` returns `No onramp rate found`.
   - Request: Are on-ramp deposit rails supported for these 4 currencies, and what are the required channels or partner integrations?

---

## 4. Retest & Verification Plan

As soon as Switch confirms activation of the `REMITTANCE` module:

1. Execute automated regression suite:
   ```bash
   node backend/scripts/test-phase8-financial-acceptance.js
   ```
2. Verify live off-ramp quote generation for all 18 corridors.
3. Test institution/beneficiary lookup for mobile money providers across GH, KE, UG, RW, and TZ.
4. Execute simulated off-ramp payout initiation and confirm webhook status transitions (`COMPLETED`, `FAILED`, `REVERSED`).
5. Update `docs/switch-country-currency-matrix.md` with verified status transitions from `BLOCKED_PROVIDER` to `PASS`.
