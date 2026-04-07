#!/usr/bin/env node
/**
 * Swap NGN back to USDC
 * Usage: node scripts/swap-ngn-to-usdc.js <ngn_amount>
 * Example: node scripts/swap-ngn-to-usdc.js 1553.68
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
const USER_ID = '6983ea1691b5040eb0fb0276';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║     SWAP NGN TO USDC                                     ║
╠══════════════════════════════════════════════════════════╣
║  Usage: node scripts/swap-ngn-to-usdc.js <amount>        ║
║                                                          ║
║  Example:                                                ║
║    node scripts/swap-ngn-to-usdc.js 1553.68              ║
╚══════════════════════════════════════════════════════════╝
`);
    process.exit(1);
  }

  const ngnAmount = parseFloat(args[0]);
  
  if (isNaN(ngnAmount) || ngnAmount <= 0) {
    console.error('❌ Invalid amount. Please enter a positive number.');
    process.exit(1);
  }

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     SWAP NGN TO USDC                                     ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  NGN Amount:   ₦${ngnAmount.toString().padEnd(38)} ║`);
  console.log('╚══════════════════════════════════════════════════════════╝');

  try {
    // Connect to MongoDB
    console.log('\n[1/4] Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('      ✓ Connected');

    // Load services
    console.log('[2/4] Loading services...');
    const hostfiService = require('../src/services/hostfiService');
    console.log('      ✓ Services loaded');

    // Get user wallets
    console.log('[3/4] Fetching wallets...');
    const wallets = await hostfiService.getUserWallets();
    
    const ngnWallet = wallets.find(w => {
      const code = (w.currency?.code || w.currency || '').toUpperCase();
      return code === 'NGN';
    });
    
    const usdcWallet = wallets.find(w => {
      const code = (w.currency?.code || w.currency || '').toUpperCase();
      return code === 'USDC';
    });

    if (!ngnWallet) {
      console.error('      ✗ No NGN wallet found!');
      process.exit(1);
    }
    
    if (!usdcWallet) {
      console.error('      ✗ No USDC wallet found!');
      process.exit(1);
    }

    const ngnBalance = parseFloat(ngnWallet.balance || 0);
    console.log(`      ✓ NGN Balance: ₦${ngnBalance.toFixed(2)}`);
    console.log(`      ✓ USDC Wallet: ${usdcWallet.id}`);

    if (ngnBalance < ngnAmount) {
      console.error(`\n❌ INSUFFICIENT NGN!`);
      console.error(`   Available: ₦${ngnBalance.toFixed(2)}`);
      console.error(`   Requested: ₦${ngnAmount.toFixed(2)}`);
      console.error(`\n   Maximum you can swap: ₦${ngnBalance.toFixed(2)}`);
      process.exit(1);
    }

    // Confirm
    console.log('\n' + '⚠'.repeat(30));
    console.log('⚠️  READY TO SWAP');
    console.log('⚠'.repeat(30));
    console.log(`   This will:`);
    console.log(`   Swap ${ngnAmount} NGN → USDC`);
    console.log('\n   Waiting 5 seconds... (Ctrl+C to cancel)');
    
    for (let i = 5; i > 0; i--) {
      process.stdout.write(`   ${i}... `);
      await new Promise(r => setTimeout(r, 1000));
    }
    console.log('\n');

    // Perform swap
    const clientReference = `SWAP-NGN-USDC-${Date.now()}`;
    console.log(`[4/4] Initiating swap...`);
    console.log(`      Reference: ${clientReference}`);
    
    const swapResult = await hostfiService.swapAssets({
      source: { 
        currency: 'NGN', 
        assetId: ngnWallet.id 
      },
      target: { 
        currency: 'USDC', 
        assetId: usdcWallet.id 
      },
      amount: { 
        value: ngnAmount, 
        currency: 'NGN' 
      },
      category: 'SWAP'
    });

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║  ✅ SWAP SUCCESSFUL!                                     ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  Reference:    ${clientReference.padEnd(38)} ║`);
    console.log(`║  NGN Swapped:  ₦${ngnAmount.toString().padEnd(37)} ║`);
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('\nYour USDC will be available in your wallet shortly.');
    console.log('Check your wallet to see the new USDC balance.');

  } catch (error) {
    console.error('\n❌ SWAP FAILED!');
    console.error('Error:', error.message);
    if (error.hostfiError) {
      console.error('HostFi:', JSON.stringify(error.hostfiError, null, 2));
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n[DB] Disconnected');
  }
}

main();
