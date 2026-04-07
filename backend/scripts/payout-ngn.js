#!/usr/bin/env node
/**
 * Manual NGN Payout Script - Uses existing HostFi service
 * This pays out from existing NGN balance without swapping USDC
 * 
 * Usage: node scripts/payout-ngn.js <amount_in_ngn> <account_number>
 * Example: node scripts/payout-ngn.js 4000 7031632438
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
const USER_ID = '6983ea1691b5040eb0fb0276';

// Your bank details
const BANK_ID = 'NG::100004';
const BANK_NAME = 'Opay';
const ACCOUNT_NAME = 'John Kuulsinim Japhet';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║          MANUAL NGN PAYOUT SCRIPT                        ║
╠══════════════════════════════════════════════════════════╣
║  Usage: node scripts/payout-ngn.js <amount> <account>    ║
║                                                          ║
║  Example:                                                ║
║    node scripts/payout-ngn.js 4000 7031632438            ║
╚══════════════════════════════════════════════════════════╝
`);
    process.exit(1);
  }

  const [amountNgn, accountNumber] = args;
  
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║              MANUAL NGN PAYOUT                           ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  Amount:        ₦${amountNgn.toString().padEnd(38)} ║`);
  console.log(`║  Account:       ${accountNumber.toString().padEnd(38)} ║`);
  console.log(`║  Bank:          ${BANK_NAME.toString().padEnd(38)} ║`);
  console.log(`║  Account Name:  ${ACCOUNT_NAME.toString().padEnd(38)} ║`);
  console.log('╚══════════════════════════════════════════════════════════╝');

  try {
    // Connect to MongoDB
    console.log('\n[1/4] Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('      ✓ Connected');

    // Load services
    console.log('[2/4] Loading services...');
    const hostfiService = require('../src/services/hostfiService');
    const User = require('../src/models/User');
    console.log('      ✓ Services loaded');

    // Get user
    console.log('[3/4] Fetching user...');
    const user = await User.findById(USER_ID);
    if (!user) {
      console.error('      ✗ User not found');
      process.exit(1);
    }
    console.log(`      ✓ User: ${user.email}`);

    // Get wallets
    console.log('[4/4] Checking NGN balance...');
    const wallets = await hostfiService.getUserWallets();
    
    const ngnWallet = wallets.find(w => {
      const code = (w.currency?.code || w.currency || '').toUpperCase();
      return code === 'NGN';
    });

    if (!ngnWallet) {
      console.error('      ✗ No NGN wallet found!');
      console.log('\nAvailable wallets:');
      wallets.forEach(w => {
        console.log(`  - ${w.currency?.code || w.currency}: ${w.balance}`);
      });
      process.exit(1);
    }

    console.log(`      ✓ NGN Balance: ₦${ngnWallet.balance}`);
    
    if (parseFloat(ngnWallet.balance) < parseFloat(amountNgn)) {
      console.error(`\n❌ INSUFFICIENT BALANCE!`);
      console.error(`   Available: ₦${ngnWallet.balance} NGN`);
      console.error(`   Requested: ₦${amountNgn} NGN`);
      console.error(`\n   Try withdrawing less (e.g., ${Math.floor(parseFloat(ngnWallet.balance) * 0.95)})`);
      process.exit(1);
    }

    // Confirm
    console.log('\n' + '⚠'.repeat(30));
    console.log('⚠️  READY TO INITIATE PAYOUT');
    console.log('⚠'.repeat(30));
    console.log('   This will payout from your EXISTING NGN balance.');
    console.log('   No USDC swap needed!');
    console.log('\n   Waiting 5 seconds... (Press Ctrl+C to cancel)');
    
    for (let i = 5; i > 0; i--) {
      process.stdout.write(`   ${i}... `);
      await new Promise(r => setTimeout(r, 1000));
    }
    console.log('\n');

    // Initiate payout
    const clientReference = `MANUAL-NGN-${Date.now()}`;
    console.log(`[Payout] Initiating... (Ref: ${clientReference})`);
    
    const result = await hostfiService.initiateWithdrawal({
      walletAssetId: ngnWallet.id,
      amount: parseFloat(amountNgn),
      currency: 'NGN',
      methodId: 'BANK_TRANSFER',
      recipient: {
        type: 'BANK',
        method: 'BANK_TRANSFER',
        currency: 'NGN',
        accountNumber: accountNumber,
        accountName: ACCOUNT_NAME,
        bankId: BANK_ID,
        bankName: BANK_NAME,
        country: 'NG'
      },
      clientReference,
      memo: `Manual payout ${clientReference}`
    });

    console.log('\n' + '╔══════════════════════════════════════════════════════════╗');
    console.log('║  ✅ PAYOUT INITIATED SUCCESSFULLY!                       ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  Reference:  ${clientReference.padEnd(38)} ║`);
    console.log(`║  Status:     ${(result.status || 'PENDING').padEnd(38)} ║`);
    console.log(`║  Amount:     ₦${amountNgn.toString().padEnd(37)} ║`);
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('\nTrack in HostFi dashboard or check your bank account.');

  } catch (error) {
    console.error('\n❌ PAYOUT FAILED!');
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
