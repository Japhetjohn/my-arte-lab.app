#!/usr/bin/env node
/**
 * Release funds from booking escrow and payout
 * Run: node scripts/release-escrow-funds.js BKG-D2B3BB11
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('../src/models/Booking');
const User = require('../src/models/User');
const Transaction = require('../src/models/Transaction');
const hostfiService = require('../src/services/hostfiService');
const tsaraService = require('../src/services/tsaraService');
const platformFeeAccumulator = require('../src/services/platformFeeAccumulator');

async function releaseEscrow() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myartelab');
    
    console.log('========================================');
    console.log('RELEASE ESCROW & PAYOUT');
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
    console.log(`Funds Released: ${booking.fundsReleased}`);
    console.log(`Amount: ${booking.amount} USDC`);
    console.log(`Escrow Balance: ${booking.escrowWallet?.balance || 0} USDC\n`);

    // Check if booking is ready for fund release
    if (booking.status !== 'completed' && booking.status !== 'delivered') {
      console.error('❌ Booking must be completed or delivered to release funds');
      process.exit(1);
    }

    if (booking.fundsReleased) {
      console.log('⚠️  Funds already released');
    }

    // Get creator wallet
    let creatorWalletAddress = booking.creator.wallet?.address || 
                               booking.creator.wallet?.tsaraAddress || 
                               booking.creator.tsaraAddress;

    // Create wallet if needed
    if (!creatorWalletAddress) {
      console.log('Creating wallet for creator...');
      const walletResult = await tsaraService.createWallet(
        `${booking.creator.firstName || 'Creator'} ${booking.creator.lastName || ''}`.trim(),
        `creator_${booking.creator._id}_${Date.now()}`,
        { userId: booking.creator._id }
      );
      
      if (walletResult.success) {
        booking.creator.wallet.address = walletResult.data.primary_address;
        booking.creator.wallet.tsaraAddress = walletResult.data.primary_address;
        await booking.creator.save();
        creatorWalletAddress = walletResult.data.primary_address;
        console.log(`✅ Created wallet: ${creatorWalletAddress}\n`);
      }
    } else {
      console.log(`Creator wallet: ${creatorWalletAddress}\n`);
    }

    // Get client USDC asset
    const clientUsdcAsset = booking.client.wallet?.hostfiWalletAssets?.find(a => a.currency === 'USDC');
    if (!clientUsdcAsset?.assetId) {
      console.error('❌ Client USDC asset not found');
      process.exit(1);
    }

    console.log(`Client Asset ID: ${clientUsdcAsset.assetId}`);
    console.log(`Client Available: ${(clientUsdcAsset.balance || 0) - (clientUsdcAsset.reservedBalance || 0)} USDC\n`);

    // STEP 1: Release funds from escrow (just mark as released in DB)
    console.log('STEP 1: Marking funds as released in database...');
    booking.fundsReleased = true;
    booking.fundsReleasedAt = new Date();
    booking.paymentStatus = 'released';
    booking.escrowWallet.balance = 0;
    await booking.save();
    console.log('✅ Booking updated\n');

    // STEP 2: Payout to creator (90%)
    console.log('STEP 2: Payout to creator...');
    console.log(`Amount: ${booking.creatorAmount} USDC`);
    console.log(`To: ${creatorWalletAddress}\n`);

    try {
      const payout = await hostfiService.initiateWithdrawal({
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
        memo: `Payment for ${booking.serviceTitle}`
      });

      console.log('✅ Payout successful!');
      console.log(`Reference: ${payout.reference || payout.id}\n`);

      // Create earning transaction
      await Transaction.create({
        transactionId: `EARNING-${Date.now()}`,
        user: booking.creator._id,
        booking: booking._id,
        type: 'earning',
        amount: booking.creatorAmount,
        currency: 'USDC',
        status: 'completed',
        description: `Earnings for ${booking.serviceTitle}`,
        transactionHash: payout.reference || payout.id,
        toAddress: creatorWalletAddress
      });

    } catch (payoutError) {
      console.error('❌ Payout failed:', payoutError.message);
      console.log('\n⚠️  Funds marked as released but payout failed.');
      console.log('You may need to retry the payout manually.');
      process.exit(1);
    }

    // STEP 3: Accumulate platform fee (10%)
    console.log('STEP 3: Accumulating platform fee...');
    console.log(`Amount: ${booking.platformFee} USDC\n`);

    try {
      const feeResult = await platformFeeAccumulator.addFee(
        booking.client._id.toString(),
        booking._id.toString(),
        booking.platformFee,
        'USDC',
        clientUsdcAsset.assetId
      );

      console.log('✅ Platform fee accumulated');
      console.log(`Total accumulated: ${feeResult.accumulated} USDC`);
      console.log(`Withdrawn immediately: ${feeResult.withdrawn ? 'YES' : 'NO'}\n`);

    } catch (feeError) {
      console.error('❌ Fee accumulation failed:', feeError.message);
    }

    console.log('========================================');
    console.log('✅ ESCROW RELEASED & PAYOUT COMPLETE');
    console.log('========================================');
    console.log(`Creator paid: ${booking.creatorAmount} USDC`);
    console.log(`Platform fee: ${booking.platformFee} USDC (accumulated)`);
    console.log(`Booking: ${booking.bookingId}`);

    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

releaseEscrow();
