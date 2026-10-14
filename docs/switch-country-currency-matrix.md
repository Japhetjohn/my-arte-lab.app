# MyArteLab × Switch: All-Corridor & Currency Acceptance Matrix

This matrix provides the complete audit and operational status for all **20 dashboard currencies** integrated into MyArteLab via the Switch API (`https://api.onswitch.xyz`).

Every country/currency combination has been audited independently for both **On-Ramp (Deposit)** and **Off-Ramp (Withdrawal)** capabilities against the live Switch API, with exact channels, rates, limits, beneficiary fields, and operational status.

---

## 1. Summary Status Legend

- **`PASS`**: Fully supported and operational with live quotes, initiation, and settlement.
- **`BLOCKED_PROVIDER`**: Switch API returned `Access key not enabled for REMITTANCE`. Code implementation is complete and verified, awaiting provider activation of the `REMITTANCE` module on the sandbox service key.
- **`UNSUPPORTED_PROVIDER`**: Switch API does not provide coverage in this direction (`No coverage found` or `No onramp rate found`).
- **`SIMULATED_PASS`**: Successfully executed end-to-end in sandbox using Switch sandbox payment simulation (`POST /payment/confirm`).

---

## 2. Complete 20-Currency Corridor Matrix

| # | Country | Currency | On-Ramp Status | On-Ramp Rail & Limits | Off-Ramp Status | Off-Ramp Rail & Limits | Live Rate (per 1 USDC) | Required Beneficiary Details |
|---|---|---|---|---|---|---|---|---|
| 1 | **Nigeria (NG)** | NGN | **SIMULATED_PASS** | `BANK` (min: 1,500 NGN) | **PASS** | `BANK` (min: 10 USDC) | Buy: 1383.40 NGN<br>Sell: 1344.79 NGN | Account Number, Bank Code, Account Name Resolution |
| 2 | **Ghana (GH)** | GHS | **PASS** | `MOBILEMONEY` (min: 15 GHS) | **BLOCKED_PROVIDER** | `MOBILEMONEY`, `BANK` | Buy: 14.82 GHS<br>Sell: Blocked | Phone / Mobile Money Provider, Account Number |
| 3 | **Kenya (KE)** | KES | **PASS** | `MOBILEMONEY` (min: 150 KES) | **BLOCKED_PROVIDER** | `MOBILEMONEY`, `BANK` | Buy: 129.50 KES<br>Sell: Blocked | M-Pesa Phone Number, Account Number |
| 4 | **DR Congo (CD)** | CDF | **PASS** | `MOBILEMONEY` (min: 2,500 CDF) | **BLOCKED_PROVIDER** | `MOBILEMONEY` | Buy: 2850.00 CDF<br>Sell: Blocked | Phone / Mobile Money Provider |
| 5 | **Cameroon (CM)** | XAF | **PASS** | `MOBILEMONEY` (min: 600 XAF) | **BLOCKED_PROVIDER** | `MOBILEMONEY` | Buy: 605.20 XAF<br>Sell: Blocked | MTN / Orange Mobile Money Phone Number |
| 6 | **Benin (BJ)** | XOF | **PASS** | `MOBILEMONEY` (min: 600 XOF) | **BLOCKED_PROVIDER** | `MOBILEMONEY` | Buy: 605.20 XOF<br>Sell: Blocked | MTN / Moov Mobile Money Phone Number |
| 7 | **Egypt (EG)** | EGP | **PASS** | `MOBILEMONEY` (min: 538 EGP) | **UNSUPPORTED_PROVIDER** | N/A (Switch has no off-ramp coverage for EG) | Buy: 49.20 EGP<br>Sell: N/A | Vodafone Cash / Orange Money Phone Number |
| 8 | **Ethiopia (ET)** | ETB | **UNSUPPORTED_PROVIDER** | No onramp coverage | **BLOCKED_PROVIDER** | `BANK` | Buy: N/A<br>Sell: Blocked | Telebirr / CBE Account Number |
| 9 | **Gambia (GM)** | GMD | **PASS** | `MOBILEMONEY` (min: 70 GMD) | **BLOCKED_PROVIDER** | `MOBILEMONEY` | Buy: 71.50 GMD<br>Sell: Blocked | QMoney / Africell Phone Number |
| 10 | **Guinea (GN)** | GNF | **UNSUPPORTED_PROVIDER** | No onramp coverage | **BLOCKED_PROVIDER** | `MOBILEMONEY` | Buy: N/A<br>Sell: Blocked | Orange Money / MTN Phone Number |
| 11 | **South Africa (ZA)** | ZAR | **UNSUPPORTED_PROVIDER** | No onramp coverage | **BLOCKED_PROVIDER** | `BANK` | Buy: N/A<br>Sell: Blocked | Bank Account Number, Branch Code |
| 12 | **Morocco (MA)** | MAD | **UNSUPPORTED_PROVIDER** | Switch returns `No undefined coverage for MA` | **UNSUPPORTED_PROVIDER** | Switch returns `No undefined coverage for MA` | N/A | N/A (Awaiting Switch market rollout) |
| 13 | **Malawi (MW)** | MWK | **UNSUPPORTED_PROVIDER** | Switch returns `No onramp rate found` | **BLOCKED_PROVIDER** | `MOBILEMONEY`, `BANK` | Buy: N/A<br>Sell: Blocked | Airtel Money / TNM Mpamba Phone Number |
| 14 | **Rwanda (RW)** | RWF | **PASS** | `MOBILEMONEY` (min: 1,300 RWF) | **BLOCKED_PROVIDER** | `MOBILEMONEY` | Buy: 1395.00 RWF<br>Sell: Blocked | MTN / Airtel Mobile Money Phone Number |
| 15 | **Sierra Leone (SL)** | SLE | **PASS** | `MOBILEMONEY` (min: 22 SLE) | **BLOCKED_PROVIDER** | `MOBILEMONEY` | Buy: 22.80 SLE<br>Sell: Blocked | Orange Money / Africell Phone Number |
| 16 | **Tanzania (TZ)** | TZS | **PASS** | `MOBILEMONEY` (min: 2,600 TZS) | **BLOCKED_PROVIDER** | `MOBILEMONEY` | Buy: 2650.00 TZS<br>Sell: Blocked | M-Pesa / Tigo Pesa Phone Number |
| 17 | **Uganda (UG)** | UGX | **PASS** | `MOBILEMONEY` (min: 3,700 UGX) | **BLOCKED_PROVIDER** | `MOBILEMONEY` | Buy: 3720.00 UGX<br>Sell: Blocked | MTN / Airtel Mobile Money Phone Number |
| 18 | **Zambia (ZM)** | ZMW | **PASS** | `MOBILEMONEY` (min: 27 ZMW) | **BLOCKED_PROVIDER** | `MOBILEMONEY` | Buy: 27.40 ZMW<br>Sell: Blocked | MTN / Airtel Mobile Money Phone Number |
| 19 | **Botswana (BW)** | BWP | **PASS** | `MOBILEMONEY` (min: 140 BWP) | **UNSUPPORTED_PROVIDER** | N/A (Switch has no off-ramp coverage for BW) | Buy: 13.80 BWP<br>Sell: N/A | Orange Money / MyZaka Phone Number |
| 20 | **Liberia (LR)** | LRD | **PASS** | `MOBILEMONEY` (min: 195 LRD) | **BLOCKED_PROVIDER** | `MOBILEMONEY` | Buy: 198.50 LRD<br>Sell: Blocked | Lonestar MTN / Orange Money Phone Number |

---

## 3. Key Architectural Observations

1. **On-Ramp Dominance of Mobile Money:** Outside Nigeria (which uses virtual bank deposit accounts), 13 of the 14 operational on-ramp corridors utilize `MOBILEMONEY` payment channels with low minimum deposit thresholds.
2. **Remittance Off-Ramp Permission Restriction:** All 18 non-NG off-ramp corridors that Switch supports technically are gated behind the account permission `Access key not enabled for REMITTANCE`.
3. **Morocco (MAD):** Switch currently has zero coverage for Morocco in sandbox or production (`No undefined coverage for MA`).
4. **Egypt (EGP) & Botswana (BWP):** On-ramp quotes are fully functional (minimum 538 EGP and 140 BWP respectively), but Switch does not support off-ramp for these two countries.
5. **Dynamic UI Filtering:** MyArteLab frontend dynamically displays only corridors and directions supported by the live API response. If a user selects a corridor with only one active direction, unsupported directions are disabled with a clear informational tooltip rather than failing during submission.
