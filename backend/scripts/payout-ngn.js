#!/usr/bin/env node
/**
 * Manual NGN Payout Script
 * Use this to payout existing NGN balance without swapping
 * 
 * Usage: node scripts/payout-ngn.js <user_id> <amount_in_ngn> <account_number> <bank_id> <account_name>
 * Example: node scripts/payout-ngn.js 6983ea1691b5040eb0fb0276 4500 7031632438 NG::100004 "John Doe"
 */

require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');

// Config
const HOSTFI_API_URL = process.env.HOSTFI_API_URL || 'https://api.hostfi.co';
const HOSTFI_CLIENT_ID = process.env.HOSTFI_CLIENT_ID;
const HOSTFI_SECRET_KEY = process.env.HOSTFI_SECRET_KEY;
const MONGODB_URI = process.env.MONGODB_URI;

// Bank mapping (common Nigerian banks)
const BANK_NAMES = {
  'NG::100004': 'Opay',
  'NG::000014': 'Access Bank',
  'NG::000003': 'First Bank',
  'NG::000016': 'GTBank',
  'NG::000013': 'UBA',
  'NG::000012': 'Zenith Bank',
  'NG::000008': 'Union Bank',
  'NG::000011': 'FCMB',
  'NG::000015': 'Polaris Bank',
  'NG::000017': 'Fidelity Bank',
  'NG::000018': 'Wema Bank',
  'NG::000021': 'Stanbic IBTC',
  'NG::000033': 'Kuda Bank',
  'NG::000035': 'PalmPay'
};

let accessToken = null;
let tokenExpiry = null;

async function getHostFiToken() {
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }

  console.log('[HostFi] Fetching new access token...');
  
  try {
    const response = await axios.post(`${HOSTFI_API_URL}/v1/auth/token`, {
      clientId: HOSTFI_CLIENT_ID,
      secretKey: HOSTFI_SECRET_KEY
    });

    accessToken = response.data.accessToken;
    // Set expiry to 50 minutes (tokens are valid for 1 hour)
    tokenExpiry = Date.now() + (50 * 60 * 1000);
    
    console.log('[HostFi] Token obtained successfully');
    return accessToken;
  } catch (error) {
    console.error('[HostFi] Failed to get token:', error.response?.data || error.message);
    throw error;
  }
}

async function makeHostFiRequest(method, endpoint, data = null, params = null) {
  const token = await getHostFiToken();
  
  try {
    const response = await axios({
      method,
      url: `${HOSTFI_API_URL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data,
      params
    });
    
    return response.data;
  } catch (error) {
    console.error(`[HostFi] API Error ${method} ${endpoint}:`, 
      error.response?.status, 
      error.response?.data || error.message
    );
    throw error;
  }
}

async function getUserWallets() {
  return await makeHostFiRequest('GET', '/v1/wallets');
}

async function initiatePayout(ngnAssetId, amount, recipient, clientReference) {
  const payload = {
    assetId: ngnAssetId,
    clientReference,
    methodId: 'BANK_TRANSFER',
    amount: amount,
    currency: 'NGN',
    recipient: {
      type: 'BANK',
      method: 'BANK_TRANSFER',
      currency: 'NGN',
      accountNumber: recipient.accountNumber,
      accountName: recipient.accountName,
      bankId: recipient.bankId,
      bankName: recipient.bankName,
      country: 'NG'
    },
    memo: `Manual payout ${clientReference}`
  };

  console.log('[Payout] Request payload:', JSON.stringify(payload, null, 2));
  
  return await makeHostFiRequest('POST', '/v1/payout/transactions', payload);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 5) {
    console.log(`
Usage: node scripts/payout-ngn.js <user_id> <amount_in_ngn> <account_number> <bank_id> <account_name>

Example:
  node scripts/payout-ngn.js 6983ea1691b5040eb0fb0276 4500 7031632438 NG::100004 "John Doe"

Common Nigerian Bank IDs:
  NG::100004 - Opay
  NG::000014 - Access Bank
  NG::000016 - GTBank
  NG::000013 - UBA
  NG::000012 - Zenith Bank
  NG::000003 - First Bank
  NG::000033 - Kuda Bank
    `);
    process.exit(1);
  }

  const [userId, amountNgn, accountNumber, bankId, ...accountNameParts] = args;
  const accountName = accountNameParts.join(' ');
  
  console.log('='.repeat(60));
  console.log('MANUAL NGN PAYOUT SCRIPT');
  console.log('='.repeat(60));
  console.log(`User ID: ${userId}`);
  console.log(`Amount: ₦${amountNgn} NGN`);
  console.log(`Account: ${accountNumber}`);
  console.log(`Bank: ${BANK_NAMES[bankId] || bankId} (${bankId})`);
  console.log(`Account Name: ${accountName}`);
  console.log('='.repeat(60));

  try {
    // Connect to MongoDB
    console.log('\n[DB] Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('[DB] Connected');

    // Get wallets from HostFi
    console.log('\n[HostFi] Fetching wallets...');
    const wallets = await getUserWallets();
    
    // Find NGN wallet
    const ngnWallet = wallets.find(w => {
      const code = (w.currency?.code || w.currency || '').toUpperCase();
      return code === 'NGN';
    });

    if (!ngnWallet) {
      console.error('\n❌ ERROR: No NGN wallet found!');
      console.log('Available wallets:', wallets.map(w => ({
        currency: w.currency?.code || w.currency,
        balance: w.balance,
        id: w.id
      })));
      process.exit(1);
    }

    console.log('\n✓ NGN Wallet found:');
    console.log(`  Asset ID: ${ngnWallet.id}`);
    console.log(`  Balance: ₦${ngnWallet.balance} NGN`);
    
    if (parseFloat(ngnWallet.balance) < parseFloat(amountNgn)) {
      console.error(`\n❌ ERROR: Insufficient NGN balance!`);
      console.error(`  Available: ₦${ngnWallet.balance} NGN`);
      console.error(`  Requested: ₦${amountNgn} NGN`);
      process.exit(1);
    }

    // Confirm with user
    console.log('\n' + '!'.repeat(60));
    console.log('⚠️  READY TO INITIATE PAYOUT');
    console.log('!'.repeat(60));
    console.log(`This will payout ₦${amountNgn} NGN from existing balance.`);
    console.log(`No USDC swap needed!`);
    console.log('\nPress Ctrl+C to cancel, or wait 3 seconds to proceed...');
    
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Initiate payout
    const clientReference = `MANUAL-NGN-${Date.now()}`;
    console.log(`\n[Payout] Initiating payout with reference: ${clientReference}`);
    
    const result = await initiatePayout(
      ngnWallet.id,
      parseFloat(amountNgn),
      {
        accountNumber,
        accountName,
        bankId,
        bankName: BANK_NAMES[bankId] || bankId
      },
      clientReference
    );

    console.log('\n' + '='.repeat(60));
    console.log('✅ PAYOUT INITIATED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('Response:', JSON.stringify(result, null, 2));
    console.log('\nCheck status in HostFi dashboard or with reference:', clientReference);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.response?.data) {
      console.error('HostFi Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n[DB] Disconnected');
  }
}

main();
