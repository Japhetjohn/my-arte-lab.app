require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const hostfiWalletService = require('../src/services/hostfiWalletService');

/**
 * Initialize HostFi wallets for existing users who don't have wallet assets
 */
async function initializeExistingWallets() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all users without wallet assets
    const users = await User.find({
      $or: [
        { 'wallet.hostfiWalletAssets': { $exists: false } },
        { 'wallet.hostfiWalletAssets': { $size: 0 } }
      ]
    });

    console.log(`\n📊 Found ${users.length} users without HostFi wallets\n`);

    if (users.length === 0) {
      console.log('✅ All users already have wallets initialized!');
      process.exit(0);
    }

    let successCount = 0;
    let failCount = 0;

    for (const user of users) {
      try {
        console.log(`Initializing wallet for ${user.email}...`);

        // Initialize HostFi wallets
        await hostfiWalletService.initializeUserWallets(user._id);

        successCount++;
        console.log(`✅ Success: ${user.email}`);
      } catch (error) {
        failCount++;
        console.error(`❌ Failed: ${user.email} - ${error.message}`);
      }
    }

    console.log(`\n📈 Results:`);
    console.log(`✅ Successfully initialized: ${successCount} users`);
    console.log(`❌ Failed: ${failCount} users`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
initializeExistingWallets();
