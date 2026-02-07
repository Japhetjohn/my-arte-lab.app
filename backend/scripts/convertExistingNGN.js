const mongoose = require('mongoose');
const User = require('../src/models/User');
const Transaction = require('../src/models/Transaction');
const hostfiService = require('../src/services/hostfiService');

/**
 * One-time script to convert existing NGN balance to USDC
 * Run with: node scripts/convertExistingNGN.js <userId>
 */

async function convertExistingNGN(userId) {
  try {
    console.log('🔄 Starting NGN to USDC conversion...\n');

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    console.log(`User: ${user.firstName} ${user.lastName}`);
    console.log(`Current wallet balance: ${user.wallet.balance} USDC\n`);

    // Get all wallet assets from HostFi
    console.log('Fetching HostFi wallet assets...');
    const assets = await hostfiService.getUserWallets();

    // Find NGN and USDC assets
    const ngnAsset = assets.find(a =>
      (a.currency?.code === 'NGN' || a.currency === 'NGN') && a.type === 'FIAT'
    );
    const usdcAsset = assets.find(a =>
      (a.currency?.code === 'USDC' || a.currency === 'USDC') && a.type === 'CRYPTO'
    );

    if (!ngnAsset) {
      throw new Error('NGN asset not found in HostFi wallet');
    }
    if (!usdcAsset) {
      throw new Error('USDC asset not found in HostFi wallet');
    }

    const ngnBalance = parseFloat(ngnAsset.balance || 0);

    console.log(`\n💰 NGN Asset:`);
    console.log(`   Asset ID: ${ngnAsset.id}`);
    console.log(`   Balance: ${ngnBalance} NGN`);

    console.log(`\n💰 USDC Asset:`);
    console.log(`   Asset ID: ${usdcAsset.id}`);
    console.log(`   Balance: ${usdcAsset.balance} USDC`);

    if (ngnBalance <= 0) {
      console.log('\n⚠️  No NGN balance to convert!');
      return;
    }

    // Convert NGN to USDC
    console.log(`\n🔄 Converting ${ngnBalance} NGN to USDC...`);

    const swapResult = await hostfiService.swapAssets({
      fromAssetId: ngnAsset.id,
      toAssetId: usdcAsset.id,
      amount: ngnBalance,
      currency: 'NGN'
    });

    const usdcAmount = parseFloat(swapResult.toAmount || swapResult.amount || 0);
    const exchangeRate = swapResult.rate || 'N/A';

    console.log(`\n✅ Conversion successful!`);
    console.log(`   ${ngnBalance} NGN → ${usdcAmount} USDC`);
    console.log(`   Exchange rate: ${exchangeRate}`);

    // Credit user wallet
    console.log(`\n💳 Crediting wallet...`);

    const platformFee = 0; // No fee for deposits
    const netAmount = usdcAmount;

    user.wallet.balance += netAmount;
    user.wallet.totalEarnings += netAmount;

    // Update HostFi asset balances
    if (user.wallet.hostfiWalletAssets && user.wallet.hostfiWalletAssets.length > 0) {
      const storedAsset = user.wallet.hostfiWalletAssets.find(a =>
        a.assetId === usdcAsset.id || a.currency === 'USDC'
      );
      if (storedAsset) {
        storedAsset.balance += netAmount;
        storedAsset.lastSynced = new Date();
      }
    }

    user.wallet.lastUpdated = new Date();
    await user.save();

    // Create transaction record
    const txnRef = `manual-ngn-conversion-${Date.now()}`;
    await Transaction.create({
      user: userId,
      transactionId: txnRef,
      reference: txnRef,
      type: 'deposit',
      amount: usdcAmount,
      currency: 'USDC',
      status: 'completed',
      description: `Manual conversion - ${ngnBalance} NGN → ${usdcAmount} USDC`,
      platformFee: platformFee,
      netAmount: netAmount,
      paymentMethod: 'bank_transfer',
      completedAt: new Date(),
      paymentDetails: {
        actualAmount: ngnBalance,
        fiatCurrency: 'NGN',
        usdcAmount: usdcAmount,
        exchangeRate: exchangeRate,
        platformFee: platformFee,
        reference: txnRef
      },
      metadata: {
        provider: 'hostfi',
        type: 'fiat_collection',
        assetType: 'FIAT',
        manualConversion: true,
        processedAt: new Date(),
        conversionDetails: {
          fromAmount: ngnBalance,
          fromCurrency: 'NGN',
          toAmount: usdcAmount,
          toCurrency: 'USDC',
          rate: exchangeRate
        },
        feeBreakdown: {
          grossAmount: usdcAmount,
          platformFee: platformFee,
          amountAfterFee: netAmount
        }
      }
    });

    console.log(`\n✅ Wallet credited: ${netAmount.toFixed(4)} USDC`);
    console.log(`🎉 New wallet balance: ${user.wallet.balance.toFixed(4)} USDC\n`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.hostfiError) {
      console.error('HostFi error details:', JSON.stringify(error.hostfiError, null, 2));
    }
    throw error;
  }
}

// Run the script
if (require.main === module) {
  const userId = process.argv[2];

  if (!userId) {
    console.error('Usage: node scripts/convertExistingNGN.js <userId>');
    process.exit(1);
  }

  // Connect to MongoDB
  require('dotenv').config();

  mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(async () => {
    console.log('✅ Connected to MongoDB\n');
    await convertExistingNGN(userId);
    process.exit(0);
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });
}

module.exports = { convertExistingNGN };
