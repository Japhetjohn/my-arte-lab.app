#!/usr/bin/env node
/**
 * Debug payout process for a booking
 * Simulates the fund release with creator payout (90%) and platform fee (10%)
 * Run: node scripts/debug-payout.js <bookingId>
 * Or: node scripts/debug-payout.js japhetjohnk@gmail.com oonawa66@gmail.com
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Booking = require('../src/models/Booking');
const Transaction = require('../src/models/Transaction');
const hostfiService = require('../src/services/hostfiService');

const PLATFORM_WALLET_ADDRESS = process.env.PLATFORM_WALLET_ADDRESS || 'Bqc5Cf9UAr1rM27HgDDYERSHJAcgfzVH2MnBn7sSdkTg';

async function debugPayout() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myartelab');
    console.log('========================================');
    console.log('PAYOUT DEBUG SCRIPT');
    console.log('========================================\n');

    // Get users
    const clientEmail = process.argv[2] || 'japhetjohnk@gmail.com';
    const creatorEmail = process.argv[3] || 'oonawa66@gmail.com';

    console.log(`[DEBUG] Client: ${clientEmail}`);
    console.log(`[DEBUG] Creator: ${creatorEmail}\n`);

    const client = await User.findOne({ email: clientEmail });
    const creator = await User.findOne({ email: creatorEmail });

    if (!client || !creator) {
      console.error('❌ Client or creator not found');
      process.exit(1);
    }

    console.log('[DEBUG] Client ID:', client._id.toString());
    console.log('[DEBUG] Creator ID:', creator._id.toString());
    console.log('[DEBUG] Platform Wallet:', PLATFORM_WALLET_ADDRESS, '\n');

    // Find the booking
    const booking = await Booking.findOne({
      client: client._id,
      creator: creator._id,
      status: { $in: ['completed', 'delivered'] },
      paymentStatus: 'paid',
      fundsReleased: { $ne: true }
    }).sort({ createdAt: -1 });

    if (!booking) {
      console.log('[DEBUG] No pending booking found. Checking all bookings...\n');
      const allBookings = await Booking.find({
        $or: [
          { client: client._id, creator: creator._id },
          { client: client._id },
          { creator: creator._id }
        ]
      }).limit(5);

      console.log(`[DEBUG] Found ${allBookings.length} bookings:\n`);
      allBookings.forEach(b => {
        console.log(`  - Booking ID: ${b.bookingId || b._id}`);
        console.log(`    Status: ${b.status}`);
        console.log(`    Payment: ${b.paymentStatus}`);
        console.log(`    Amount: ${b.amount} ${b.currency}`);
        console.log(`    Funds Released: ${b.fundsReleased}`);
        console.log(`    Creator Amount: ${b.creatorAmount}`);
        console.log(`    Platform Fee: ${b.platformFee}\n`);
      });

      if (allBookings.length === 0) {
        console.log('[DEBUG] No bookings found. Creating test booking...\n');
        
        // Create a test booking for debugging
        const testBooking = new Booking({
          client: client._id,
          creator: creator._id,
          serviceId: new mongoose.Types.ObjectId(),
          serviceTitle: 'Test Photography Service',
          amount: 2,
          currency: 'USDC',
          creatorAmount: 1.8,  // 90%
          platformFee: 0.2,    // 10%
          status: 'delivered',
          paymentStatus: 'paid',
          fundsReleased: false,
          bookingId: `TEST-${Date.now()}`
        });
        
        await testBooking.save();
        console.log('✓ Created test booking:', testBooking.bookingId);
        console.log('  Amount: 2 USDC');
        console.log('  Creator (90%): 1.8 USDC');
        console.log('  Platform Fee (10%): 0.2 USDC\n');
      }
      
      // Re-fetch the booking
      var bookingToProcess = await Booking.findOne({
        client: client._id,
        creator: creator._id,
        fundsReleased: { $ne: true }
      }).sort({ createdAt: -1 });
      
      if (!bookingToProcess) {
        console.error('❌ Could not find or create booking');
        process.exit(1);
      }
    } else {
      var bookingToProcess = booking;
    }

    console.log('========================================');
    console.log('BOOKING DETAILS');
    console.log('========================================');
    console.log(`Booking ID: ${bookingToProcess.bookingId || bookingToProcess._id}`);
    console.log(`Total Amount: ${bookingToProcess.amount} ${bookingToProcess.currency}`);
    console.log(`Creator Payout (90%): ${bookingToProcess.creatorAmount} ${bookingToProcess.currency}`);
    console.log(`Platform Fee (10%): ${bookingToProcess.platformFee} ${bookingToProcess.currency}`);
    console.log(`Status: ${bookingToProcess.status}`);
    console.log(`Funds Released: ${bookingToProcess.fundsReleased}\n`);

    // Get client wallet
    console.log('========================================');
    console.log('CLIENT WALLET (Source of Funds)');
    console.log('========================================');
    const clientUsdcAsset = client.wallet?.hostfiWalletAssets?.find(a => a.currency === 'USDC');
    
    if (!clientUsdcAsset) {
      console.error('❌ Client has no USDC wallet asset');
      process.exit(1);
    }

    console.log(`Asset ID: ${clientUsdcAsset.assetId}`);
    console.log(`Balance: ${clientUsdcAsset.balance} USDC`);
    console.log(`Collection Address: ${clientUsdcAsset.colAddress || 'N/A'}\n`);

    // Get creator wallet
    console.log('========================================');
    console.log('CREATOR WALLET (Destination)');
    console.log('========================================');
    const creatorUsdcAsset = creator.wallet?.hostfiWalletAssets?.find(a => a.currency === 'USDC');
    
    if (!creatorUsdcAsset) {
      console.error('❌ Creator has no USDC wallet asset');
      process.exit(1);
    }

    console.log(`Asset ID: ${creatorUsdcAsset.assetId}`);
    console.log(`Balance: ${creatorUsdcAsset.balance} USDC`);
    console.log(`Collection Address: ${creatorUsdcAsset.colAddress || 'N/A'}`);
    console.log(`Wallet Address: ${creator.wallet?.address || 'N/A'}\n`);

    // STEP 1: Creator Payout (90%)
    console.log('========================================');
    console.log('STEP 1: CREATOR PAYOUT (90%)');
    console.log('========================================');
    console.log(`Amount: ${bookingToProcess.creatorAmount} USDC`);
    console.log(`To: ${creator.wallet?.address}`);
    console.log(`From Asset: ${clientUsdcAsset.assetId}\n`);

    try {
      console.log('[STEP 1] Initiating HostFi withdrawal...');
      const creatorPayout = await hostfiService.initiateWithdrawal({
        walletAssetId: clientUsdcAsset.assetId,
        amount: bookingToProcess.creatorAmount,
        currency: 'USDC',
        methodId: 'CRYPTO',
        recipient: {
          type: 'CRYPTO',
          method: 'CRYPTO',
          currency: 'USDC',
          address: creator.wallet?.address,
          network: 'SOL',
          country: 'NG'
        },
        clientReference: `CREATOR-PAYOUT-${bookingToProcess.bookingId || bookingToProcess._id}-${Date.now()}`,
        memo: `Payment for ${bookingToProcess.serviceTitle || 'service'}`
      });

      console.log('✓ Creator payout initiated!');
      console.log(`  Reference: ${creatorPayout.reference || creatorPayout.id}`);
      console.log(`  Status: ${creatorPayout.status || 'PENDING'}\n`);

      // Create earning transaction
      const earningTx = new Transaction({
        transactionId: `EARNING-${Date.now()}`,
        user: creator._id,
        booking: bookingToProcess._id,
        type: 'earning',
        amount: bookingToProcess.creatorAmount,
        currency: 'USDC',
        status: 'completed',
        description: `Earnings for ${bookingToProcess.serviceTitle || 'service'}`,
        transactionHash: creatorPayout.reference || creatorPayout.id,
        metadata: {
          payoutReference: creatorPayout.reference || creatorPayout.id,
          toAddress: creator.wallet?.address,
          network: 'SOL'
        }
      });
      await earningTx.save();
      console.log('✓ Created earning transaction\n');

    } catch (error) {
      console.error('❌ Creator payout FAILED:', error.message);
      if (error.response?.data) {
        console.error('HostFi Error:', JSON.stringify(error.response.data, null, 2));
      }
    }

    // STEP 2: Platform Fee (10%)
    console.log('========================================');
    console.log('STEP 2: PLATFORM FEE (10%)');
    console.log('========================================');
    console.log(`Amount: ${bookingToProcess.platformFee} USDC`);
    console.log(`To: ${PLATFORM_WALLET_ADDRESS}`);
    console.log(`From Asset: ${clientUsdcAsset.assetId}\n`);

    try {
      console.log('[STEP 2] Initiating platform fee transfer...');
      const platformFeeTransfer = await hostfiService.transferPlatformFee({
        clientAssetId: clientUsdcAsset.assetId,
        amount: bookingToProcess.platformFee,
        currency: 'USDC',
        reference: bookingToProcess.bookingId || bookingToProcess._id
      });

      if (platformFeeTransfer.skipped) {
        console.log(`⚠️ Platform fee skipped: ${platformFeeTransfer.reason}\n`);
      } else {
        console.log('✓ Platform fee transferred!');
        console.log(`  Reference: ${platformFeeTransfer.reference || platformFeeTransfer.id}\n`);
      }

    } catch (error) {
      console.error('❌ Platform fee transfer FAILED:', error.message);
      if (error.response?.data) {
        console.error('HostFi Error:', JSON.stringify(error.response.data, null, 2));
      }
    }

    // Update booking
    console.log('========================================');
    console.log('UPDATING BOOKING');
    console.log('========================================');
    bookingToProcess.fundsReleased = true;
    bookingToProcess.fundsReleasedAt = new Date();
    await bookingToProcess.save();
    console.log('✓ Booking marked as funds released\n');

    console.log('========================================');
    console.log('PAYOUT DEBUG COMPLETE');
    console.log('========================================');

    await mongoose.disconnect();

  } catch (error) {
    console.error('Fatal Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

console.log('Starting payout debug...\n');
debugPayout();
