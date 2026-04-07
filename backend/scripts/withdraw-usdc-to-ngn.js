#!/usr/bin/env node
/**
 * Withdraw USDC to NGN Bank Account
 * Full flow: Swap USDC → NGN → Payout to bank
 * 
 * Usage: node scripts/withdraw-usdc-to-ngn.js <usdc_amount>
 * Example: node scripts/withdraw-usdc-to-ngn.js 1.5
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
const USER_ID = '6983ea1691b5040eb0fb0276';

// Your bank details
const BANK_ID = 'NG::100004';
const BANK_NAME = 'Opay';
const ACCOUNT_NAME = 'John Kuulsinim Japhet';
const ACCOUNT_NUMBER = '7031632438';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║     WITHDRAW USDC TO NGN (Swap + Payout)                 ║
╠══════════════════════════════════════════════════════════╣
║  Usage: node scripts/withdraw-usdc-to-ngn.js <amount>    ║
║                                                          ║
║  Example:                                                ║
║    node scripts/withdraw-usdc-to-ngn.js 1.5              ║
╚══════════════════════════════════════════════════════════╝
`);
    process.exit(1);
  }

  const usdcAmount = parseFloat(args[0]);
  
  if (isNaN(usdcAmount) || usdcAmount <= 0) {
    console.error('❌ Invalid amount. Please enter a positive number.');
    process.exit(1);
  }

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     WITHDRAW USDC TO NGN BANK ACCOUNT                    ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  USDC Amount:   ${usdcAmount.toString().padEnd(38)} ║`);
  console.log(`║  Account:       ${ACCOUNT_NUMBER.padEnd(38)} ║`);
  console.log(`║  Bank:          ${BANK_NAME.padEnd(38)} ║`);
  console.log(`║  Name:          ${ACCOUNT_NAME.padEnd(38)} ║`);
  console.log('╚══════════════════════════════════════════════════════════╝');

  try {
    // Connect to MongoDB
    console.log('\n[1/5] Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('      ✓ Connected');

    // Load services
    console.log('[2/5] Loading services...');
    const hostfiService = require('../src/services/hostfiService');
    const User = require('../src/models/User');
    console.log('      ✓ Services loaded');

    // Get user
    console.log('[3/5] Fetching user...');
    const user = await User.findById(USER_ID);
    if (!user) {
      console.error('      ✗ User not found');
      process.exit(1);
    }
    console.log(`      ✓ User: ${user.email}`);

    // Get USDC wallet
    console.log('[4/5] Checking USDC balance...');
    const wallets = await hostfiService.getUserWallets();
    
    const usdcWallet = wallets.find(w => {
      const code = (w.currency?.code || w.currency || '').toUpperCase();
      return code === 'USDC';
    });

    if (!usdcWallet) {
      console.error('      ✗ No USDC wallet found!');
      process.exit(1);
    }

    const usdcBalance = parseFloat(usdcWallet.balance || 0);
    console.log(`      ✓ USDC Balance: ${usdcBalance} USDC`);
    
    // Check if enough balance (amount + 0.2 USDC for swap fees)
    const swapFeeReserve = 0.2;
    const requiredUsdc = usdcAmount + swapFeeReserve;
    
    if (usdcBalance < requiredUsdc) {
      console.error(`\n❌ INSUFFICIENT USDC!`);
      console.error(`   Available: ${usdcBalance} USDC`);
      console.error(`   Required: ${usdcAmount} USDC + ${swapFeeReserve} USDC (swap fee) = ${requiredUsdc} USDC`);
      console.error(`\n   Maximum you can withdraw: ${Math.max(0, usdcBalance - swapFeeReserve).toFixed(4)} USDC`);
      process.exit(1);
    }

    // Confirm
    console.log('\n' + '⚠'.repeat(30));
    console.log('⚠️  READY TO WITHDRAW');
    console.log('⚠'.repeat(30));
    console.log(`   This will:`);
    console.log(`   1. Swap ${usdcAmount} USDC → NGN`);
    console.log(`   2. Payout NGN to your ${BANK_NAME} account`);
    console.log(`   3. Reserve ${swapFeeReserve} USDC for swap fees`);
    console.log('\n   Waiting 5 seconds... (Ctrl+C to cancel)');
    
    for (let i = 5; i > 0; i--) {
      process.stdout.write(`   ${i}... `);
      await new Promise(r => setTimeout(r, 1000));
    }
    console.log('\n');

    // Initiate withdrawal (this handles swap + payout)
    const clientReference = `WITHDRAW-USDC-${Date.now()}`;
    console.log(`[5/5] Initiating withdrawal...`);
    console.log(`      Reference: ${clientReference}`);
    
    const result = await hostfiService.initiateWithdrawal({
      walletAssetId: usdcWallet.id,
      amount: usdcAmount,
      currency: 'USDC',
      methodId: 'BANK_TRANSFER',
      recipient: {
        type: 'BANK',
        method: 'BANK_TRANSFER',
        currency: 'NGN', // Target is NGN
        accountNumber: ACCOUNT_NUMBER,
        accountName: ACCOUNT_NAME,
        bankId: BANK_ID,
        bankName: BANK_NAME,
        country: 'NG'
      },
      clientReference,
      memo: `Withdraw ${usdcAmount} USDC to NGN`
    });

    console.log('\n' + '╔══════════════════════════════════════════════════════════╗');
    console.log('║  ✅ SUCCESS! Swap + Payout Initiated                     ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  Reference:    ${clientReference.padEnd(38)} ║`);
    console.log(`║  USDC Swapped: ${usdcAmount.toString().padEnd(38)} ║`);
    console.log(`║  NGN Received: ~${((usdcAmount * 1500).toFixed(0)).padEnd(37)} ║`);
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('\nCheck your bank account in a few minutes!');

  } catch (error) {
    console.error('\n❌ WITHDRAWAL FAILED!');
    console.error('Error:', error.message);
    if (error.hostfiError) {
      console.error('HostFi:', error.hostfiError);
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n[DB] Disconnected');
  }
}

main();
