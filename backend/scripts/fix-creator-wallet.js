#!/usr/bin/env node
/**
 * Fix creator wallet address
 * Run: node scripts/fix-creator-wallet.js oonawa66@gmail.com
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const tsaraService = require('../src/services/tsaraService');

async function fixCreatorWallet() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myartelab');
    console.log('========================================');
    console.log('FIX CREATOR WALLET');
    console.log('========================================\n');

    const email = process.argv[2] || 'oonawa66@gmail.com';
    const user = await User.findOne({ email });

    if (!user) {
      console.error('❌ User not found:', email);
      process.exit(1);
    }

    console.log(`User: ${user.email}`);
    console.log(`Current wallet.address: ${user.wallet?.address || 'NOT SET'}`);
    console.log(`Current tsaraAddress: ${user.wallet?.tsaraAddress || 'NOT SET'}`);

    // Check if they have a USDC collection address
    const usdcAsset = user.wallet?.hostfiWalletAssets?.find(a => a.currency === 'USDC');
    console.log(`Collection Address: ${usdcAsset?.colAddress || 'NOT SET'}`);

    // If no wallet address, create one
    if (!user.wallet?.address) {
      console.log('\nCreating wallet...');
      
      // Try Tsara first
      try {
        const tsaraWallet = await tsaraService.createWallet(
          `${user.firstName} ${user.lastName}`,
          `tsara_${user._id}`,
          { userId: user._id }
        );

        if (tsaraWallet.success) {
          if (!user.wallet) user.wallet = {};
          user.wallet.tsaraWalletId = tsaraWallet.data.id;
          user.wallet.tsaraAddress = tsaraWallet.data.primary_address;
          user.wallet.address = tsaraWallet.data.primary_address;
          user.wallet.network = 'Solana';
          
          await user.save({ validateBeforeSave: false });
          console.log('✅ Created Tsara wallet:', tsaraWallet.data.primary_address);
        }
      } catch (err) {
        console.error('❌ Failed to create Tsara wallet:', err.message);
        
        // Fallback: use collection address if available
        if (usdcAsset?.colAddress) {
          if (!user.wallet) user.wallet = {};
          user.wallet.address = usdcAsset.colAddress;
          user.wallet.network = 'Solana';
          await user.save({ validateBeforeSave: false });
          console.log('✅ Using collection address as wallet:', usdcAsset.colAddress);
        }
      }
    } else {
      console.log('\n✅ Wallet already exists:', user.wallet.address);
    }

    // Verify
    const updatedUser = await User.findById(user._id);
    console.log('\n========================================');
    console.log('VERIFICATION');
    console.log('========================================');
    console.log(`wallet.address: ${updatedUser.wallet?.address || 'NOT SET'}`);
    console.log(`wallet.network: ${updatedUser.wallet?.network || 'NOT SET'}`);
    console.log('\n✅ Done!');

    await mongoose.disconnect();

  } catch (error) {
    console.error('Fatal Error:', error.message);
    process.exit(1);
  }
}

fixCreatorWallet();
