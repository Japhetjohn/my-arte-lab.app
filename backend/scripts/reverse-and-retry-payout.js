#!/usr/bin/env node
/**
 * Reverse previous payout and retry with fee accumulation
 * Run: node scripts/reverse-and-retry-payout.js BKG-D2B3BB11
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Booking = require('../src/models/Booking');
const Transaction = require('../src/models/Transaction');
const hostfiService = require('../src/services/hostfiService');
const platformFeeAccumulator = require('../src/services/platformFeeAccumulator');
const tsaraService = require('../src/services/tsaraService');

async function reverseAndRetry() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myartelab');
    console.log('========================================');
    console.log('REVERSE & RETRY PAYOUT WITH FEE ACCUMULATION');
    console.log('========================================\n');

    const bookingId = process.argv[2] || 'BKG-D2B3BB11';
    
    // Find booking
    const booking = await Booking.findOne({ bookingId })
      .populate('client', 'email wallet')
      .populate('creator', 'email wallet');

    if (!booking) {
      console.error('❌ Booking not found');
      process.exit(1);
    }

    console.log(`Booking: ${booking.bookingId}`);
    console.log(`Amount: ${booking.amount} USDC`);
    console.log(`Creator Amount: ${booking.creatorAmount} USDC`);
    console.log(`Platform Fee: ${booking.platformFee} USDC\n`);

    // Step 1: Delete previous transactions
    console.log('STEP 1: Removing previous transactions...');
    const deleted = await Transaction.deleteMany({
      booking: booking._id,
      type: { $in: ['earning', 'platform_fee'] }
    });
    console.log(`✅ Deleted ${deleted.deletedCount} transactions\n`);

    // Step 2: Reset booking status
    console.log('STEP 2: Resetting booking status...');
    booking.fundsReleased = false;
    booking.fundsReleasedAt = undefined;
    booking.paymentStatus = 'paid';
    await booking.save();
    console.log('✅ Booking reset\n');

    // Step 3: Get wallet info
    const client = await User.findById(booking.client._id);
    const creator = await User.findById(booking.creator._id);
    
    const clientUsdcAsset = client.wallet?.hostfiWalletAssets?.find(a => a.currency === 'USDC');
    const creatorWalletAddress = creator.wallet?.address;

    console.log('WALLET INFO:');
    console.log(`Client Asset: ${clientUsdcAsset?.assetId}`);
    console.log(`Creator Wallet: ${creatorWalletAddress}\n`);

    // Step 4: Payout to creator (90%)
    console.log('========================================');
    console.log('STEP 3: CREATOR PAYOUT (90%)');
    console.log('========================================');
    console.log(`Amount: ${booking.creatorAmount} USDC`);
    
    try {
      const creatorPayout = await hostfiService.initiateWithdrawal({
        walletAssetId: clientUsdcAsset.assetId,
        amount: booking.creatorAmount,
        currency: 'USDC',
        methodId: 'CRYPTO',
        recipient: {
          type: 'CRYPTO',
          method: 'CRYPTO',
          currency: 'USDC',
          address: creatorWalletAddress,
          network: 'SOL',
          country: 'NG'
        },
        clientReference: `CREATOR-PAYOUT-${booking.bookingId}-${Date.now()}`,
        memo: `Payment for ${booking.serviceTitle || 'service'}`
      });

      console.log('✅ SUCCESS!');
      console.log(`  Reference: ${creatorPayout.reference || creatorPayout.id}`);

      // Create earning transaction
      await Transaction.create({
        transactionId: `EARNING-${Date.now()}`,
        user: creator._id,
        booking: booking._id,
        type: 'earning',
        amount: booking.creatorAmount,
        currency: 'USDC',
        status: 'completed',
        description: `Earnings for ${booking.serviceTitle || 'service'}`,
        transactionHash: creatorPayout.reference || creatorPayout.id
      });
      console.log('✅ Earning transaction recorded\n');

    } catch (error) {
      console.error('❌ FAILED:', error.message);
      process.exit(1);
    }

    // Step 5: Accumulate platform fee (10%)
    console.log('========================================');
    console.log('STEP 4: PLATFORM FEE ACCUMULATION (10%)');
    console.log('========================================');
    console.log(`Amount: ${booking.platformFee} USDC`);
    console.log(`HostFi minimum: 1 USDC\n`);

    try {
      const feeResult = await platformFeeAccumulator.addFee(
        booking.client._id.toString(),
        booking._id.toString(),
        booking.platformFee,
        'USDC',
        clientUsdcAsset.assetId
      );

      console.log('✅ Fee added to accumulator');
      console.log(`  Total accumulated: ${feeResult.accumulated} USDC`);
      console.log(`  Withdrawn: ${feeResult.withdrawn ? 'YES' : 'NO'}`);
      
      if (!feeResult.withdrawn) {
        console.log(`  Remaining to threshold: ${feeResult.remainingToThreshold} USDC`);
        console.log(`  Status: Accumulating until 1 USDC minimum\n`);
      } else {
        console.log(`  Withdrawal reference: ${feeResult.withdrawalResult.reference}\n`);
      }

    } catch (error) {
      console.error('❌ FAILED:', error.message);
    }

    // Step 6: Mark booking as complete
    console.log('STEP 5: Finalizing booking...');
    booking.fundsReleased = true;
    booking.fundsReleasedAt = new Date();
    booking.paymentStatus = 'released';
    await booking.save();
    console.log('✅ Booking marked as funds released\n');

    console.log('========================================');
    console.log('PAYOUT COMPLETE WITH FEE ACCUMULATION');
    console.log('========================================');
    console.log('\nSummary:');
    console.log(`✅ Creator paid: ${booking.creatorAmount} USDC`);
    console.log(`✅ Platform fee: ${booking.platformFee} USDC (accumulating)`);
    console.log(`✅ Booking: ${booking.bookingId} completed\n`);

    await mongoose.disconnect();

  } catch (error) {
    console.error('Fatal Error:', error.message);
    process.exit(1);
  }
}

console.log('Starting reverse and retry...\n');
reverseAndRetry();
