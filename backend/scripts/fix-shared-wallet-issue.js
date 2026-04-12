#!/usr/bin/env node
/**
 * Fix the shared wallet issue - HostFi B2B returns same balance for all users
 * We need to track per-user balances based on their actual transactions
 * Run: node scripts/fix-shared-wallet-issue.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Transaction = require('../src/models/Transaction');
const User = require('../src/models/User');
const Booking = require('../src/models/Booking');

async function fixSharedWallet() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myartelab');
    console.log('Connected to MongoDB\n');

    // First, remove all "reconciliation" deposits (they're wrong - used shared balance)
    console.log('Removing incorrect reconciliation entries...');
    const deleted = await Transaction.deleteMany({
      type: 'deposit',
      description: { $regex: 'reconciliation', $options: 'i' }
    });
    console.log(`Deleted ${deleted.deletedCount} reconciliation entries\n`);

    // Get all users
    const users = await User.find({ 'wallet.hostfiWalletAssets': { $exists: true } });
    console.log(`Fixing balances for ${users.length} users\n`);

    for (const user of users) {
      console.log(`Processing: ${user.email}`);
      
      // Get user's REAL transactions (excluding reconciliation entries)
      const transactions = await Transaction.find({
        user: user._id,
        currency: 'USDC',
        status: { $in: ['completed', 'success', 'confirmed'] }
      });

      console.log(`  USDC Transactions: ${transactions.length}`);

      // Calculate balance from verified transactions only
      let credits = 0;
      let debits = 0;

      transactions.forEach(tx => {
        const amount = parseFloat(tx.amount) || 0;
        
        // Skip suspicious amounts (test data)
        if (amount > 1000) {
          console.log(`    ⚠️ SKIPPED (suspicious): ${tx.type} ${amount} USDC`);
          return;
        }

        if (['deposit', 'earning', 'refund', 'bonus', 'reversal', 'onramp'].includes(tx.type)) {
          credits += amount;
          console.log(`    ✓ CREDIT: +${amount} USDC - ${tx.type}`);
        } else if (['withdrawal', 'payment', 'platform_fee', 'offramp'].includes(tx.type)) {
          debits += amount;
          console.log(`    ✓ DEBIT: -${amount} USDC - ${tx.type}`);
        }
      });

      const netBalance = credits - debits;
      const correctedBalance = Math.max(0, netBalance);

      console.log(`  Credits: ${credits}, Debits: ${debits}`);
      console.log(`  Net Balance: ${netBalance}, Corrected: ${correctedBalance} USDC`);

      // Update user wallet
      const usdcAsset = user.wallet.hostfiWalletAssets?.find(a => a.currency === 'USDC');
      if (usdcAsset) {
        usdcAsset.balance = correctedBalance;
        usdcAsset.lastSynced = new Date();
      }
      user.wallet.balance = correctedBalance;
      user.balance = correctedBalance;
      await user.save({ validateBeforeSave: false });

      console.log(`  ✅ Updated to ${correctedBalance} USDC\n`);
    }

    await mongoose.disconnect();
    console.log('\n✅ Done! All balances now calculated from individual transactions');
    console.log('NOTE: HostFi B2B returns shared balance - we track per-user balances internally');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run immediately
fixSharedWallet();
