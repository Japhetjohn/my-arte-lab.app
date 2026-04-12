#!/usr/bin/env node
/**
 * Fix balances after migration - remove reconciliation entries and calculate correctly
 * Run: node scripts/fix-balances-after-migration.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Transaction = require('../src/models/Transaction');
const User = require('../src/models/User');

async function fixBalances() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myartelab');
    console.log('Connected to MongoDB\n');

    // Delete all reconciliation transactions (they gave everyone the shared balance)
    console.log('Removing reconciliation transactions...');
    const deleted = await Transaction.deleteMany({
      description: { $regex: 'reconciliation', $options: 'i' }
    });
    console.log(`Deleted ${deleted.deletedCount} reconciliation transactions\n`);

    // Get all users
    const users = await User.find({});
    console.log(`Fixing balances for ${users.length} users\n`);
    console.log('========================================');

    for (const user of users) {
      console.log(`\nUser: ${user.email}`);
      
      // Get real transactions (excluding recon)
      const transactions = await Transaction.find({
        user: user._id,
        currency: 'USDC',
        status: { $in: ['completed', 'success', 'confirmed'] }
      });

      console.log(`  Real transactions: ${transactions.length}`);

      // Calculate from real transactions only
      let credits = 0;
      let debits = 0;

      transactions.forEach(tx => {
        const amount = parseFloat(tx.amount) || 0;
        if (amount > 1000) return; // Skip suspicious

        if (['deposit', 'earning', 'refund', 'bonus', 'reversal', 'onramp'].includes(tx.type)) {
          credits += amount;
        } else if (['withdrawal', 'payment', 'platform_fee', 'offramp'].includes(tx.type)) {
          debits += amount;
        }
      });

      const correctBalance = Math.max(0, credits - debits);
      console.log(`  Credits: ${credits}, Debits: ${debits}`);
      console.log(`  Correct Balance: ${correctBalance} USDC`);

      // Update user
      const usdcAsset = user.wallet?.hostfiWalletAssets?.find(a => a.currency === 'USDC');
      if (usdcAsset) {
        usdcAsset.balance = correctBalance;
        usdcAsset.lastSynced = new Date();
      }
      user.wallet.balance = correctBalance;
      user.balance = correctBalance;
      
      await user.save({ validateBeforeSave: false });
      console.log(`  ✅ Updated\n`);
    }

    console.log('========================================');
    console.log('\n✅ All balances fixed!');
    console.log('Users now see their actual calculated balances');

    await mongoose.disconnect();

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

console.log('⚠️  This will remove reconciliation transactions and recalculate all balances');
console.log('Press Ctrl+C to cancel, or wait 3 seconds...\n');

setTimeout(() => fixBalances(), 3000);
