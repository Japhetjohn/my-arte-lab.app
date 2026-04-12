#!/usr/bin/env node
/**
 * Check booking status and release funds properly
 * Run: node scripts/check-and-release-booking.js BKG-D2B3BB11
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('../src/models/Booking');
const User = require('../src/models/User');
const Transaction = require('../src/models/Transaction');
const hostfiService = require('../src/services/hostfiService');

async function checkAndRelease() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myartelab');
    
    console.log('========================================');
    console.log('CHECK & RELEASE BOOKING FUNDS');
    console.log('========================================\n');

    const bookingId = process.argv[2] || 'BKG-D2B3BB11';
    
    const booking = await Booking.findOne({ bookingId })
      .populate('client', 'email wallet')
      .populate('creator', 'email wallet');

    if (!booking) {
      console.error('❌ Booking not found');
      process.exit(1);
    }

    console.log(`Booking: ${booking.bookingId}`);
    console.log(`Status: ${booking.status}`);
    console.log(`Payment Status: ${booking.paymentStatus}`);
    console.log(`Funds Released: ${booking.fundsReleased}`);
    console.log(`Amount: ${booking.amount} USDC`);
    console.log(`Creator Amount: ${booking.creatorAmount} USDC`);
    console.log(`Platform Fee: ${booking.platformFee} USDC`);
    console.log(`\nClient: ${booking.client.email}`);
    console.log(`Creator: ${booking.creator.email}\n`);

    // Check client balance
    const clientUsdc = booking.client.wallet?.hostfiWalletAssets?.find(a => a.currency === 'USDC');
    console.log('Client USDC Balance:');
    console.log(`  Total: ${clientUsdc?.balance || 0} USDC`);
    console.log(`  Reserved: ${clientUsdc?.reservedBalance || 0} USDC`);
    console.log(`  Available: ${(clientUsdc?.balance || 0) - (clientUsdc?.reservedBalance || 0)} USDC\n`);

    // Check transactions
    console.log('Transactions for this booking:');
    const transactions = await Transaction.find({ booking: booking._id });
    if (transactions.length === 0) {
      console.log('  No transactions found\n');
    } else {
      for (const tx of transactions) {
        console.log(`  ${tx.type}: ${tx.amount} USDC | ${tx.status} | ${tx.transactionId}`);
      }
      console.log('');
    }

    // Show what needs to happen
    console.log('========================================');
    console.log('ANALYSIS');
    console.log('========================================');
    
    const available = (clientUsdc?.balance || 0) - (clientUsdc?.reservedBalance || 0);
    
    if (available < booking.creatorAmount) {
      console.log(`\n⚠️  INSUFFICIENT AVAILABLE FUNDS`);
      console.log(`   Available: ${available} USDC`);
      console.log(`   Needed for payout: ${booking.creatorAmount} USDC`);
      console.log(`   Shortfall: ${(booking.creatorAmount - available).toFixed(6)} USDC\n`);
      
      console.log('Options:');
      console.log('1. Reduce payout amount to available balance (0.731769 USDC)');
      console.log('2. Wait for more deposits');
      console.log('3. Check if reserved funds can be unreserved\n');
      
      // Check why funds are reserved
      console.log('Checking why funds are reserved...');
      const pendingBookings = await Booking.find({
        client: booking.client._id,
        status: { $in: ['confirmed', 'in_progress', 'delivered'] },
        paymentStatus: 'paid',
        fundsReleased: false
      });
      
      console.log(`\nPending bookings for ${booking.client.email}:`);
      for (const pb of pendingBookings) {
        console.log(`  - ${pb.bookingId}: ${pb.amount} USDC | ${pb.status} | Funds released: ${pb.fundsReleased}`);
      }
      
      if (pendingBookings.length > 0) {
        console.log(`\n💡 These bookings have funds reserved in escrow.`);
        console.log(`   When a booking is completed and funds are released,`);
        console.log(`   the reserved amount becomes available.\n`);
      }
    } else {
      console.log(`\n✅ Sufficient funds available: ${available} USDC`);
      console.log(`   Ready for payout of ${booking.creatorAmount} USDC\n`);
    }

    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAndRelease();
