/**
 * Fix User Balance Script
 * 
 * For japhetjohnk@gmail.com:
 * - The 1980 NGN deposit was recorded as NGN but should be USDC
 * - HostFi auto-swaps NGN → USDC on deposit
 * - This script queries HostFi for the actual USDC amount and updates the DB
 * 
 * Usage: node scripts/fixUserBalance.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Transaction = require('../src/models/Transaction');
const hostfiService = require('../src/services/hostfiService');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/myartelab';
const TARGET_EMAIL = 'japhetjohnk@gmail.com';

async function connectDB() {
  await mongoose.connect(MONGODB_URI);
  console.log('✓ Connected to MongoDB');
}

async function fixUserBalance() {
  try {
    await connectDB();

    // 1. Find user
    const user = await User.findOne({ email: TARGET_EMAIL });
    if (!user) {
      console.error(`❌ User not found: ${TARGET_EMAIL}`);
      process.exit(1);
    }
    console.log(`✓ Found user: ${user._id} (${user.email})`);
    console.log(`  Current wallet balance: ${user.wallet.balance} USDC`);
    console.log(`  Current user.balance: ${user.balance} USDC`);

    // 2. Find NGN deposits that should be USDC
    const ngnDeposits = await Transaction.find({
      user: user._id,
      type: 'deposit',
      currency: 'NGN'
    });
    console.log(`\n✓ Found ${ngnDeposits.length} NGN deposit(s) to fix`);

    let totalUsdcAdded = 0;

    for (const tx of ngnDeposits) {
      console.log(`\n--- Processing transaction ${tx.transactionId} ---`);
      console.log(`  Original: ${tx.amount} ${tx.currency}`);
      console.log(`  HostFi ref: ${tx.metadata?.hostfiReference || 'N/A'}`);

      let usdcAmount = 0;
      const hostfiRef = tx.metadata?.hostfiReference;

      // Try to get actual USDC amount from HostFi
      if (hostfiRef) {
        try {
          console.log(`  Querying HostFi for transaction ${hostfiRef}...`);
          const hostfiTx = await hostfiService.getTransactionByReference(hostfiRef);
          console.log(`  HostFi response:`, JSON.stringify(hostfiTx, null, 2).substring(0, 500));

          if (hostfiTx) {
            const txData = hostfiTx.data || hostfiTx;
            
            // Check for swap transactions (debit + credit legs)
            if (txData.transactions && Array.isArray(txData.transactions)) {
              const creditLeg = txData.transactions.find(t => 
                t.type === 'CREDIT' && 
                (t.amount?.currency === 'USDC' || t.asset?.currency?.code === 'USDC')
              );
              if (creditLeg) {
                usdcAmount = parseFloat(creditLeg.amount?.value || creditLeg.amount || 0);
                console.log(`  ✓ Found swap credit leg: ${usdcAmount} USDC`);
              }
            } else if (txData.amount?.currency === 'USDC' || txData.currency === 'USDC') {
              usdcAmount = parseFloat(txData.amount?.value || txData.amount || 0);
              console.log(`  ✓ Direct USDC amount: ${usdcAmount} USDC`);
            }
          }
        } catch (apiError) {
          console.warn(`  ⚠ Could not query HostFi: ${apiError.message}`);
        }
      }

      // Fallback: estimate from NGN amount using approximate rate
      if (usdcAmount === 0 && tx.currency === 'NGN') {
        const estimatedRate = 1570; // Approximate HostFi NGN→USDC rate
        usdcAmount = parseFloat((tx.amount / estimatedRate).toFixed(2));
        console.log(`  ⚠ Fallback conversion: ${tx.amount} NGN → ~${usdcAmount} USDC @ ${estimatedRate}`);
      }

      // Update the transaction
      const originalAmount = tx.amount;
      const originalCurrency = tx.currency;
      
      tx.amount = usdcAmount;
      tx.currency = 'USDC';
      tx.description = `Deposit of ${originalAmount} ${originalCurrency} (≈ ${usdcAmount} USDC)`;
      tx.metadata = {
        ...tx.metadata,
        originalAmount: originalAmount,
        originalCurrency: originalCurrency,
        fixedAt: new Date().toISOString(),
        fixReason: 'NGN deposit auto-converted to USDC by HostFi swap'
      };
      await tx.save();
      console.log(`  ✓ Transaction updated: ${usdcAmount} USDC`);

      totalUsdcAdded += usdcAmount;
    }

    // 3. Recalculate and update user balance
    console.log(`\n--- Recalculating balance ---`);
    
    // Get all completed transactions
    const allTxs = await Transaction.find({
      user: user._id,
      status: 'completed'
    });

    let calculatedUsdc = 0;
    for (const tx of allTxs) {
      const amt = parseFloat(tx.amount) || 0;
      const curr = (tx.currency || 'USDC').toUpperCase();
      if (curr !== 'USDC') continue; // Only count USDC

      switch (tx.type) {
        case 'deposit':
        case 'earning':
        case 'refund':
          calculatedUsdc += amt;
          break;
        case 'withdrawal':
        case 'payment':
        case 'escrow':
          calculatedUsdc -= amt;
          break;
        case 'platform_fee':
          break;
      }
    }

    console.log(`  Calculated USDC balance from transactions: ${calculatedUsdc.toFixed(2)} USDC`);

    // Update user
    const oldBalance = user.wallet.balance;
    user.wallet.balance = parseFloat(calculatedUsdc.toFixed(2));
    user.balance = user.wallet.balance;
    user.wallet.lastUpdated = new Date();
    await user.save({ validateBeforeSave: false });

    console.log(`\n✅ DONE!`);
    console.log(`  User: ${TARGET_EMAIL}`);
    console.log(`  Old balance: ${oldBalance} USDC`);
    console.log(`  New balance: ${user.wallet.balance} USDC`);
    console.log(`  NGN deposits converted: ${ngnDeposits.length}`);
    console.log(`  Total USDC added: ${totalUsdcAdded.toFixed(2)} USDC`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
  }
}

// Run if called directly
if (require.main === module) {
  fixUserBalance();
}

module.exports = { fixUserBalance };
