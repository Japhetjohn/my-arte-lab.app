#!/usr/bin/env node
/**
 * Debug script to analyze a specific user's wallet balance
 * Run: node scripts/debug-user-balance.js japhetjohnk@gmail.com
 */

const mongoose = require('mongoose');
const User = require('../src/models/User');
const Transaction = require('../src/models/Transaction');
const Booking = require('../src/models/Booking');

// Get email from command line
const email = process.argv[2];

if (!email) {
  console.error('Usage: node debug-user-balance.js <email>');
  process.exit(1);
}

async function debugUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myartelab');
    console.log('Connected to MongoDB');

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.error(`User not found: ${email}`);
      process.exit(1);
    }

    console.log('\n========================================');
    console.log(`User: ${user.firstName} ${user.lastName} (${email})`);
    console.log(`User ID: ${user._id}`);
    console.log('========================================\n');

    // Get stored wallet info
    console.log('STORED WALLET DATA:');
    console.log(`  wallet.balance: ${user.wallet?.balance}`);
    console.log(`  wallet.usdcBalance: ${user.wallet?.usdcBalance}`);
    console.log(`  wallet.hostfiWalletAssets:`);
    if (user.wallet?.hostfiWalletAssets) {
      user.wallet.hostfiWalletAssets.forEach(asset => {
        console.log(`    - ${asset.currency}: ${asset.balance} (assetId: ${asset.assetId})`);
      });
    }
    console.log('');

    // Get all transactions for this user
    const transactions = await Transaction.find({
      user: user._id,
      status: { $in: ['completed', 'success', 'confirmed'] }
    }).sort({ createdAt: -1 });

    console.log(`TRANSACTIONS (${transactions.length} total):`);
    console.log('----------------------------------------');

    let creditTotal = 0;
    let debitTotal = 0;
    const creditTypes = ['deposit', 'credit', 'earning', 'refund'];
    const debitTypes = ['withdrawal', 'debit', 'payment', 'fee', 'platform_fee'];

    transactions.forEach((tx, i) => {
      const amount = parseFloat(tx.amount) || 0;
      const isCredit = creditTypes.includes(tx.type);
      const isDebit = debitTypes.includes(tx.type);

      if (isCredit) creditTotal += amount;
      if (isDebit) debitTotal += amount;

      // Flag unusual amounts
      const isUnusual = amount > 10000 || amount < 0;
      const flag = isUnusual ? ' ⚠️ UNUSUAL' : '';

      console.log(`${i + 1}. [${tx.type.toUpperCase()}] ${amount} ${tx.currency} - ${tx.status}${flag}`);
      console.log(`   ID: ${tx.transactionId}`);
      console.log(`   Date: ${tx.createdAt}`);
      if (tx.description) console.log(`   Desc: ${tx.description}`);
      if (tx.booking) console.log(`   Booking: ${tx.booking}`);
      console.log('');
    });

    console.log('----------------------------------------');
    console.log(`CREDITS (${creditTypes.join(', ')}): ${creditTotal}`);
    console.log(`DEBITS (${debitTypes.join(', ')}): ${debitTotal}`);
    console.log(`NET BALANCE: ${creditTotal - debitTotal}`);
    console.log('');

    // Check for duplicate transactions
    console.log('CHECKING FOR DUPLICATES...');
    const txIds = transactions.map(tx => tx.transactionId);
    const duplicates = txIds.filter((item, index) => txIds.indexOf(item) !== index);
    if (duplicates.length > 0) {
      console.log(`⚠️ Found duplicate transaction IDs: ${[...new Set(duplicates)].join(', ')}`);
    } else {
      console.log('✓ No duplicate transaction IDs found');
    }

    // Check for transactions with very large amounts
    console.log('\nCHECKING FOR ANOMALIES...');
    const largeTxs = transactions.filter(tx => parseFloat(tx.amount) > 100000);
    if (largeTxs.length > 0) {
      console.log(`⚠️ Found ${largeTxs.length} transactions with amount > 100,000:`);
      largeTxs.forEach(tx => {
        console.log(`   - ${tx.transactionId}: ${tx.amount} ${tx.currency} [${tx.type}]`);
      });
    }

    // Check negative amounts
    const negativeTxs = transactions.filter(tx => parseFloat(tx.amount) < 0);
    if (negativeTxs.length > 0) {
      console.log(`⚠️ Found ${negativeTxs.length} transactions with negative amounts:`);
      negativeTxs.forEach(tx => {
        console.log(`   - ${tx.transactionId}: ${tx.amount} ${tx.currency} [${tx.type}]`);
      });
    }

    // Check bookings as client
    console.log('\n----------------------------------------');
    console.log('BOOKINGS AS CLIENT (pending escrow):');
    const clientBookings = await Booking.find({
      client: user._id,
      status: { $in: ['confirmed', 'in_progress', 'delivered'] },
      paymentStatus: 'paid'
    });

    let pendingEscrow = 0;
    clientBookings.forEach(booking => {
      pendingEscrow += parseFloat(booking.amount) || 0;
      console.log(`  - ${booking.bookingId}: ${booking.amount} ${booking.currency} [${booking.status}]`);
    });
    console.log(`Total Pending Escrow: ${pendingEscrow}`);

    // Check incoming earnings as creator
    console.log('\nBOOKINGS AS CREATOR (incoming earnings):');
    const creatorBookings = await Booking.find({
      creator: user._id,
      status: { $in: ['confirmed', 'in_progress', 'delivered'] },
      paymentStatus: 'paid',
      fundsReleased: false
    });

    let incomingEarnings = 0;
    creatorBookings.forEach(booking => {
      incomingEarnings += parseFloat(booking.creatorAmount) || 0;
      console.log(`  - ${booking.bookingId}: ${booking.creatorAmount} ${booking.currency} [${booking.status}]`);
    });
    console.log(`Total Incoming Earnings: ${incomingEarnings}`);

    console.log('\n========================================');
    console.log('SUMMARY:');
    console.log(`  Transaction Net Balance: ${creditTotal - debitTotal}`);
    console.log(`  Pending Escrow (as client): ${pendingEscrow}`);
    console.log(`  Incoming Earnings (as creator): ${incomingEarnings}`);
    console.log(`  Available Balance: ${Math.max(0, (creditTotal - debitTotal) - pendingEscrow)}`);
    console.log('========================================');

    await mongoose.disconnect();
    console.log('\nDone!');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

debugUser();
