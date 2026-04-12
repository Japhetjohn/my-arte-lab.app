#!/usr/bin/env node
/**
 * Test HostFi API to see if it's returning per-asset balances or shared data
 * Run: node scripts/test-hostfi-api.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const hostfiService = require('../src/services/hostfiService');

async function testHostFi() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myartelab');
    console.log('Connected to MongoDB\n');

    // Get first 3 users with USDC wallets
    const users = await User.find({
      'wallet.hostfiWalletAssets': { $exists: true }
    }).limit(3);

    console.log('Testing HostFi API for different asset IDs:\n');
    console.log('========================================');

    for (const user of users) {
      const usdcAsset = user.wallet.hostfiWalletAssets?.find(a => a.currency === 'USDC');
      
      if (!usdcAsset?.assetId) {
        console.log(`\n${user.email}: No USDC asset`);
        continue;
      }

      console.log(`\nUser: ${user.email}`);
      console.log(`Asset ID: ${usdcAsset.assetId}`);
      
      try {
        // Test getWalletAsset endpoint
        const assetDetails = await hostfiService.getWalletAsset(usdcAsset.assetId);
        console.log(`HostFi Response:`);
        console.log(`  Balance: ${assetDetails.balance}`);
        console.log(`  Currency: ${assetDetails.currency?.code || assetDetails.currency}`);
        console.log(`  Type: ${assetDetails.type}`);
        console.log(`  ID in response: ${assetDetails.id}`);
        
        if (assetDetails.id !== usdcAsset.assetId) {
          console.log(`  ⚠️ WARNING: Response ID doesn't match request ID!`);
        }
        
      } catch (err) {
        console.log(`Error: ${err.message}`);
      }
    }

    // Also test getUserWallets to see what it returns
    console.log('\n========================================');
    console.log('\nTesting getUserWallets (all assets):');
    try {
      const allAssets = await hostfiService.getUserWallets();
      console.log(`Total assets returned: ${allAssets.length}`);
      
      const usdcAssets = allAssets.filter(a => 
        (a.currency?.code || a.currency) === 'USDC'
      );
      console.log(`USDC assets: ${usdcAssets.length}`);
      
      usdcAssets.forEach((asset, i) => {
        console.log(`  ${i + 1}. ID: ${asset.id}, Balance: ${asset.balance}`);
      });
    } catch (err) {
      console.log(`Error: ${err.message}`);
    }

    await mongoose.disconnect();

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testHostFi();
