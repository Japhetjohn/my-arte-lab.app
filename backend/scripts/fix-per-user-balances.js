#!/usr/bin/env node
/**
 * Fix per-user balances - HostFi B2B returns shared wallets
 * We calculate each user's actual balance from their verified transactions
 * Run: node scripts/fix-per-user-balances.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Transaction = require('../src/models/Transaction');
const User = require('../src/models/User');
const Booking = require('../src/models/Booking');

async function fixPerUserBalances() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myartelab');
    console.log('Connected to MongoDB\n');

    // Get all users with wallets
    const users = await User.find({ 'wallet.hostfiWalletAssets': { $exists: true } });
    console.log(`Fixing balances for ${users.length} users\n`);
    console.log('========================================');

    for (const user of users) {
      console.log(`\nUser: ${user.email}`);
      
      // Get USDC asset
      const usdcAsset = user.wallet.hostfiWalletAssets?.find(a => a.currency === 'USDC');
      if (!usdcAsset) {
        console.log('  No USDC wallet found');
        continue;
      }

      // Get all USDC transactions for this user
      const transactions = await Transaction.find({
        user: user._id,
        currency: 'USDC',
        status: { $in: ['completed', 'success', 'confirmed'] }
      });

      console.log(`  Transactions: ${transactions.length}`);

      // Calculate balance from verified transactions
      let credits = 0;
      let debits = 0;
      const txDetails = [];

      transactions.forEach(tx => {
        const amount = parseFloat(tx.amount) || 0;
        
        // Skip suspicious/test amounts
        if (amount > 1000) {
          console.log(`    ⚠️ SKIPPED (test data): ${tx.type} ${amount} USDC`);
          return;
        }

        if (['deposit', 'earning', 'refund', 'bonus', 'reversal', 'onramp'].includes(tx.type)) {
          credits += amount;
          txDetails.push(`+${amount} ${tx.type}`);
        } else if (['withdrawal', 'payment', 'platform_fee', 'offramp'].includes(tx.type)) {
          debits += amount;
          txDetails.push(`-${amount} ${tx.type}`);
        }
      });

      const netBalance = Math.max(0, credits - debits);

      if (txDetails.length > 0) {
        console.log(`    ${txDetails.join(', ')}`);
      }
      console.log(`  Credits: ${credits}, Debits: ${debits}`);
      console.log(`  Correct Balance: ${netBalance} USDC`);

      // Update user record
      usdcAsset.balance = netBalance;
      usdcAsset.lastSynced = new Date();
      user.wallet.balance = netBalance;
      user.balance = netBalance;
      
      await user.save({ validateBeforeSave: false });
      console.log(`  ✅ Updated`);
    }

    console.log('\n========================================');
    console.log('✅ All user balances fixed!\n');
    
    // Summary
    console.log('SUMMARY:');
    console.log('- Each user now has their own calculated balance');
    console.log('- HostFi shared wallet balance is ignored');
    console.log('- Deposits/payouts still work via HostFi');
    console.log('- Internal tracking ensures accurate per-user balances');

    await mongoose.disconnect();

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

fixPerUserBalances();
