#!/usr/bin/env node
/**
 * Fix reserved balance to match HostFi's actual available amount
 * Run: node scripts/fix-reserved-balance.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function fixReservedBalance() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myartelab');
    
    console.log('========================================');
    console.log('FIX RESERVED BALANCE');
    console.log('========================================\n');

    const user = await User.findOne({ email: 'japhetjohnk@gmail.com' });
    if (!user) {
      console.error('❌ User not found');
      process.exit(1);
    }

    const usdcAsset = user.wallet?.hostfiWalletAssets?.find(a => a.currency === 'USDC');
    if (!usdcAsset) {
      console.error('❌ USDC asset not found');
      process.exit(1);
    }

    console.log('Current Database State:');
    console.log(`  Balance: ${usdcAsset.balance} USDC`);
    console.log(`  Reserved: ${usdcAsset.reservedBalance} USDC`);
    console.log(`  Available (DB): ${usdcAsset.balance - usdcAsset.reservedBalance} USDC`);
    console.log(`  Available (HostFi): 0.731769 USDC\n`);

    // HostFi says 0.731769 is available, which means:
    // reserved = balance - available = 3.531769 - 0.731769 = 2.8 USDC
    const correctReserved = usdcAsset.balance - 0.731769;
    
    console.log(`Correct reserved should be: ${correctReserved} USDC`);
    console.log(`(Balance - HostFi Available = ${usdcAsset.balance} - 0.731769 = ${correctReserved})\n`);

    // Update the reserved balance
    usdcAsset.reservedBalance = correctReserved;
    await user.save();

    console.log('✅ Reserved balance updated!');
    console.log('\nNew Database State:');
    console.log(`  Balance: ${usdcAsset.balance} USDC`);
    console.log(`  Reserved: ${usdcAsset.reservedBalance} USDC`);
    console.log(`  Available: ${usdcAsset.balance - usdcAsset.reservedBalance} USDC\n`);

    console.log('⚠️  IMPORTANT:');
    console.log('We still only have 0.73 USDC available, but HostFi requires 1 USDC minimum.');
    console.log('\nOptions:');
    console.log('1. Deposit ~0.27 USDC more to reach 1 USDC minimum');
    console.log('2. Or reduce payout amount (not possible - already at minimum)');
    console.log('3. Or the booking escrow needs to be released by HostFi\n');

    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixReservedBalance();
