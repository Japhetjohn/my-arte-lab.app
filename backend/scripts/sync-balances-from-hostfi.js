#!/usr/bin/env node
/**
 * Sync all user balances from HostFi API
 * Run: node scripts/sync-balances-from-hostfi.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const hostfiBalanceService = require('../src/services/hostfiBalanceService');

async function syncBalances() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myartelab');
    
    console.log('========================================');
    console.log('SYNC BALANCES FROM HOSTFI');
    console.log('========================================\n');

    console.log('Fetching balances from HostFi API...\n');
    
    const results = await hostfiBalanceService.syncAllUserBalances();
    
    console.log(`Synced ${results.length} users\n`);
    
    console.log('Results:');
    console.log('---------------------------------------------------');
    console.log('USER                    | STATUS | BALANCE');
    console.log('---------------------------------------------------');
    
    for (const result of results) {
      const email = result.email?.padEnd(23) || 'Unknown';
      const status = result.success ? '✅ OK' : '❌ FAIL';
      
      if (result.success && result.assets) {
        const usdcAsset = result.assets.find(a => a.currency === 'USDC');
        const balance = usdcAsset ? `${usdcAsset.balance} USDC` : 'N/A';
        console.log(`${email} | ${status}   | ${balance}`);
      } else {
        console.log(`${email} | ${status} | ${result.error || 'Unknown error'}`);
      }
    }
    
    console.log('---------------------------------------------------\n');
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    console.log(`Success: ${successCount}`);
    console.log(`Failed: ${failCount}\n`);

    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

syncBalances();
