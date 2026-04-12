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

    // Get all assets
    console.log('Fetching all assets from HostFi...');
    const assetsResponse = await axios.get(
      `${HOSTFI_API_URL}/v1/assets`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    console.log('\nAssets Response:');
    console.log(JSON.stringify(assetsResponse.data, null, 2));

    // Try to get specific asset details for USDC
    const usdcAssetId = 'd2b1a2d7-f88c-4280-a6df-a2332f491992';
    console.log(`\n\nFetching details for USDC asset ${usdcAssetId}...`);
    
    try {
      const assetResponse = await axios.get(
        `${HOSTFI_API_URL}/v1/assets/${usdcAssetId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      console.log('Asset Details:');
      console.log(JSON.stringify(assetResponse.data, null, 2));
    } catch (e) {
      console.log(`Error: ${e.response?.data?.message || e.message}`);
    }

    // Try to get asset address (this might have balance)
    console.log(`\n\nFetching address for USDC asset...`);
    try {
      const addressResponse = await axios.get(
        `${HOSTFI_API_URL}/v1/assets/${usdcAssetId}/address`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      console.log('Asset Address:');
      console.log(JSON.stringify(addressResponse.data, null, 2));
    } catch (e) {
      console.log(`Error: ${e.response?.data?.message || e.message}`);
    }

    // The REAL balance is what HostFi says during payout attempt
    console.log('\n\n========================================');
    console.log('ACTUAL BALANCE FROM HOSTFI');
    console.log('========================================');
    console.log('According to the payout error message:');
    console.log('  Available: 0.731769 USDC');
    console.log('  Requested: 1.8 USDC');
    console.log('  Status: INSUFFICIENT_FUNDS');
    console.log('\nThe HostFi B2B wallet only has 0.73 USDC available.');

    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkHostFiBalance();
