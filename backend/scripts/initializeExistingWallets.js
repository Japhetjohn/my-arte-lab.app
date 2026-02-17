require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const hostfiWalletService = require('../src/services/hostfiWalletService');
const hostfiService = require('../src/services/hostfiService');

/**
 * Initialize HostFi wallets and create wallet addresses for existing users
 */
async function initializeExistingWallets() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all users without wallet assets OR without wallet address
    const users = await User.find({
      $or: [
        { 'wallet.hostfiWalletAssets': { $exists: false } },
        { 'wallet.hostfiWalletAssets': { $size: 0 } },
        { 'wallet.address': { $exists: false } },
        { 'wallet.address': null }
      ]
    });

    console.log(`\n📊 Found ${users.length} users needing wallet setup\n`);

    if (users.length === 0) {
      console.log('✅ All users already have wallets and addresses!');
      process.exit(0);
    }

    let successCount = 0;
    let failCount = 0;
    let addressCreated = 0;

    for (const user of users) {
      try {
        console.log(`Processing ${user.email}...`);

        // Initialize HostFi wallets if not done
        if (!user.wallet.hostfiWalletAssets || user.wallet.hostfiWalletAssets.length === 0) {
          await hostfiWalletService.initializeUserWallets(user._id);
          console.log(`   ✅ Initialized wallet assets`);
        } else {
          console.log(`   ℹ️  Wallet assets already initialized`);
        }

        // Create Solana USDC collection address if not exists
        if (!user.wallet.address) {
          try {
            const assetId = await hostfiWalletService.getWalletAssetId(user._id, 'USDC');

            if (assetId) {
              const cryptoAddress = await hostfiService.createCryptoCollectionAddress({
                assetId,
                currency: 'USDC',
                network: 'SOL',  // HostFi expects 'SOL' not 'Solana'
                customId: user._id.toString()
              });

              // Update user with wallet address
              const updatedUser = await User.findById(user._id);
              updatedUser.wallet.address = cryptoAddress.address;
              updatedUser.wallet.network = 'SOL';
              await updatedUser.save({ validateBeforeSave: false });

              addressCreated++;
              console.log(`   ✅ Created wallet address: ${cryptoAddress.address.substring(0, 10)}...`);
            }
          } catch (addrError) {
            console.error(`   ⚠️  Wallet address creation failed: ${addrError.message}`);
          }
        } else {
          console.log(`   ℹ️  Wallet address already exists: ${user.wallet.address.substring(0, 10)}...`);
        }

        successCount++;
        console.log(`✅ Complete: ${user.email}\n`);
      } catch (error) {
        failCount++;
        console.error(`❌ Failed: ${user.email} - ${error.message}\n`);
      }
    }

    console.log(`\n📈 Results:`);
    console.log(`✅ Successfully processed: ${successCount} users`);
    console.log(`🏦 Wallet addresses created: ${addressCreated} users`);
    console.log(`❌ Failed: ${failCount} users`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
initializeExistingWallets();
