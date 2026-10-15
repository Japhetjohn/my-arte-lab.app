#!/usr/bin/env node
/**
 * ============================================================================
 * MyArteLab — Safe Development Wallet Reset Script
 * ============================================================================
 *
 * PURPOSE:
 *   Resets disposable development and test wallet records (transactions,
 *   funding records, withdrawal reservations, and test balances) back to a
 *   clean, verified baseline state.
 *
 * SAFETY GUARDS:
 *   1. Strictly refuses to execute if NODE_ENV === 'production'.
 *   2. Strictly refuses to execute against production hostnames / clusters.
 *   3. Runs in safe DRY-RUN mode by default unless --confirm is explicitly passed.
 *   4. Masks all connection strings and credentials to prevent secret leakage.
 *   5. Requires explicit user targeting (--email=<email> or --all-dev-users).
 *
 * USAGE:
 *   # Dry-run for a specific test user (safely inspect affected records):
 *   node backend/scripts/reset-dev-wallet.js --email=tester@example.com
 *
 *   # Execute confirmed reset for a specific test user:
 *   node backend/scripts/reset-dev-wallet.js --email=tester@example.com --confirm
 *
 *   # Reset and seed with 50.00 USDC clean starting balance:
 *   node backend/scripts/reset-dev-wallet.js --email=tester@example.com --confirm --seed-amount=50
 *
 *   # Dry-run for all users in local development database:
 *   node backend/scripts/reset-dev-wallet.js --all-dev-users
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
const Booking = require('../src/models/Booking');

// Parse CLI arguments
const args = process.argv.slice(2);
const isConfirmed = args.includes('--confirm');
const isDryRun = args.includes('--dry-run') || !isConfirmed;
const allDevUsers = args.includes('--all-dev-users');

const emailArg = args.find((a) => a.startsWith('--email='));
const targetEmail = emailArg ? emailArg.split('=')[1].trim().toLowerCase() : null;

const seedArg = args.find((a) => a.startsWith('--seed-amount='));
const seedAmount = seedArg ? parseFloat(seedArg.split('=')[1]) : 0;

// Helper to mask MongoDB URI
function maskUri(uri) {
  if (!uri) return 'undefined';
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
}

// ----------------------------------------------------------------------------
// Safety Verification Checks
// ----------------------------------------------------------------------------
function verifyEnvironmentSafety(mongoUri) {
  const nodeEnv = (process.env.NODE_ENV || 'development').toLowerCase();

  // Guard 1: Never run in production
  if (nodeEnv === 'production') {
    console.error('\n❌ SAFETY ABORT: NODE_ENV is set to "production".');
    console.error('   This script strictly refuses to run in production environments.');
    process.exit(1);
  }

  // Guard 2: Inspect connection string for production indicators
  const lowerUri = (mongoUri || '').toLowerCase();
  const prohibitedHosts = [
    'production',
    'prod',
    'mongodb.net', // MongoDB Atlas clusters
    '72.61.97.210', // MyArteLab Production VPS IP
  ];

  for (const host of prohibitedHosts) {
    if (lowerUri.includes(host)) {
      console.error(`\n❌ SAFETY ABORT: Database URI matches prohibited production indicator ("${host}").`);
      console.error('   This reset script cannot be executed against remote or production databases.');
      process.exit(1);
    }
  }

  // Guard 3: Must target either a specific email or explicitly set --all-dev-users
  if (!targetEmail && !allDevUsers) {
    console.error('\n❌ USAGE ERROR: You must specify a target test user or pass --all-dev-users.');
    console.error('   Examples:');
    console.error('     node backend/scripts/reset-dev-wallet.js --email=tester@example.com');
    console.error('     node backend/scripts/reset-dev-wallet.js --email=tester@example.com --confirm');
    console.error('     node backend/scripts/reset-dev-wallet.js --all-dev-users\n');
    process.exit(1);
  }
}

// ----------------------------------------------------------------------------
// Main Execution
// ----------------------------------------------------------------------------
async function main() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/myartelab';

  console.log('\n============================================================');
  console.log('🛡️  MYARTELAB SAFE DEVELOPMENT WALLET RESET');
  console.log('============================================================');
  console.log(`• Environment:      ${process.env.NODE_ENV || 'development'}`);
  console.log(`• Target Database:  ${maskUri(mongoUri)}`);
  console.log(`• Mode:              ${isDryRun ? '🔍 DRY-RUN (No changes applied)' : '⚠️  LIVE EXECUTION (--confirm provided)'}`);
  console.log(`• Target User:      ${targetEmail || 'All users in local dev database'}`);
  if (seedAmount > 0) {
    console.log(`• Seed Balance:     ${seedAmount} USDC`);
  }
  console.log('============================================================\n');

  // Run safety guards
  verifyEnvironmentSafety(mongoUri);

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✓ Successfully connected to development database\n');

    // 1. Identify Target Users
    const userFilter = targetEmail ? { email: targetEmail } : {};
    const users = await User.find(userFilter).select('_id email firstName lastName wallet balance pendingBalance pendingWithdrawal');

    if (users.length === 0) {
      console.log(`⚠️ No users found matching filter: ${JSON.stringify(userFilter)}`);
      return;
    }

    console.log(`Found ${users.length} target user(s):\n`);
    for (const u of users) {
      const storedBal = u.wallet?.balance !== undefined ? u.wallet.balance : (u.balance || 0);
      const pendingRes = u.wallet?.pendingWithdrawal || u.pendingWithdrawal || 0;
      console.log(`  👤 ${u.email} [ID: ${u._id}]`);
      console.log(`     • Current Stored Balance:   $${storedBal.toFixed(2)} USDC`);
      console.log(`     • Pending Reservations:     $${pendingRes.toFixed(2)} USDC`);
    }

    console.log('\nScanning related wallet collections...');

    const userIds = users.map((u) => u._id);

    // 2. Count Records That Would Be Affected
    const txCount = await Transaction.countDocuments({ user: { $in: userIds } });
    const fundingCount = await FundingTransaction.countDocuments({ user: { $in: userIds } });
    const withdrawalCount = await WithdrawalTransaction.countDocuments({ user: { $in: userIds } });
    const solanaDepositCount = await SolanaDeposit.countDocuments({ user: { $in: userIds } });
    const testBookingsCount = await Booking.countDocuments({
      $or: [{ client: { $in: userIds } }, { creator: { $in: userIds } }],
      paymentStatus: 'paid',
      status: { $in: ['confirmed', 'in_progress'] },
    });

    console.log('\n------------------------------------------------------------');
    console.log('AFFECTED DEVELOPMENT RECORDS SUMMARY');
    console.log('------------------------------------------------------------');
    console.log(`• Ledger Transactions:        ${txCount}`);
    console.log(`• Switch Funding Records:     ${fundingCount}`);
    console.log(`• Switch Withdrawal Records:  ${withdrawalCount}`);
    console.log(`• Solana On-Chain Deposits:   ${solanaDepositCount}`);
    console.log(`• Active Escrow Test Bookings:${testBookingsCount}`);
    console.log('------------------------------------------------------------\n');

    if (isDryRun) {
      console.log('ℹ️  DRY-RUN COMPLETE: No records were modified or deleted.');
      console.log('   To apply this reset, re-run with the --confirm flag:');
      if (targetEmail) {
        console.log(`   node backend/scripts/reset-dev-wallet.js --email=${targetEmail} --confirm\n`);
      } else {
        console.log('   node backend/scripts/reset-dev-wallet.js --all-dev-users --confirm\n');
      }
      return;
    }

    // 3. EXECUTE RESET (Confirmed mode only)
    console.log('⚡ Executing verified wallet reset on development data...\n');

    // A. Remove test transactions and related provider records
    const delTx = await Transaction.deleteMany({ user: { $in: userIds } });
    const delFund = await FundingTransaction.deleteMany({ user: { $in: userIds } });
    const delWith = await WithdrawalTransaction.deleteMany({ user: { $in: userIds } });
    const delSol = await SolanaDeposit.deleteMany({ user: { $in: userIds } });

    console.log(`  ✓ Cleared ${delTx.deletedCount} transaction ledger records`);
    console.log(`  ✓ Cleared ${delFund.deletedCount} funding records`);
    console.log(`  ✓ Cleared ${delWith.deletedCount} withdrawal records`);
    console.log(`  ✓ Cleared ${delSol.deletedCount} Solana deposit records`);

    // B. Reset user balances and reservations in 100% lockstep
    for (const u of users) {
      await User.findByIdAndUpdate(u._id, {
        $set: {
          balance: 0,
          pendingBalance: 0,
          pendingWithdrawal: 0,
          totalEarnings: 0,
          'wallet.balance': 0,
          'wallet.pendingBalance': 0,
          'wallet.pendingWithdrawal': 0,
          'wallet.lastUpdated': new Date(),
          'wallet.hostfiWalletAssets': [], // Clear obsolete hostfi arrays
          lastUpdated: new Date(),
        },
      });
      console.log(`  ✓ Reset balance and pending withdrawal to $0.00 for ${u.email}`);

      // C. Optional: Seed clean test balance with matching authoritative ledger transaction
      if (seedAmount > 0) {
        const seedTxId = `seed-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        await Transaction.create({
          transactionId: seedTxId,
          user: u._id,
          type: 'deposit',
          amount: seedAmount,
          currency: 'USDC',
          status: 'completed',
          description: 'Development Initial Test Deposit',
          confirmations: 1,
        });

        await User.findByIdAndUpdate(u._id, {
          $set: {
            balance: seedAmount,
            'wallet.balance': seedAmount,
            'wallet.lastUpdated': new Date(),
          },
        });

        console.log(`  ✓ Seeded $${seedAmount.toFixed(2)} USDC with authoritative ledger transaction (${seedTxId}) for ${u.email}`);
      }
    }

    console.log('\n============================================================');
    console.log('✅ DEVELOPMENT WALLET RESET SUCCESSFULLY COMPLETED');
    console.log('============================================================\n');

  } catch (error) {
    console.error('\n❌ Reset Script Failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('[DB] Disconnected cleanly.\n');
  }
}

main();
