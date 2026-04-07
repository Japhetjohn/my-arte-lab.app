#!/usr/bin/env node
/**
 * Swap ALL NGN back to USDC (leaving small dust)
 * Usage: node scripts/swap-all-ngn-to-usdc.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     SWAP ALL NGN TO USDC                                 ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  try {
    console.log('\n[1/3] Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('      ✓ Connected');

    console.log('[2/3] Loading services...');
    const hostfiService = require('../src/services/hostfiService');
    console.log('      ✓ Services loaded');

    console.log('[3/3] Fetching wallets...');
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

    if (ngnBalance < 100) {
      console.log('\n⚠️  NGN balance too low to swap (minimum ~100 NGN)');
      console.log('   Your NGN balance will remain as dust.');
      process.exit(0);
    }

    // Leave 1 NGN as dust, swap the rest
    const amountToSwap = Math.floor(ngnBalance - 1);
    
    console.log(`\n💰 Swapping ₦${amountToSwap} NGN → USDC`);
    console.log('   (Leaving 1 NGN as dust)');

    // Confirm
    console.log('\n' + '⚠'.repeat(30));
    console.log('⚠️  READY TO SWAP');
    console.log('⚠'.repeat(30));
    console.log(`   Amount: ₦${amountToSwap} NGN`);
    console.log('\n   Waiting 3 seconds... (Ctrl+C to cancel)');
    
    for (let i = 3; i > 0; i--) {
      process.stdout.write(`   ${i}... `);
      await new Promise(r => setTimeout(r, 1000));
    }
    console.log('\n');

    // Perform swap
    const clientReference = `SWAP-ALL-NGN-${Date.now()}`;
    console.log(`[Swap] Initiating...`);
    console.log(`       Reference: ${clientReference}`);
    
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
        value: amountToSwap, 
        currency: 'NGN' 
      },
      category: 'SWAP'
    });

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║  ✅ SWAP SUCCESSFUL!                                     ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  Reference:    ${clientReference.padEnd(38)} ║`);
    console.log(`║  NGN Swapped:  ₦${amountToSwap.toString().padEnd(37)} ║`);
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('\n✅ All NGN swapped back to USDC!');
    console.log('   You can now try withdrawal again.');

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
