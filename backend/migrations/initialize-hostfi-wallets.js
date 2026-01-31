const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../src/models/User');
const hostfiWalletService = require('../src/services/hostfiWalletService');

async function initializeHostFiWallets() {
  console.log('🚀 Starting HostFi Wallet Initialization Migration...\n');

  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all users
    const users = await User.find({});
    console.log(`📊 Found ${users.length} users to process\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        console.log(`Processing: ${user.firstName} ${user.lastName} (${user.email})`);

        // Check if user already has HostFi wallet
        if (user.wallet.hostfiWalletId) {
          console.log(`  ⏭️  Already has HostFi wallet, skipping...`);
          skipCount++;
          continue;
        }

        // Initialize HostFi wallet
        const result = await hostfiWalletService.initializeUserWallets(user._id);

        console.log(`  ✅ Initialized HostFi wallet`);
        console.log(`     User ID: ${result._id}`);
        successCount++;

      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
        errorCount++;
      }

      console.log(''); // Empty line
    }

    console.log('\n═══════════════════════════════════════════');
    console.log('  Migration Complete!');
    console.log('═══════════════════════════════════════════');
    console.log(`✅ Success: ${successCount} users`);
    console.log(`⏭️  Skipped: ${skipCount} users (already had wallet)`);
    console.log(`❌ Errors: ${errorCount} users`);
    console.log('═══════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
  }
}

initializeHostFiWallets();
