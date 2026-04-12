#!/usr/bin/env node
/**
 * Clear bad/test transactions that don't match HostFi reality
 * Run: node scripts/clear-bad-transactions.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Transaction = require('../src/models/Transaction');
const User = require('../src/models/User');
const hostfiService = require('../src/services/hostfiService');

async function clearBadTransactions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myartelab');
    console.log('Connected to MongoDB\n');

    // Get all users
    const users = await User.find({ 'wallet.hostfiWalletAssets': { $exists: true } });
    console.log(`Found ${users.length} users with wallets\n`);

    for (const user of users) {
      console.log(`Processing: ${user.email}`);
      
      // Get real balance from HostFi
      const usdcAsset = user.wallet.hostfiWalletAssets?.find(a => a.currency === 'USDC');
      let realBalance = 0;
      
      if (usdcAsset?.assetId) {
        try {
          const assetDetails = await hostfiService.getWalletAsset(usdcAsset.assetId);
          realBalance = parseFloat(assetDetails?.balance) || 0;
          console.log(`  HostFi Balance: ${realBalance} USDC`);
        } catch (err) {
          console.log(`  ⚠️ Could not fetch HostFi: ${err.message}`);
          continue;
        }
      }

      // Find user's USDC transactions
      const transactions = await Transaction.find({
        user: user._id,
        currency: 'USDC'
      });

      console.log(`  DB Transactions: ${transactions.length}`);

      // Calculate what transactions should be to match HostFi
      // If HostFi shows 3.53 and we have a 2 USDC payment, we need deposits totaling 5.53
      let calculatedFromTx = 0;
      const txToKeep = [];
      const txToDelete = [];

      transactions.forEach(tx => {
        const amount = parseFloat(tx.amount) || 0;
        
        // Keep reasonable transactions (under 100 USDC and not test data)
        if (amount > 0 && amount < 100 && tx.status === 'completed') {
          if (['deposit', 'earning', 'refund'].includes(tx.type)) {
            calculatedFromTx += amount;
            txToKeep.push(tx);
          } else if (['withdrawal', 'payment', 'platform_fee'].includes(tx.type)) {
            calculatedFromTx -= amount;
            txToKeep.push(tx);
          }
        } else {
          txToDelete.push(tx);
        }
      });

      console.log(`  Calculated from TX: ${calculatedFromTx} USDC`);
      console.log(`  To Keep: ${txToKeep.length}, To Delete: ${txToDelete.length}`);

      // If calculated doesn't match HostFi, delete all and create a "reconciliation" deposit
      if (Math.abs(calculatedFromTx - realBalance) > 0.01) {
        console.log(`  ⚠️ Mismatch detected! Deleting ${txToKeep.length + txToDelete.length} transactions...`);
        
        // Delete all USDC transactions for this user
        await Transaction.deleteMany({
          user: user._id,
          currency: 'USDC'
        });

        // Create a single "Reconciliation" deposit to match HostFi
        if (realBalance > 0) {
          const reconTx = new Transaction({
            transactionId: `RECON-${user._id.toString().slice(-8)}-${Date.now()}`,
            user: user._id,
            type: 'deposit',
            amount: realBalance,
            currency: 'USDC',
            status: 'completed',
            description: 'Wallet reconciliation - balance synced from HostFi',
            createdAt: new Date()
          });
          await reconTx.save();
          console.log(`  ✅ Created reconciliation deposit: ${realBalance} USDC`);
        }

        // Update user balance
        if (usdcAsset) {
          usdcAsset.balance = realBalance;
          usdcAsset.lastSynced = new Date();
        }
        user.wallet.balance = realBalance;
        user.balance = realBalance;
        await user.save({ validateBeforeSave: false });
        console.log(`  ✅ Updated user balance to ${realBalance} USDC\n`);
      } else {
        console.log(`  ✅ Balances match, no action needed\n`);
      }
    }

    await mongoose.disconnect();
    console.log('\n✅ Done! All balances synced with HostFi');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Confirm before running
console.log('⚠️  WARNING: This will delete USDC transactions that don\'t match HostFi balances');
console.log('Run this ONLY if you want to reset transaction history to match HostFi reality\n');
console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

setTimeout(() => {
  clearBadTransactions();
}, 5000);
