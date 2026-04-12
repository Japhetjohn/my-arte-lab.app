#!/usr/bin/env node
/**
 * Check and fix payout for a specific booking
 * Run: node scripts/check-and-fix-payout.js <bookingId>
 * Example: node scripts/check-and-fix-payout.js BKG-D2B3BB11
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Booking = require('../src/models/Booking');
const Transaction = require('../src/models/Transaction');
const hostfiService = require('../src/services/hostfiService');

const PLATFORM_WALLET_ADDRESS = process.env.PLATFORM_WALLET_ADDRESS || 'Bqc5Cf9UAr1rM27HgDDYERSHJAcgfzVH2MnBn7sSdkTg';

async function checkAndFixPayout() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myartelab');
    console.log('========================================');
    console.log('CHECK & FIX PAYOUT');
    console.log('========================================\n');

    const bookingId = process.argv[2] || 'BKG-D2B3BB11';
    console.log(`Checking booking: ${bookingId}\n`);

    // Find booking
    const booking = await Booking.findOne({ bookingId })
      .populate('client', 'email firstName lastName wallet')
      .populate('creator', 'email firstName lastName wallet');

    if (!booking) {
      console.error('❌ Booking not found');
      process.exit(1);
    }

    console.log('BOOKING DETAILS:');
    console.log('========================================');
    console.log(`ID: ${booking.bookingId}`);
    console.log(`Client: ${booking.client?.email} (${booking.client?._id})`);
    console.log(`Creator: ${booking.creator?.email} (${booking.creator?._id})`);
    console.log(`Amount: ${booking.amount} ${booking.currency}`);
    console.log(`Creator Amount (90%): ${booking.creatorAmount} ${booking.currency}`);
    console.log(`Platform Fee (10%): ${booking.platformFee} ${booking.currency}`);
    console.log(`Status: ${booking.status}`);
    console.log(`Payment Status: ${booking.paymentStatus}`);
    console.log(`Funds Released: ${booking.fundsReleased}`);
    console.log(`Funds Released At: ${booking.fundsReleasedAt || 'N/A'}\n`);

    // Check transactions
    console.log('TRANSACTIONS:');
    console.log('========================================');
    const transactions = await Transaction.find({ booking: booking._id });
    
    if (transactions.length === 0) {
      console.log('❌ No transactions found for this booking!\n');
    } else {
      console.log(`Found ${transactions.length} transactions:\n`);
      transactions.forEach((tx, i) => {
        console.log(`${i + 1}. ${tx.type.toUpperCase()}`);
        console.log(`   Amount: ${tx.amount} ${tx.currency}`);
        console.log(`   Status: ${tx.status}`);
        console.log(`   User: ${tx.user}`);
        console.log(`   Tx Hash: ${tx.transactionHash || 'N/A'}`);
        console.log(`   Desc: ${tx.description || 'N/A'}\n`);
      });
    }

    // Check for earning transaction (creator payout)
    const earningTx = transactions.find(tx => tx.type === 'earning');
    const platformFeeTx = transactions.find(tx => tx.type === 'platform_fee');

    // Check if we need to retry payout
    const needsCreatorPayout = !earningTx || earningTx.status !== 'completed';
    const needsPlatformFee = !platformFeeTx || platformFeeTx.status !== 'completed';

    if (!needsCreatorPayout && !needsPlatformFee) {
      console.log('✅ Both payouts appear to be completed.\n');
      
      // Verify with HostFi
      if (earningTx?.transactionHash) {
        console.log('Checking creator payout with HostFi...');
        try {
          const payoutStatus = await hostfiService.getTransactionByReference(earningTx.transactionHash);
          console.log(`Creator Payout Status: ${payoutStatus.status || 'Unknown'}`);
        } catch (e) {
          console.log(`Could not verify: ${e.message}`);
        }
      }
      
      await mongoose.disconnect();
      return;
    }

    console.log('⚠️  PAYOUT ISSUES DETECTED:');
    if (needsCreatorPayout) console.log('  - Creator payout missing or failed');
    if (needsPlatformFee) console.log('  - Platform fee missing or failed');
    console.log('');

    // Get client wallet
    const client = await User.findById(booking.client._id);
    const creator = await User.findById(booking.creator._id);
    
    const clientUsdcAsset = client.wallet?.hostfiWalletAssets?.find(a => a.currency === 'USDC');
    const creatorWalletAddress = creator.wallet?.address;

    console.log('WALLET INFO:');
    console.log('========================================');
    console.log(`Client Asset ID: ${clientUsdcAsset?.assetId || 'N/A'}`);
    console.log(`Client Balance: ${clientUsdcAsset?.balance || 0} USDC`);
    console.log(`Creator Wallet: ${creatorWalletAddress || 'N/A'}\n`);

    if (!clientUsdcAsset || !creatorWalletAddress) {
      console.error('❌ Missing wallet information');
      process.exit(1);
    }

    // Ask to retry
    console.log('Retrying payout...\n');

    // STEP 1: Creator Payout
    if (needsCreatorPayout) {
      console.log('========================================');
      console.log('RETRYING: CREATOR PAYOUT (90%)');
      console.log('========================================');
      console.log(`Amount: ${booking.creatorAmount} USDC`);
      console.log(`To: ${creatorWalletAddress}\n`);

      try {
        console.log('Initiating HostFi withdrawal...');
        const payload = {
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
        };
        
        console.log('Request:', JSON.stringify(payload, null, 2));
        
        const creatorPayout = await hostfiService.initiateWithdrawal(payload);

        console.log('✓ SUCCESS!');
        console.log(`  Reference: ${creatorPayout.reference || creatorPayout.id}`);
        console.log(`  Status: ${creatorPayout.status || 'PENDING'}`);
        console.log(`  Response:`, JSON.stringify(creatorPayout, null, 2), '\n');

        // Create/update earning transaction
        if (earningTx) {
          earningTx.status = 'completed';
          earningTx.transactionHash = creatorPayout.reference || creatorPayout.id;
          await earningTx.save();
        } else {
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
        }
        console.log('✓ Earning transaction recorded\n');

      } catch (error) {
        console.error('❌ FAILED:', error.message);
        if (error.response?.data) {
          console.error('HostFi Error:', JSON.stringify(error.response.data, null, 2));
        }
        console.log('');
      }
    }

    // STEP 2: Platform Fee
    if (needsPlatformFee) {
      console.log('========================================');
      console.log('RETRYING: PLATFORM FEE (10%)');
      console.log('========================================');
      console.log(`Amount: ${booking.platformFee} USDC`);
      console.log(`To: ${PLATFORM_WALLET_ADDRESS}\n`);

      try {
        console.log('Initiating platform fee transfer...');
        const payload = {
          assetId: clientUsdcAsset.assetId,
          clientReference: `PLATFORM-FEE-${booking.bookingId}-${Date.now()}`,
          methodId: 'CRYPTO',
          amount: Number(booking.platformFee),
          currency: 'USDC',
          recipient: {
            type: 'CRYPTO',
            method: 'CRYPTO',
            currency: 'USDC',
            accountNumber: PLATFORM_WALLET_ADDRESS,
            address: PLATFORM_WALLET_ADDRESS,
            network: 'SOL',
            country: 'NG',
            accountName: 'Platform Wallet',
            accountType: 'SAVINGS'
          },
          memo: `Platform Fee 10% for ${booking.bookingId}`
        };
        
        console.log('Request:', JSON.stringify(payload, null, 2));
        
        const platformFeeResult = await hostfiService.makeRequest(
          'POST',
          '/v1/payout/transactions',
          payload
        );

        console.log('✓ SUCCESS!');
        console.log(`  Reference: ${platformFeeResult.reference || platformFeeResult.id}`);
        console.log(`  Response:`, JSON.stringify(platformFeeResult, null, 2), '\n');

        // Create/update platform fee transaction
        if (platformFeeTx) {
          platformFeeTx.status = 'completed';
          platformFeeTx.transactionHash = platformFeeResult.reference || platformFeeResult.id;
          await platformFeeTx.save();
        } else {
          await Transaction.create({
            transactionId: `PLATFORM-FEE-${Date.now()}`,
            user: client._id,
            booking: booking._id,
            type: 'platform_fee',
            amount: booking.platformFee,
            currency: 'USDC',
            status: 'completed',
            description: `Platform fee for ${booking.serviceTitle || 'service'}`,
            transactionHash: platformFeeResult.reference || platformFeeResult.id,
            metadata: {
              toAddress: PLATFORM_WALLET_ADDRESS,
              network: 'SOL'
            }
          });
        }
        console.log('✓ Platform fee transaction recorded\n');

      } catch (error) {
        console.error('❌ FAILED:', error.message);
        if (error.response?.data) {
          console.error('HostFi Error:', JSON.stringify(error.response.data, null, 2));
        }
        console.log('');
      }
    }

    // Update booking if both succeeded
    if (!needsCreatorPayout || !needsPlatformFee) {
      booking.fundsReleased = true;
      booking.fundsReleasedAt = new Date();
      await booking.save();
      console.log('✓ Booking updated as funds released\n');
    }

    console.log('========================================');
    console.log('CHECK & FIX COMPLETE');
    console.log('========================================');

    await mongoose.disconnect();

  } catch (error) {
    console.error('Fatal Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkAndFixPayout();
