#!/usr/bin/env node
/**
 * Unreserve all balance - set reservedBalance to 0
 * WARNING: This makes all balance available for withdrawal
 * Run: node scripts/unreserve-all-balance.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function unreserveAll() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myartelab');
    
    console.log('========================================');
    console.log('UNRESERVE ALL BALANCE');
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

    console.log('Current State:');
    console.log(`  Balance: ${usdcAsset.balance} USDC`);
    console.log(`  Reserved: ${usdcAsset.reservedBalance} USDC`);
    console.log(`  Available: ${usdcAsset.balance - usdcAsset.reservedBalance} USDC\n`);

    const oldReserved = usdcAsset.reservedBalance;
    
    // Set reserved to 0 - making all balance available
    usdcAsset.reservedBalance = 0;
    await user.save();

    console.log('✅ All balance unreserved!');
    console.log('\nNew State:');
    console.log(`  Balance: ${usdcAsset.balance} USDC`);
    console.log(`  Reserved: ${usdcAsset.reservedBalance} USDC`);
    console.log(`  Available: ${usdcAsset.balance - usdcAsset.reservedBalance} USDC\n`);

    console.log(`Unreserved amount: ${oldReserved} USDC`);
    console.log('\n⚠️  WARNING: All balance is now available for withdrawal.');
    console.log('   You can now withdraw up to 3.53 USDC!\n');

    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

unreserveAll();
