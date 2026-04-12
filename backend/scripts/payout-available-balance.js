#!/usr/bin/env node
/**
 * Payout using only available balance (not reserved)
 * Run: node scripts/payout-available-balance.js [amount]
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Booking = require('../src/models/Booking');
const Transaction = require('../src/models/Transaction');
const hostfiService = require('../src/services/hostfiService');
const tsaraService = require('../src/services/tsaraService');

async function payoutAvailable() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myartelab');
    
    console.log('========================================');
    console.log('PAYOUT AVAILABLE BALANCE');
    console.log('========================================\n');

    // Get japhet (source of funds)
    const client = await User.findOne({ email: 'japhetjohnk@gmail.com' });
    if (!client) {
      console.error('❌ japhetjohnk@gmail.com not found');
      process.exit(1);
    }

    const clientUsdcAsset = client.wallet?.hostfiWalletAssets?.find(a => a.currency === 'USDC');
    if (!clientUsdcAsset?.assetId) {
      console.error('❌ USDC asset not found');
      process.exit(1);
    }

    const totalBalance = clientUsdcAsset.balance || 0;
    const reserved = clientUsdcAsset.reservedBalance || 0;
    const dbAvailable = totalBalance - reserved;
    
    // HostFi reported this amount as available during payout error
    const hostFiAvailable = 0.731769;
    
    // Use HostFi's available amount (not database) since DB is out of sync
    const available = hostFiAvailable;

    console.log(`Source: japhetjohnk@gmail.com`);
    console.log(`Asset ID: ${clientUsdcAsset.assetId}`);
    console.log(`DB Total Balance: ${totalBalance} USDC`);
    console.log(`DB Reserved: ${reserved} USDC`);
    console.log(`DB Available: ${dbAvailable} USDC`);
    console.log(`HostFi Available: ${hostFiAvailable} USDC`);
    console.log(`Using HostFi available: ${available} USDC\n`);

    // Get the booking's creator as recipient
    const bookingId = process.argv[2] || 'BKG-D2B3BB11';
    const booking = await Booking.findOne({ bookingId }).populate('creator');
    
    if (!booking) {
      console.error('❌ Booking not found');
      process.exit(1);
    }

    const creator = booking.creator;
    console.log(`Recipient: ${creator.email}`);

    // Get or create creator wallet
    let creatorWalletAddress = creator.wallet?.address || 
                               creator.wallet?.tsaraAddress || 
                               creator.tsaraAddress;

    if (!creatorWalletAddress) {
      console.log('Creating wallet for creator...');
      const walletResult = await tsaraService.createWallet(
        `${creator.firstName || 'Creator'} ${creator.lastName || ''}`.trim(),
        `creator_${creator._id}_${Date.now()}`,
        { userId: creator._id }
      );
      
      if (walletResult.success) {
        creator.wallet.address = walletResult.data.primary_address;
        creator.wallet.tsaraAddress = walletResult.data.primary_address;
        await creator.save();
        creatorWalletAddress = walletResult.data.primary_address;
      }
    }

    console.log(`Creator Wallet: ${creatorWalletAddress}\n`);

    // Calculate payout amount (use available balance from HostFi, max 0.7 for safety)
    const payoutAmount = Math.min(available, 0.7); // Use 0.7 USDC max for test
    
    if (payoutAmount <= 0) {
      console.error('❌ No available balance to payout');
      process.exit(1);
    }
    
    console.log(`\n⚠️  IMPORTANT: The database shows reserved=balance, but HostFi says ${hostFiAvailable} USDC is available.`);
    console.log(`This means the database is out of sync. Using HostFi's available amount.\n`);

    console.log(`Payout Amount: ${payoutAmount} USDC`);
    console.log(`From: japhetjohnk@gmail.com`);
    console.log(`To: ${creator.email} (${creatorWalletAddress})\n`);

    // Confirm
    console.log('Initiating payout...\n');

    // Do payout
    const payout = await hostfiService.initiateWithdrawal({
      walletAssetId: clientUsdcAsset.assetId,
      amount: payoutAmount,
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
      clientReference: `TEST-PAYOUT-${Date.now()}`,
      memo: `Test payout from available balance`
    });

    console.log('✅ PAYOUT SUCCESSFUL!');
    console.log(`Reference: ${payout.reference || payout.id}`);
    console.log(`Amount: ${payoutAmount} USDC`);
    console.log(`To: ${creatorWalletAddress}\n`);

    // Record transaction
    await Transaction.create({
      transactionId: `TEST-PAYOUT-${Date.now()}`,
      user: creator._id,
      type: 'earning',
      amount: payoutAmount,
      currency: 'USDC',
      status: 'completed',
      description: `Test payout from available balance`,
      transactionHash: payout.reference || payout.id,
      toAddress: creatorWalletAddress
    });

    console.log('✅ Transaction recorded in database');

    await mongoose.disconnect();
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

payoutAvailable();
