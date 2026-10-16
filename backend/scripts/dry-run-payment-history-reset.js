#!/usr/bin/env node
/**
 * ============================================================================
 * MyArteLab — Payment History Audit & Safe Dry-Run Reset Script
 * ============================================================================
 *
 * PURPOSE:
 *   Investigates and audits existing transaction, funding, and withdrawal
 *   records in MongoDB. Classifies test vs real accounts, calculates ledger
 *   balance integrity, and provides a safe dry-run inspection report.
 *
 * SAFETY GUARDS:
 *   1. Strictly refuses destructive operations without explicit confirmation.
 *   2. Strictly refuses destructive operations if NODE_ENV === 'production'.
 *   3. Never drops collections or alters schemas.
 *   4. Masks sensitive credentials and addresses.
 *   5. Default mode is 100% READ-ONLY / DRY-RUN.
 *
 * USAGE:
 *   # Audit & Dry-Run Report (100% Safe, read-only):
 *   node backend/scripts/dry-run-payment-history-reset.js
 *
 *   # Audit specific user:
 *   node backend/scripts/dry-run-payment-history-reset.js --email=user@example.com
 *
 * ============================================================================
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

// Models
const User = require('../src/models/User');
const Transaction = require('../src/models/Transaction');
const FundingTransaction = require('../src/models/FundingTransaction');
const WithdrawalTransaction = require('../src/models/WithdrawalTransaction');
const SolanaDeposit = require('../src/models/SolanaDeposit');

// CLI Arguments
const args = process.argv.slice(2);
const isExecute = args.includes('--execute-reset');
const isConfirm = args.includes('--confirm');
const emailArg = args.find(a => a.startsWith('--email='));
const targetEmail = emailArg ? emailArg.split('=')[1].trim().toLowerCase() : null;

function maskUri(uri) {
  if (!uri) return 'undefined';
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
}

async function auditAndReport() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/myartelab';
  const nodeEnv = process.env.NODE_ENV || 'development';

  console.log('\n============================================================');
  console.log('📊 MYARTELAB PAYMENT HISTORY AUDIT & DRY-RUN INSPECTION');
  console.log('============================================================');
  console.log(`• Node Environment:  ${nodeEnv}`);
  console.log(`• Target Database:   ${maskUri(mongoUri)}`);
  console.log(`• Mode:              ${isExecute && isConfirm ? '⚠️  EXECUTE RESET (CONFIRMED)' : '🔍 DRY-RUN (READ-ONLY AUDIT)'}`);
  if (targetEmail) {
    console.log(`• Target User Filter:${targetEmail}`);
  }
  console.log('============================================================\n');

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 });
    console.log('✓ Connected to MongoDB database successfully.\n');

    // 1. Overall Collection Counts
    const totalTx = await Transaction.countDocuments();
    const totalFunding = await FundingTransaction.countDocuments();
    const totalWithdrawal = await WithdrawalTransaction.countDocuments();
    const totalSolana = await SolanaDeposit.countDocuments();
    const totalUsers = await User.countDocuments();

    console.log('------------------------------------------------------------');
    console.log('1. GLOBAL REPOSITORY TOTALS');
    console.log('------------------------------------------------------------');
    console.log(`• Registered Users:          ${totalUsers}`);
    console.log(`• Ledger Transactions:        ${totalTx}`);
    console.log(`• Switch Funding Transactions:${totalFunding}`);
    console.log(`• Switch Withdrawal Txns:     ${totalWithdrawal}`);
    console.log(`• Direct Solana Deposits:     ${totalSolana}`);
    console.log('------------------------------------------------------------\n');

    // 2. Transaction Classification by Status & Type
    const statusBreakdown = await Transaction.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, totalVolume: { $sum: '$amount' } } },
      { $sort: { count: -1 } }
    ]);

    const typeBreakdown = await Transaction.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 }, totalVolume: { $sum: '$amount' } } },
      { $sort: { count: -1 } }
    ]);

    console.log('2. TRANSACTION BREAKDOWN BY STATUS & TYPE:');
    console.log('  Status Breakdown:');
    statusBreakdown.forEach(s => {
      console.log(`    - ${String(s._id || 'unknown').toUpperCase()}: ${s.count} transactions (Volume: $${(s.totalVolume || 0).toFixed(2)})`);
    });

    console.log('\n  Type Breakdown:');
    typeBreakdown.forEach(t => {
      console.log(`    - ${String(t._id || 'unknown').toUpperCase()}: ${t.count} transactions (Volume: $${(t.totalVolume || 0).toFixed(2)})`);
    });
    console.log('------------------------------------------------------------\n');

    // 3. User Account Audit & Balance Integrity
    const userQuery = targetEmail ? { email: targetEmail } : {};
    const users = await User.find(userQuery).select('_id email firstName lastName role wallet balance pendingBalance pendingWithdrawal createdAt');

    console.log(`3. USER ACCOUNT FINANCIAL INTEGRITY AUDIT (${users.length} accounts analyzed):\n`);

    const testAccountIndicators = ['test', 'dev', 'example.com', 'dummy', 'localhost', 'tester', 'temp'];

    for (const u of users) {
      const isTestEmail = testAccountIndicators.some(ind => (u.email || '').toLowerCase().includes(ind));
      const accountClassification = isTestEmail ? '🧪 TEST / DEV ACCOUNT' : '👤 USER ACCOUNT';

      const userTxCount = await Transaction.countDocuments({ user: u._id });
      const userFundCount = await FundingTransaction.countDocuments({ user: u._id });
      const userWithCount = await WithdrawalTransaction.countDocuments({ user: u._id });

      const storedBal = u.wallet?.balance !== undefined ? u.wallet.balance : (u.balance || 0);
      const pendingRes = u.wallet?.pendingWithdrawal || u.pendingWithdrawal || 0;

      // Calculate ledger-sum balance from completed transactions
      const ledgerSumResult = await Transaction.aggregate([
        { $match: { user: u._id, status: 'completed' } },
        {
          $group: {
            _id: null,
            deposits: {
              $sum: {
                $cond: [{ $in: ['$type', ['deposit', 'earning', 'bonus', 'onramp']] }, '$amount', 0]
              }
            },
            withdrawals: {
              $sum: {
                $cond: [{ $in: ['$type', ['withdrawal', 'payment', 'offramp']] }, '$amount', 0]
              }
            },
            refunds: {
              $sum: {
                $cond: [{ $eq: ['$type', 'refund'] }, '$amount', 0]
              }
            }
          }
        }
      ]);

      const deposits = ledgerSumResult[0]?.deposits || 0;
      const withdrawals = ledgerSumResult[0]?.withdrawals || 0;
      const refunds = ledgerSumResult[0]?.refunds || 0;
      const computedLedgerBalance = deposits + refunds - withdrawals;
      const isInBalance = Math.abs(storedBal - computedLedgerBalance) < 0.01;

      console.log(`  ${accountClassification}: ${u.email} [ID: ${u._id}]`);
      console.log(`     • Stored Available Balance:  $${storedBal.toFixed(2)} USDC`);
      console.log(`     • Pending Reservations:      $${pendingRes.toFixed(2)} USDC`);
      console.log(`     • Ledger Transactions:       ${userTxCount} (Fund: ${userFundCount}, With: ${userWithCount})`);
      console.log(`     • Computed Ledger Net Sum:   $${computedLedgerBalance.toFixed(2)} USDC (Dep: $${deposits.toFixed(2)}, With: $${withdrawals.toFixed(2)})`);
      console.log(`     • Ledger Sync Status:        ${isInBalance ? '✅ 100% IN SYNC' : '⚠️ MISMATCH: Stored vs Ledger'}`);
      console.log('');
    }

    console.log('------------------------------------------------------------');
    console.log('4. SAFE RESET RECOMMENDATIONS & NEXT STEPS');
    console.log('------------------------------------------------------------');
    if (isExecute && isConfirm) {
      if (nodeEnv === 'production') {
        console.error('❌ SAFETY REFUSAL: Cannot execute reset in production!');
        process.exit(1);
      }
      if (process.env.RESET_CONFIRMATION !== 'YES_RESET_DEV_TEST_DATA') {
        console.error('❌ SAFETY REFUSAL: Missing environment variable RESET_CONFIRMATION="YES_RESET_DEV_TEST_DATA"');
        process.exit(1);
      }
      console.log('⚠️  Confirmed execution requested with authorized safety key.');
    } else {
      console.log('ℹ️  This script executed in 100% safe, non-destructive DRY-RUN mode.');
      console.log('   No customer records, transaction histories, or balances were altered.');
      console.log('   To reset test wallets in local development, use:');
      console.log('     node backend/scripts/reset-dev-wallet.js --email=<test-email> --confirm');
      console.log('------------------------------------------------------------\n');
    }

  } catch (err) {
    console.error('Audit Script Error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('[DB] Disconnected cleanly.\n');
  }
}

auditAndReport();
