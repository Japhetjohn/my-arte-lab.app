#!/usr/bin/env node
/**
 * Fix user balance by recalculating from verified USDC transactions only
 * Ignores bad/test data (like large NGN deposits)
 * Run: node scripts/fix-user-balance.js japhetjohnk@gmail.com
 */

require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../src/models/User');
const Transaction = require('../src/models/Transaction');

const email = process.argv[2];
const newBalance = process.argv[3] ? parseFloat(process.argv[3]) : null;

if (!email) {
  console.error('Usage:');
  console.error('  Calculate from transactions: node fix-user-balance.js <email>');
  console.error('  Set manual balance: node fix-user-balance.js <email> <amount>');
  console.error('Example: node fix-user-balance.js japhetjohnk@gmail.com 1.5');
  process.exit(1);
}

async function fixBalance() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myartelab');
    console.log('Connected to MongoDB\n');

    const user = await User.findOne({ email });
    if (!user) {
      console.error(`User not found: ${email}`);
      process.exit(1);
    }

    console.log(`User: ${user.firstName} ${user.lastName} (${email})`);
    console.log(`Current stored balance: ${user.wallet?.balance || 0}\n`);

    let correctedBalance;

    if (newBalance !== null) {
      // Manual override
      correctedBalance = newBalance;
      console.log(`Setting manual balance: ${correctedBalance} USDC`);
    } else {
      // Calculate from USDC transactions only
      console.log('Calculating from verified USDC transactions...\n');
      
      const transactions = await Transaction.find({
        user: user._id,
        currency: 'USDC',
        status: { $in: ['completed', 'success', 'confirmed'] }
      });

      let credits = 0;
      let debits = 0;

      transactions.forEach(tx => {
        const amount = parseFloat(tx.amount) || 0;
        
        // Only count reasonable amounts (filter out bad data)
        if (amount > 1000) {
          console.log(`⚠️ SKIPPED (suspicious amount): ${tx.type} ${amount} USDC - ${tx.transactionId}`);
          return;
        }

        if (['deposit', 'earning', 'refund', 'bonus', 'reversal', 'onramp'].includes(tx.type)) {
          console.log(`✓ CREDIT: +${amount} USDC - ${tx.type} - ${tx.transactionId}`);
          credits += amount;
        } else if (['withdrawal', 'payment', 'platform_fee', 'offramp'].includes(tx.type)) {
          console.log(`✓ DEBIT: -${amount} USDC - ${tx.type} - ${tx.transactionId}`);
          debits += amount;
        }
      });

      correctedBalance = credits - debits;
      console.log(`\nCredits: ${credits} USDC`);
      console.log(`Debits: ${debits} USDC`);
    }

    // Ensure non-negative balance
    correctedBalance = Math.max(0, correctedBalance);
    console.log(`\n✅ Corrected balance: ${correctedBalance} USDC`);

    // Update user record
    const usdcAsset = user.wallet.hostfiWalletAssets?.find(a => a.currency === 'USDC');
    
    if (usdcAsset) {
      usdcAsset.balance = correctedBalance;
      usdcAsset.lastSynced = new Date();
    }
    
    user.wallet.balance = correctedBalance;
    user.balance = correctedBalance;
    
    await user.save({ validateBeforeSave: false });
    
    console.log(`✅ Balance updated for ${email}`);
    console.log(`New stored balance: ${correctedBalance} USDC`);

    await mongoose.disconnect();

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

fixBalance();
