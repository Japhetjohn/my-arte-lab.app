#!/usr/bin/env node
/**
 * Check real HostFi B2B wallet balance
 * Run: node scripts/check-hostfi-balance.js
 */

require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const User = require('../src/models/User');

const HOSTFI_API_URL = process.env.HOSTFI_API_URL || 'https://api.hostfi.io';
const HOSTFI_CLIENT_ID = process.env.HOSTFI_CLIENT_ID;
const HOSTFI_CLIENT_SECRET = process.env.HOSTFI_CLIENT_SECRET;

async function getHostFiToken() {
  try {
    const response = await axios.post(`${HOSTFI_API_URL}/v1/auth/token`, {
      clientId: HOSTFI_CLIENT_ID,
      clientSecret: HOSTFI_CLIENT_SECRET
    });
    return response.data.access_token || response.data.token;
  } catch (error) {
    console.error('Failed to get HostFi token:', error.response?.data || error.message);
    throw error;
  }
}

async function checkHostFiBalance() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myartelab');
    
    console.log('========================================');
    console.log('CHECK HOSTFI B2B WALLET BALANCE');
    console.log('========================================\n');

    // Get token
    console.log('Getting HostFi access token...');
    const token = await getHostFiToken();
    console.log('✅ Token obtained\n');

    // Get all users with HostFi assets
    const users = await User.find({ 'wallet.hostfiWalletAssets': { $exists: true, $ne: [] } });
    console.log(`Found ${users.length} users with HostFi assets\n`);

    for (const user of users) {
      console.log(`User: ${user.email} (${user._id})`);
      
      if (!user.wallet?.hostfiWalletAssets?.length) {
        console.log('  No HostFi assets\n');
        continue;
      }

      for (const asset of user.wallet.hostfiWalletAssets) {
        console.log(`  Asset: ${asset.assetId}`);
        console.log(`  Currency: ${asset.currency}`);
        console.log(`  Network: ${asset.network}`);
        
        try {
          // Check balance from HostFi API
          const response = await axios.get(
            `${HOSTFI_API_URL}/v1/wallets/assets/${asset.assetId}/balance`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );
          
          console.log(`  HostFi Balance: ${JSON.stringify(response.data, null, 2)}`);
        } catch (e) {
          console.log(`  ❌ Error checking balance: ${e.response?.data?.message || e.message}`);
          
          // Try alternative endpoint
          try {
            const altResponse = await axios.get(
              `${HOSTFI_API_URL}/v1/wallets/balances?assetId=${asset.assetId}`,
              { headers: { 'Authorization': `Bearer ${token}` } }
            );
            console.log(`  Alternative Balance: ${JSON.stringify(altResponse.data, null, 2)}`);
          } catch (e2) {
            console.log(`  ❌ Alternative also failed: ${e2.response?.data?.message || e2.message}`);
          }
        }
        console.log('');
      }
    }

    // Also try to get all wallet balances
    console.log('\n========================================');
    console.log('TRYING ALL WALLET ENDPOINTS');
    console.log('========================================\n');

    try {
      const walletsResponse = await axios.get(
        `${HOSTFI_API_URL}/v1/wallets`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      console.log('Wallets:', JSON.stringify(walletsResponse.data, null, 2));
    } catch (e) {
      console.log(`Wallets endpoint failed: ${e.response?.data?.message || e.message}`);
    }

    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkHostFiBalance();
