#!/usr/bin/env node
/**
 * Get actual HostFi B2B wallet balance via API
 * Run: node scripts/get-hostfi-wallet-balance.js
 */

require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const User = require('../src/models/User');

const HOSTFI_API_URL = process.env.HOSTFI_API_URL || 'https://api.hostfi.io';
const HOSTFI_CLIENT_ID = process.env.HOSTFI_CLIENT_ID;
const HOSTFI_CLIENT_SECRET = process.env.HOSTFI_CLIENT_SECRET;

async function getHostFiToken() {
  if (!HOSTFI_CLIENT_ID || !HOSTFI_CLIENT_SECRET) {
    throw new Error('HOSTFI_CLIENT_ID or HOSTFI_CLIENT_SECRET not set in environment');
  }
  
  try {
    console.log('Getting HostFi token...');
    console.log(`Client ID: ${HOSTFI_CLIENT_ID.substring(0, 10)}...`);
    
    const response = await axios.post(`${HOSTFI_API_URL}/v1/auth/token`, {
      clientId: HOSTFI_CLIENT_ID,
      clientSecret: HOSTFI_CLIENT_SECRET
    });
    
    const token = response.data.access_token || response.data.token;
    console.log('✅ Token obtained\n');
    return token;
  } catch (error) {
    console.error('❌ Failed to get HostFi token:', error.response?.data || error.message);
    throw error;
  }
}

async function getWalletBalance() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myartelab');
    
    console.log('========================================');
    console.log('HOSTFI B2B WALLET BALANCE CHECK');
    console.log('========================================\n');

    // Get japhet's details
    const japhet = await User.findOne({ email: 'japhetjohnk@gmail.com' });
    if (!japhet) {
      console.error('❌ japhetjohnk@gmail.com not found');
      process.exit(1);
    }

    const usdcAsset = japhet.wallet?.hostfiWalletAssets?.find(a => a.currency === 'USDC');
    if (!usdcAsset) {
      console.error('❌ USDC asset not found');
      process.exit(1);
    }

    console.log('User: japhetjohnk@gmail.com');
    console.log(`Asset ID: ${usdcAsset.assetId}`);
    console.log(`Collection Address: ${usdcAsset.colAddress || 'N/A'}`);
    console.log(`Network: ${usdcAsset.colNetwork || 'SOL'}`);
    console.log(`DB Balance: ${usdcAsset.balance} USDC\n`);

    // Get HostFi token
    const token = await getHostFiToken();

    // Method 1: Get asset details
    console.log('========================================');
    console.log('METHOD 1: Get Asset Details');
    console.log('========================================');
    
    try {
      const assetResponse = await axios.get(
        `${HOSTFI_API_URL}/v1/assets/${usdcAsset.assetId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      console.log('Asset Details:');
      console.log(JSON.stringify(assetResponse.data, null, 2));
    } catch (e) {
      console.log(`❌ Error: ${e.response?.status} - ${e.response?.data?.message || e.message}`);
    }

    // Method 2: Get asset address details (this might have balance)
    console.log('\n========================================');
    console.log('METHOD 2: Get Asset Address Details');
    console.log('========================================');
    
    try {
      const addressResponse = await axios.get(
        `${HOSTFI_API_URL}/v1/assets/${usdcAsset.assetId}/address`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      console.log('Address Details:');
      console.log(JSON.stringify(addressResponse.data, null, 2));
    } catch (e) {
      console.log(`❌ Error: ${e.response?.status} - ${e.response?.data?.message || e.message}`);
    }

    // Method 3: Get transactions (to see recent activity)
    console.log('\n========================================');
    console.log('METHOD 3: Get Recent Transactions');
    console.log('========================================');
    
    try {
      const txResponse = await axios.get(
        `${HOSTFI_API_URL}/v1/assets/${usdcAsset.assetId}/transactions`,
        { 
          headers: { 'Authorization': `Bearer ${token}` },
          params: { limit: 10 }
        }
      );
      console.log('Transactions:');
      console.log(JSON.stringify(txResponse.data, null, 2));
    } catch (e) {
      console.log(`❌ Error: ${e.response?.status} - ${e.response?.data?.message || e.message}`);
    }

    // Method 4: Check payout transactions
    console.log('\n========================================');
    console.log('METHOD 4: Get Payout Transactions');
    console.log('========================================');
    
    try {
      const payoutResponse = await axios.get(
        `${HOSTFI_API_URL}/v1/payout/transactions`,
        { 
          headers: { 'Authorization': `Bearer ${token}` },
          params: { 
            assetId: usdcAsset.assetId,
            limit: 10 
          }
        }
      );
      console.log('Payout Transactions:');
      console.log(JSON.stringify(payoutResponse.data, null, 2));
    } catch (e) {
      console.log(`❌ Error: ${e.response?.status} - ${e.response?.data?.message || e.message}`);
    }

    // Method 5: Get collection transactions
    console.log('\n========================================');
    console.log('METHOD 5: Get Collection Transactions');
    console.log('========================================');
    
    try {
      const collectionResponse = await axios.get(
        `${HOSTFI_API_URL}/v1/collections/transactions`,
        { 
          headers: { 'Authorization': `Bearer ${token}` },
          params: { 
            assetId: usdcAsset.assetId,
            limit: 10 
          }
        }
      );
      console.log('Collection Transactions:');
      console.log(JSON.stringify(collectionResponse.data, null, 2));
    } catch (e) {
      console.log(`❌ Error: ${e.response?.status} - ${e.response?.data?.message || e.message}`);
    }

    // Summary
    console.log('\n========================================');
    console.log('SUMMARY');
    console.log('========================================');
    console.log(`Database shows: ${usdcAsset.balance} USDC`);
    console.log(`HostFi says available: 0.731769 USDC (from payout error)`);
    console.log(`Missing: ~${(usdcAsset.balance - 0.731769).toFixed(6)} USDC`);
    console.log('\nPossible causes:');
    console.log('1. Deposit recorded in DB but not confirmed by HostFi');
    console.log('2. Withdrawal made from HostFi but not recorded in DB');
    console.log('3. Funds stuck in pending status');

    await mongoose.disconnect();
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

getWalletBalance();
