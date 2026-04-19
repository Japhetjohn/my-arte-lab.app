#!/usr/bin/env node
/**
 * Migration: Create unique collection addresses for all users
 * Run: node scripts/migrate-user-collection-addresses.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const hostfiService = require('../src/services/hostfiService');

const USDC_ASSET_ID = 'd2b1a2d7-f88c-4280-a6df-a2332f491992';

async function migrateAddresses() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myartelab');
    
    console.log('========================================');
    console.log('MIGRATE USER COLLECTION ADDRESSES');
    console.log('========================================\n');

    // Get all users
    const users = await User.find({});
    console.log(`Found ${users.length} users to process\n`);

    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const user of users) {
      console.log(`Processing: ${user.email}`);
      
      // Check if user already has a USDC asset with collection address
      const usdcAsset = user.wallet?.hostfiWalletAssets?.find(a => a.currency === 'USDC');
      
      if (usdcAsset?.colAddress) {
        console.log(`  ✅ Already has address: ${usdcAsset.colAddress}`);
        skipped++;
        console.log('');
        continue;
      }

      try {
        // Create unique collection address for this user
        console.log(`  Creating new collection address...`);
        
        const addressResult = await hostfiService.createCryptoCollectionAddress({
          assetId: USDC_ASSET_ID,
          customId: user._id.toString(), // Use user ID as customId
          network: 'SOL'
        });

        console.log(`  ✅ Created: ${addressResult.address}`);

        // Update user with new address
        if (!user.wallet) {
          user.wallet = {};
        }
        
        if (!user.wallet.hostfiWalletAssets) {
          user.wallet.hostfiWalletAssets = [];
        }

        // Find or create USDC asset
        let asset = user.wallet.hostfiWalletAssets.find(a => a.currency === 'USDC');
        if (!asset) {
          asset = {
            assetId: USDC_ASSET_ID,
            currency: 'USDC',
            assetType: 'CRYPTO',
            balance: 0,
            reservedBalance: 0,
            lastSynced: new Date()
          };
          user.wallet.hostfiWalletAssets.push(asset);
        }

        // Update with collection address
        asset.colAddress = addressResult.address;
        asset.colNetwork = addressResult.network || 'SOL';
        
        // Also set as main wallet address if not set
        if (!user.wallet.address) {
          user.wallet.address = addressResult.address;
          user.wallet.network = 'SOL';
        }

        await user.save();
        console.log(`  ✅ User updated\n`);
        created++;

      } catch (error) {
        console.error(`  ❌ Failed: ${error.message}\n`);
        failed++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('========================================');
    console.log('MIGRATION COMPLETE');
    console.log('========================================');
    console.log(`Total users: ${users.length}`);
    console.log(`Created: ${created}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Failed: ${failed}\n`);

    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

migrateAddresses();
