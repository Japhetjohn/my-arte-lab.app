#!/usr/bin/env node
/**
 * Restore japhetjohnk@gmail.com's correct balance
 * Based on actual deposits made to HostFi
 * Run: node scripts/restore-japhet-balance.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Transaction = require('../src/models/Transaction');
const User = require('../src/models/User');

async function restoreBalance() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myartelab');
    console.log('Connected to MongoDB\n');

    // Find japhetjohnk@gmail.com
    const user = await User.findOne({ email: 'japhetjohnk@gmail.com' });
    if (!user) {
      console.error('User not found');
      process.exit(1);
    }

    console.log(`Restoring balance for: ${user.email}`);
    console.log(`User ID: ${user._id}\n`);

    // Check if transactions already exist
    const existingTx = await Transaction.findOne({
      user: user._id,
      currency: 'USDC',
      type: 'deposit'
    });

    if (existingTx) {
      console.log('Deposit transactions already exist. Calculating balance...');
    } else {
      // Create the actual deposit transactions based on HostFi reality
      // From earlier debug: HostFi shows 3.531769 USDC balance
      console.log('Creating deposit transaction for 3.531769 USDC...');
      
      const depositTx = new Transaction({
        transactionId: `DEPOSIT-${user._id.toString().slice(-8)}-${Date.now()}`,
        user: user._id,
        type: 'deposit',
        amount: 3.531769,
        currency: 'USDC',
        status: 'completed',
        description: 'USDC deposit via HostFi',
        createdAt: new Date()
      });
      
      await depositTx.save();
      console.log('✓ Created deposit transaction\n');
    }

    // Calculate correct balance from all transactions
    const transactions = await Transaction.find({
      user: user._id,
      currency: 'USDC',
      status: { $in: ['completed', 'success', 'confirmed'] }
    });

    let credits = 0;
    let debits = 0;

    transactions.forEach(tx => {
      const amount = parseFloat(tx.amount) || 0;
      if (['deposit', 'earning', 'refund'].includes(tx.type)) {
        credits += amount;
        console.log(`Credit: +${amount} USDC (${tx.type})`);
      } else if (['withdrawal', 'payment', 'platform_fee'].includes(tx.type)) {
        debits += amount;
        console.log(`Debit: -${amount} USDC (${tx.type})`);
      }
    });

    const correctBalance = Math.max(0, credits - debits);
    console.log(`\nCredits: ${credits}`);
    console.log(`Debits: ${debits}`);
    console.log(`Net Balance: ${correctBalance} USDC\n`);

    // Update user wallet
    const usdcAsset = user.wallet?.hostfiWalletAssets?.find(a => a.currency === 'USDC');
    if (usdcAsset) {
      usdcAsset.balance = correctBalance;
      usdcAsset.lastSynced = new Date();
    }
    user.wallet.balance = correctBalance;
    user.balance = correctBalance;
    
    await user.save({ validateBeforeSave: false });
    console.log(`✅ Balance restored: ${correctBalance} USDC`);

    await mongoose.disconnect();

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

restoreBalance();
