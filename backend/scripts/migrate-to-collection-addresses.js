#!/usr/bin/env node
/**
 * Migrate users to unique collection addresses
 * Each user gets their own deposit address tied to shared USDC asset
 * Skip: japhetjohnk@gmail.com (already has correct setup)
 * Run: node scripts/migrate-to-collection-addresses.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const hostfiService = require('../src/services/hostfiService');

async function migrateToCollectionAddresses() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myartelab');
    console.log('Connected to MongoDB\n');

    // Get shared USDC asset first
    console.log('Fetching shared USDC asset...');
    const walletAssets = await hostfiService.getUserWallets();
    const sharedUsdcAsset = walletAssets.find(a => 
      (a.currency?.code || a.currency) === 'USDC'
    );
    
    if (!sharedUsdcAsset) {
      throw new Error('No shared USDC asset found');
    }
    
    console.log(`Shared USDC Asset: ${sharedUsdcAsset.id}\n`);

    // Get all users except japhetjohnk@gmail.com
    const users = await User.find({
      email: { $ne: 'japhetjohnk@gmail.com' }
    });

    console.log(`Migrating ${users.length} users to unique collection addresses\n`);
    console.log('========================================');

    for (const user of users) {
      console.log(`\nProcessing: ${user.email}`);
      
      try {
        // Check if user already has a collection address
        const existingUsdc = user.wallet?.hostfiWalletAssets?.find(a => a.currency === 'USDC');
        
        if (existingUsdc?.colAddress && existingUsdc?.colCustomId === user._id.toString()) {
          console.log(`  ✓ Already has unique collection address: ${existingUsdc.colAddress}`);
          continue;
        }

        // Create unique collection address for this user
        console.log(`  Creating collection address...`);
        const collectionAddress = await hostfiService.createCryptoCollectionAddress({
          assetId: sharedUsdcAsset.id,
          currency: 'USDC',
          network: 'SOL',
          customId: user._id.toString()
        });

        console.log(`  ✓ Created: ${collectionAddress.address}`);
        console.log(`  Reference: ${collectionAddress.id}`);

        // Update user's wallet
        if (!user.wallet) user.wallet = {};
        if (!user.wallet.hostfiWalletAssets) user.wallet.hostfiWalletAssets = [];
        
        // Remove old USDC entry if exists
        user.wallet.hostfiWalletAssets = user.wallet.hostfiWalletAssets.filter(
          a => a.currency !== 'USDC'
        );
        
        // Add new USDC entry with shared assetId but unique collection address
        user.wallet.hostfiWalletAssets.push({
          assetId: sharedUsdcAsset.id, // Shared business asset
          currency: 'USDC',
          assetType: 'CRYPTO',
          colAddress: collectionAddress.address, // User's unique deposit address
          colReference: collectionAddress.id,
          colNetwork: 'SOL',
          colCustomId: user._id.toString(),
          balance: existingUsdc?.balance || 0, // Preserve existing balance
          reservedBalance: 0,
          lastSynced: new Date()
        });

        await user.save({ validateBeforeSave: false });
        console.log(`  ✅ Updated user wallet\n`);

      } catch (err) {
        console.error(`  ❌ Failed:`, err.message);
        if (err.response?.data) {
          console.error(`     HostFi:`, JSON.stringify(err.response.data, null, 2));
        }
        // Continue with next user
      }
    }

    console.log('========================================');
    console.log('\n✅ Migration complete!');
    console.log('\nSummary:');
    console.log('- Each user now has a unique USDC collection address');
    console.log('- All addresses tied to shared asset:', sharedUsdcAsset.id);
    console.log('- Deposits will be tracked per-user via customId');
    console.log('- japhetjohnk@gmail.com was skipped (unchanged)');

    await mongoose.disconnect();

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

console.log('⚠️  This will create unique collection addresses for all users except japhetjohnk@gmail.com');
console.log('Press Ctrl+C to cancel, or wait 5 seconds...\n');

setTimeout(() => migrateToCollectionAddresses(), 5000);
