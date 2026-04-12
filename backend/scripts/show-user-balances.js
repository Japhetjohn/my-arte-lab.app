#!/usr/bin/env node
/**
 * Show user balances from database (no API calls needed)
 * Run: node scripts/show-user-balances.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function showBalances() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myartelab');
    
    console.log('========================================');
    console.log('USER BALANCES FROM DATABASE');
    console.log('========================================\n');

    const users = await User.find({}).select('email firstName lastName wallet');
    
    console.log(`Found ${users.length} users\n`);
    console.log('---------------------------------------------------');
    console.log('USER                              | USDC BALANCE | RESERVED  | AVAILABLE | WALLET ADDRESS');
    console.log('---------------------------------------------------');

    for (const user of users) {
      const usdcAsset = user.wallet?.hostfiWalletAssets?.find(a => a.currency === 'USDC');
      
      if (usdcAsset) {
        const balance = usdcAsset.balance || 0;
        const reserved = usdcAsset.reservedBalance || 0;
        const available = balance - reserved;
        const address = usdcAsset.colAddress || user.wallet?.address || 'N/A';
        
        const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
        const email = user.email.length > 25 ? user.email.substring(0, 22) + '...' : user.email;
        
        console.log(
          `${email.padEnd(33)} | ${balance.toFixed(6).padStart(12)} | ${reserved.toFixed(6).padStart(9)} | ${available.toFixed(6).padStart(9)} | ${address}`
        );
      }
    }

    console.log('---------------------------------------------------');
    console.log('\nNOTE: Available = Balance - ReservedBalance');
    console.log('Only "Available" amount can be withdrawn!');
    console.log('\nKey users:');
    
    // Show detailed info for key users
    const japhet = await User.findOne({ email: 'japhetjohnk@gmail.com' });
    if (japhet) {
      const usdc = japhet.wallet?.hostfiWalletAssets?.find(a => a.currency === 'USDC');
      console.log(`\n✅ japhetjohnk@gmail.com:`);
      console.log(`   Balance: ${usdc?.balance || 0} USDC`);
      console.log(`   Reserved: ${usdc?.reservedBalance || 0} USDC`);
      console.log(`   Available: ${(usdc?.balance || 0) - (usdc?.reservedBalance || 0)} USDC`);
      console.log(`   Address: ${usdc?.colAddress || 'N/A'}`);
    }

    const oonawa = await User.findOne({ email: 'oonawa66@gmail.com' });
    if (oonawa) {
      const usdc = oonawa.wallet?.hostfiWalletAssets?.find(a => a.currency === 'USDC');
      console.log(`\n✅ oonawa66@gmail.com:`);
      console.log(`   Balance: ${usdc?.balance || 0} USDC`);
      console.log(`   Reserved: ${usdc?.reservedBalance || 0} USDC`);
      console.log(`   Available: ${(usdc?.balance || 0) - (usdc?.reservedBalance || 0)} USDC`);
      console.log(`   Address: ${usdc?.colAddress || 'N/A'}`);
    }

    const ebuka = await User.findOne({ email: 'ebukaesiobu@gmail.com' });
    if (ebuka) {
      const usdc = ebuka.wallet?.hostfiWalletAssets?.find(a => a.currency === 'USDC');
      console.log(`\n✅ ebukaesiobu@gmail.com:`);
      console.log(`   Balance: ${usdc?.balance || 0} USDC`);
      console.log(`   Reserved: ${usdc?.reservedBalance || 0} USDC`);
      console.log(`   Available: ${(usdc?.balance || 0) - (usdc?.reservedBalance || 0)} USDC`);
      console.log(`   Address: ${usdc?.colAddress || 'N/A'}`);
    }

    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

showBalances();
