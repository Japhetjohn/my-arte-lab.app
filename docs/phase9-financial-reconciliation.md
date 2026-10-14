# MyArteLab — Phase 9: Financial Reconciliation & Ledger Accounting Architecture

## 1. Accounting Principles & Currency Denomination

All internal marketplace transactions, escrow deposits, creator payouts, and platform revenues are strictly denominated in **USDC on Solana** (`solana:usdc`).

Local African fiat currencies (NGN, GHS, KES, CDF, etc.) exist solely at the payment rail boundary:
- **On-Ramp (Funding)**: Local fiat is deposited via Switch virtual bank accounts or mobile money, converted to USDC at guaranteed real-time rates, and credited to the user's ledger balance.
- **Off-Ramp (Withdrawal)**: USDC is deducted from the creator's ledger balance and paid out in local fiat directly to their domestic bank account or mobile money wallet.

---

## 2. Dual-Balance Synchronization in Atomic Lockstep

To ensure 100% backward compatibility and eliminate race conditions between legacy database fields and nested wallet structures, MyArteLab maintains dual fields in lockstep:

```javascript
// Example Atomic Balance Increment (Funding Deposit)
await User.findByIdAndUpdate(userId, {
  $inc: {
    'wallet.balance': creditAmount,  // Nested wallet object
    'balance': creditAmount          // Top-level root property
  },
  $set: {
    'wallet.lastUpdated': new Date(),
    'lastUpdated': new Date()
  }
});
```

### Dual Balance Mapping Table

| Metric | Nested Field | Root Field | Economic Meaning |
| :--- | :--- | :--- | :--- |
| **Total Balance** | `user.wallet.balance` | `user.balance` | Total settled economic value owned by user |
| **Escrow Pending** | `user.wallet.pendingBalance` | `user.pendingBalance` | Funds committed to active creative projects |
| **Withdrawal Reserved** | `user.wallet.pendingWithdrawal` | `user.pendingWithdrawal` | Funds locked during in-flight off-ramp payouts |
| **Total Creator Earnings** | `user.wallet.totalEarnings` | `user.totalEarnings` | Cumulative lifetime creative earnings |

**Available Spending / Withdrawal Balance Formula**:
$$\text{Available Balance} = \max(0, \text{Balance} - \text{Pending Withdrawal})$$

---

## 3. The 10% Marketplace Commission Standard

The marketplace commission on MyArteLab is strictly **10%** across all services, milestones, custom bookings, and counter-proposals.

$$\text{Platform Fee} = \text{Booking Amount} \times 0.10$$
$$\text{Creator Payout} = \text{Booking Amount} \times 0.90$$

### Financial Breakdown of a Benchmark 50.00 USDC Booking

| Party / Entity | Initial State | Upon Payment (Escrow Funded) | Upon Approval (Funds Released) | Net Delta |
| :--- | :---: | :---: | :---: | :---: |
| **Client Balance** | 100.00 USDC | 50.00 USDC (50.00 Pending) | 50.00 USDC (0.00 Pending) | -50.00 USDC |
| **Escrow Wallet** | 0.00 USDC | 50.00 USDC | 0.00 USDC | 0.00 USDC |
| **Platform Revenue (10%)** | 0.00 USDC | 0.00 USDC | 5.00 USDC | **+5.00 USDC** |
| **Creator Balance (90%)** | 0.00 USDC | 0.00 USDC | 45.00 USDC | **+45.00 USDC** |
| **Conservation of Funds** | **100.00 USDC** | **100.00 USDC** | **100.00 USDC** | **Balanced (0.00)** |

> [!IMPORTANT]
> The **1% Switch Developer Fee** is an optional routing parameter passed to Switch (`developer_fee: 1`, `developer_recipient`). It is settled directly by Switch to the platform wallet during fiat-crypto conversions and is **never** deducted from the creator's earnings or presented as an additional line item to the user.

---

## 4. Concurrency & Overspending Defense

Double-spending and balance overdrafts are mathematically prevented at the database query level using atomic MongoDB expressions (`$expr` and `$gte`):

```javascript
// Atomic reservation query prevents concurrent race conditions
const userUpdate = await User.findOneAndUpdate(
  {
    _id: userId,
    $expr: {
      $gte: [
        {
          $subtract: [
            { $ifNull: ['$wallet.balance', '$balance'] },
            { $ifNull: ['$wallet.pendingWithdrawal', 0] }
          ]
        },
        withdrawalAmount
      ]
    }
  },
  {
    $inc: {
      'wallet.pendingWithdrawal': withdrawalAmount,
      'pendingWithdrawal': withdrawalAmount
    }
  },
  { new: true }
);
```

If two simultaneous requests of 40 USDC are received against an available balance of 50 USDC:
1. The first request satisfies `50 - 0 >= 40` and succeeds, setting pending withdrawal to 40 USDC (available becomes 10 USDC).
2. The second request evaluates `50 - 40 >= 40` ($10 \ge 40$, which is false). It is immediately rejected with HTTP 400 `Insufficient available balance`.
3. Balance never drops below zero.
