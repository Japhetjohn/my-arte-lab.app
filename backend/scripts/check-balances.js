#!/usr/bin/env node
/**
 * Check all wallet balances
 * Usage: node scripts/check-balances.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

async function main() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected\n');

    const hostfiService = require('../src/services/hostfiService');
    
    console.log('Fetching wallet balances...\n');
    const wallets = await hostfiService.getUserWallets();
    
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║  WALLET BALANCES                                         ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    
    if (!wallets || wallets.length === 0) {
      console.log('║  No wallets found                                        ║');
    } else {
      wallets.forEach(wallet => {
        const currency = wallet.currency?.code || wallet.currency || 'Unknown';
        const balance = parseFloat(wallet.balance || 0).toFixed(4);
        const assetId = wallet.id || wallet.assetId || 'N/A';
        console.log(`║  ${currency.padEnd(10)} │ ${balance.padStart(15)} │ ${assetId.substring(0, 20).padEnd(20)} ║`);
      });
    }
    
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    
    // Show specific NGN and USDC
    const ngnWallet = wallets.find(w => (w.currency?.code || w.currency || '').toUpperCase() === 'NGN');
    const usdcWallet = wallets.find(w => (w.currency?.code || w.currency || '').toUpperCase() === 'USDC');
    
    if (ngnWallet) {
      console.log(`💰 NGN Balance: ₦${parseFloat(ngnWallet.balance || 0).toFixed(2)}`);
      console.log(`   Asset ID: ${ngnWallet.id}`);
    }
    
    if (usdcWallet) {
      console.log(`💰 USDC Balance: ${parseFloat(usdcWallet.balance || 0).toFixed(6)} USDC`);
      console.log(`   Asset ID: ${usdcWallet.id}`);
    }
    
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('[DB] Disconnected');
  }
}

main();
