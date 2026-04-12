#!/usr/bin/env node
/**
 * Check HostFi transactions to see where the money went
 * Run: node scripts/check-hostfi-transactions.js
 */

require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Transaction = require('../src/models/Transaction');

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

async function checkTransactions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myartelab');
    
    console.log('========================================');
    console.log('CHECK HOSTFI TRANSACTIONS');
    console.log('========================================\n');

    // Get token
    const token = await getHostFiToken();

    // Get japhet's USDC asset
    const japhet = await User.findOne({ email: 'japhetjohnk@gmail.com' });
    if (!japhet) {
      console.error('Japhet not found');
      process.exit(1);
    }

    const usdcAsset = japhet.wallet?.hostfiWalletAssets?.find(a => a.currency === 'USDC');
    if (!usdcAsset) {
      console.error('USDC asset not found');
      process.exit(1);
    }

    console.log(`User: japhetjohnk@gmail.com`);
    console.log(`Asset ID: ${usdcAsset.assetId}`);
    console.log(`DB Balance: ${usdcAsset.balance} USDC`);
    console.log(`Last Synced: ${usdcAsset.lastSynced}\n`);

    // Get transactions from HostFi
    console.log('Fetching HostFi transactions...\n');
    
    try {
      const response = await axios.get(
        `${HOSTFI_API_URL}/v1/assets/${usdcAsset.assetId}/transactions`,
        { 
          headers: { 'Authorization': `Bearer ${token}` },
          params: { limit: 50 }
        }
      );
      
      console.log('HostFi Transactions:');
      console.log(JSON.stringify(response.data, null, 2));
    } catch (e) {
      console.log(`Error: ${e.response?.data?.message || e.message}`);
      
      // Try alternative endpoint
      try {
        const altResponse = await axios.get(
          `${HOSTFI_API_URL}/v1/payout/transactions`,
          { 
            headers: { 'Authorization': `Bearer ${token}` },
            params: { assetId: usdcAsset.assetId, limit: 50 }
          }
        );
        console.log('\nPayout Transactions:');
        console.log(JSON.stringify(altResponse.data, null, 2));
      } catch (e2) {
        console.log(`Payout endpoint error: ${e2.response?.data?.message || e2.message}`);
      }
    }

    // Also check our database transactions
    console.log('\n\nOur Database Transactions for japhet:');
    const dbTxns = await Transaction.find({ 
      user: japhet._id,
      currency: 'USDC'
    }).sort({ createdAt: -1 }).limit(20);

    let totalCredits = 0;
    let totalDebits = 0;

    for (const tx of dbTxns) {
      const amount = parseFloat(tx.amount) || 0;
      const isCredit = ['deposit', 'earning', 'refund', 'bonus', 'reversal', 'onramp'].includes(tx.type);
      const isDebit = ['withdrawal', 'payment', 'platform_fee', 'offramp'].includes(tx.type);
      
      console.log(`  ${tx.type}: ${isCredit ? '+' : (isDebit ? '-' : '')}${amount} USDC | ${tx.status} | ${tx.createdAt.toISOString().split('T')[0]}`);
      
      if (isCredit && tx.status === 'completed') totalCredits += amount;
      if (isDebit && tx.status === 'completed') totalDebits += amount;
    }

    console.log(`\n  Total Credits: ${totalCredits} USDC`);
    console.log(`  Total Debits:  ${totalDebits} USDC`);
    console.log(`  Calculated Balance: ${totalCredits - totalDebits} USDC`);
    console.log(`  DB Balance: ${usdcAsset.balance} USDC`);
    console.log(`  Difference: ${usdcAsset.balance - (totalCredits - totalDebits)} USDC`);

    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTransactions();
