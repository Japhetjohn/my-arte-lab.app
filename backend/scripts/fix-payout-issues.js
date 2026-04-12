#!/usr/bin/env node
/**
 * Fix payout issues for booking BKG-D2B3BB11
 * 1. Check/fix platform fee percentage (should be 10%, not 1%)
 * 2. Add creator wallet address
 * 3. Retry payouts
 * Run: node scripts/fix-payout-issues.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Booking = require('../src/models/Booking');
const Transaction = require('../src/models/Transaction');
const hostfiService = require('../src/services/hostfiService');

const PLATFORM_WALLET_ADDRESS = process.env.PLATFORM_WALLET_ADDRESS || 'Bqc5Cf9UAr1rM27HgDDYERSHJAcgfzVH2MnBn7sSdkTg';

async function fixPayoutIssues() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myartelab');
    console.log('========================================');
    console.log('FIX PAYOUT ISSUES');
    console.log('========================================\n');

    // Check environment
    console.log('ENVIRONMENT CHECK:');
    console.log('========================================');
    console.log(`PLATFORM_COMMISSION: ${process.env.PLATFORM_COMMISSION || 'NOT SET (default: 10)'}`);
    console.log(`PLATFORM_WALLET_ADDRESS: ${PLATFORM_WALLET_ADDRESS.substring(0, 15)}...\n`);

    // Get booking
    const booking = await Booking.findOne({ bookingId: 'BKG-D2B3BB11' })
      .populate('client', 'email firstName lastName wallet')
      .populate('creator', 'email firstName lastName wallet');

    if (!booking) {
      console.error('❌ Booking not found');
      process.exit(1);
    }

    console.log('BOOKING DETAILS:');
    console.log('========================================');
    console.log(`ID: ${booking.bookingId}`);
    console.log(`Amount: ${booking.amount} ${booking.currency}`);
    console.log(`Current Creator Amount: ${booking.creatorAmount} ${booking.currency}`);
    console.log(`Current Platform Fee: ${booking.platformFee} ${booking.currency}`);
    console.log(`Platform Commission: ${booking.platformCommission}%`);
    
    // Check if fee is wrong (should be 10% = 0.2, not 1% = 0.02)
    const correctPlatformFee = (booking.amount * 10) / 100; // 10%
    const correctCreatorAmount = booking.amount - correctPlatformFee;
    
    console.log(`\nCORRECT VALUES (10%):`);
    console.log(`Platform Fee should be: ${correctPlatformFee} ${booking.currency}`);
    console.log(`Creator Amount should be: ${correctCreatorAmount} ${booking.currency}\n`);

    // Fix booking if needed
    if (booking.platformFee !== correctPlatformFee) {
      console.log('⚠️  Fixing platform fee from', booking.platformFee, 'to', correctPlatformFee);
      booking.platformFee = correctPlatformFee;
      booking.creatorAmount = correctCreatorAmount;
      booking.platformCommission = 10;
      await booking.save();
      console.log('✅ Booking fee fixed\n');
    }

    // Check creator wallet
    console.log('CREATOR WALLET CHECK:');
    console.log('========================================');
    const creator = await User.findById(booking.creator._id);
    console.log(`Creator: ${creator.email}`);
    console.log(`Wallet Address: ${creator.wallet?.address || 'MISSING'}`);
    console.log(`Collection Address: ${creator.wallet?.hostfiWalletAssets?.find(a => a.currency === 'USDC')?.colAddress || 'MISSING'}\n`);

    // If creator has no wallet address, we need to check if they have a collection address
    const creatorUsdcAsset = creator.wallet?.hostfiWalletAssets?.find(a => a.currency === 'USDC');
    
    if (!creator.wallet?.address && creatorUsdcAsset?.colAddress) {
      console.log('⚠️  Creator has collection address but no wallet.address field');
      console.log('   Setting wallet.address to collection address...');
      
      if (!creator.wallet) creator.wallet = {};
      creator.wallet.address = creatorUsdcAsset.colAddress;
      creator.wallet.network = 'Solana';
      await creator.save({ validateBeforeSave: false });
      console.log('✅ Creator wallet address updated\n');
    }

    if (!creator.wallet?.address) {
      console.error('❌ Creator still has no wallet address. Cannot proceed with payout.');
      console.log('   The creator needs to generate a wallet in their profile.\n');
      
      // Create a fallback Tsara wallet for testing
      console.log('Creating fallback wallet for creator...');
      try {
        const tsaraService = require('../src/services/tsaraService');
        const tsaraWallet = await tsaraService.createWallet(
          `${creator.firstName} ${creator.lastName}`,
          `tsara_${creator._id}`,
          { userId: creator._id }
        );
        
        if (tsaraWallet.success) {
          creator.wallet.tsaraWalletId = tsaraWallet.data.id;
          creator.wallet.tsaraAddress = tsaraWallet.data.primary_address;
          creator.wallet.address = tsaraWallet.data.primary_address;
          creator.wallet.network = 'Solana';
          await creator.save({ validateBeforeSave: false });
          console.log('✅ Created fallback wallet:', tsaraWallet.data.primary_address, '\n');
        }
      } catch (err) {
        console.error('❌ Failed to create fallback wallet:', err.message, '\n');
      }
    }

    // Now retry the payouts
    console.log('========================================');
    console.log('RETRYING PAYOUTS');
    console.log('========================================\n');

    const client = await User.findById(booking.client._id);
    const clientUsdcAsset = client.wallet?.hostfiWalletAssets?.find(a => a.currency === 'USDC');
    const creatorWalletAddress = creator.wallet?.address;

    if (!clientUsdcAsset || !creatorWalletAddress) {
      console.error('❌ Missing wallet information. Cannot proceed.');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`Client Asset ID: ${clientUsdcAsset.assetId}`);
    console.log(`Creator Wallet: ${creatorWalletAddress}`);
    console.log(`Creator Amount: ${booking.creatorAmount} USDC`);
    console.log(`Platform Fee: ${booking.platformFee} USDC\n`);

    // STEP 1: Creator Payout
    console.log('STEP 1: CREATOR PAYOUT (90%)');
    console.log('========================================');
    
    try {
      console.log('Initiating HostFi withdrawal...');
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
      console.log(`  Status: ${creatorPayout.status || 'PENDING'}`);

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
        transactionHash: creatorPayout.reference || creatorPayout.id,
        metadata: {
          payoutReference: creatorPayout.reference || creatorPayout.id,
          toAddress: creatorWalletAddress,
          network: 'SOL'
        }
      });
      console.log('✅ Earning transaction recorded\n');

    } catch (error) {
      console.error('❌ FAILED:', error.message);
      if (error.response?.data) {
        console.error('HostFi Error:', JSON.stringify(error.response.data, null, 2));
      }
      console.log('');
    }

    // STEP 2: Platform Fee
    console.log('STEP 2: PLATFORM FEE (10%)');
    console.log('========================================');
    
    try {
      console.log('Initiating platform fee transfer...');
      const platformFeeTransfer = await hostfiService.transferPlatformFee({
        clientAssetId: clientUsdcAsset.assetId,
        amount: booking.platformFee,
        currency: booking.currency,
        reference: booking.bookingId
      });

      if (platformFeeTransfer.skipped) {
        console.log(`⚠️ Skipped: ${platformFeeTransfer.reason}\n`);
      } else {
        console.log('✅ SUCCESS!');
        console.log(`  Reference: ${platformFeeTransfer.reference || platformFeeTransfer.id}\n`);

        // Create platform fee transaction
        await Transaction.create({
          transactionId: `PLATFORM-FEE-${Date.now()}`,
          user: client._id,
          booking: booking._id,
          type: 'platform_fee',
          amount: booking.platformFee,
          currency: 'USDC',
          status: 'completed',
          description: `Platform fee for ${booking.serviceTitle || 'service'}`,
          transactionHash: platformFeeTransfer.reference || platformFeeTransfer.id,
          metadata: {
            toAddress: PLATFORM_WALLET_ADDRESS,
            network: 'SOL'
          }
        });
        console.log('✅ Platform fee transaction recorded\n');
      }

    } catch (error) {
      console.error('❌ FAILED:', error.message);
      if (error.response?.data) {
        console.error('HostFi Error:', JSON.stringify(error.response.data, null, 2));
      }
      console.log('');
    }

    console.log('========================================');
    console.log('FIX COMPLETE');
    console.log('========================================');

    await mongoose.disconnect();

  } catch (error) {
    console.error('Fatal Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

console.log('Starting fix...\n');
fixPayoutIssues();
