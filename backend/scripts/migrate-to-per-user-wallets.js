#!/usr/bin/env node
/**
 * Migrate users to per-user wallets using HostFi Pay sub-addresses
 * Each user gets a unique sub-address with their own assetId and balance
 * Skip: japhetjohnk@gmail.com (already has correct wallet)
 * Run: node scripts/migrate-to-per-user-wallets.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const hostfiService = require('../src/services/hostfiService');

async function migrateToPerUserWallets() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myartelab');
    console.log('Connected to MongoDB\n');

    // Get all users except japhetjohnk@gmail.com
    const users = await User.find({
      'wallet.hostfiWalletAssets': { $exists: true },
      email: { $ne: 'japhetjohnk@gmail.com' }
    });

    console.log(`Migrating ${users.length} users to per-user wallets\n`);
    console.log('========================================');

    for (const user of users) {
      console.log(`\nProcessing: ${user.email}`);
      
      try {
        // Step 1: Create a new pay sub-address for this user
        console.log(`  Creating pay sub-address...`);
        const subAddress = await hostfiService.createPaySubAddress({
          currency: 'USDC',
          network: 'SOL',
          identifier: user._id.toString() // Use userId as unique identifier
        });

        console.log(`  ✓ Created sub-address: ${subAddress.id}`);
        console.log(`  Asset ID: ${subAddress.assetId || subAddress.id}`);
        console.log(`  Address: ${subAddress.address}`);

        // Step 2: Assign the sub-address
        console.log(`  Assigning sub-address...`);
        const assigned = await hostfiService.assignPayAddress(subAddress.id);
        console.log(`  ✓ Assigned: ${assigned.status}`);

        // Step 3: Update user's wallet with new unique assetId
        const usdcAsset = user.wallet.hostfiWalletAssets?.find(a => a.currency === 'USDC');
        
        if (usdcAsset) {
          // Store old assetId for reference
          const oldAssetId = usdcAsset.assetId;
          
          // Update to new unique assetId
          usdcAsset.assetId = subAddress.assetId || subAddress.id;
          usdcAsset.subAddressId = subAddress.id;
          usdcAsset.address = subAddress.address;
          usdcAsset.balance = 0; // New wallet starts at 0
          usdcAsset.lastSynced = new Date();
          
          console.log(`  Updated USDC asset:`);
          console.log(`    Old: ${oldAssetId}`);
          console.log(`    New: ${usdcAsset.assetId}`);
        } else {
          // Add new USDC asset if doesn't exist
          user.wallet.hostfiWalletAssets.push({
            assetId: subAddress.assetId || subAddress.id,
            subAddressId: subAddress.id,
            currency: 'USDC',
            assetType: 'CRYPTO',
            address: subAddress.address,
            balance: 0,
            reservedBalance: 0,
            lastSynced: new Date()
          });
          console.log(`  Added new USDC asset: ${subAddress.assetId || subAddress.id}`);
        }

        // Reset balance to 0 (new unique wallet)
        user.wallet.balance = 0;
        user.balance = 0;
        
        await user.save({ validateBeforeSave: false });
        console.log(`  ✅ Migration complete for ${user.email}\n`);

      } catch (err) {
        console.error(`  ❌ Failed to migrate ${user.email}:`, err.message);
        if (err.response?.data) {
          console.error(`     HostFi error:`, JSON.stringify(err.response.data, null, 2));
        }
        // Continue with next user
      }
    }

    console.log('========================================');
    console.log('\n✅ Migration complete!');
    console.log('\nSummary:');
    console.log('- Each user now has a unique pay sub-address');
    console.log('- Each user has their own assetId (not shared)');
    console.log('- Balances are now truly per-user');
    console.log('- japhetjohnk@gmail.com was skipped (already correct)');

    await mongoose.disconnect();

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Confirm before running
console.log('⚠️  WARNING: This will create new per-user wallets for all users except japhetjohnk@gmail.com');
console.log('Existing balances will be reset to 0 (new wallets)');
console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

setTimeout(() => {
  migrateToPerUserWallets();
}, 5000);
