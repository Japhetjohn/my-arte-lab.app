/**
 * Migration Script: Tsara to bread.africa
 *
 * This script migrates existing users from the old Tsara wallet system
 * to the new bread.africa integration.
 *
 * What it does:
 * 1. Finds all users without bread.africa wallet IDs
 * 2. Creates bread.africa wallets for each user
 * 3. Preserves existing balance and transaction history
 * 4. Logs the migration progress
 *
 * Usage: node scripts/migrateToBread.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');
const walletController = require('../src/controllers/walletController');

const MONGO_URI = process.env.MONGODB_URI;

async function migrateToBread() {
  try {
    console.log('🚀 Starting migration from Tsara to bread.africa...\n');

    // Connect to MongoDB
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB\n');

    // Find all users without bread.africa wallets
    const usersToMigrate = await User.find({
      'wallet.breadWalletId': { $exists: false }
    }).select('_id name email wallet');

    console.log(`📊 Found ${usersToMigrate.length} users to migrate\n`);

    if (usersToMigrate.length === 0) {
      console.log('✨ All users already migrated to bread.africa!');
      process.exit(0);
    }

    let successCount = 0;
    let failCount = 0;
    const failures = [];

    // Migrate each user
    for (const user of usersToMigrate) {
      try {
        console.log(`\n🔄 Migrating user: ${user.name} (${user.email})`);
        console.log(`   User ID: ${user._id}`);
        console.log(`   Current Balance: ${user.wallet.balance} USDC`);

        // Initialize bread.africa account
        const result = await walletController.initializeBreadAccount(
          user._id,
          user.name,
          user.email
        );

        if (result && result.breadWalletId) {
          console.log(`   ✅ bread.africa wallet created: ${result.breadWalletId}`);
          if (result.evmAddress) {
            console.log(`   📍 EVM Address: ${result.evmAddress}`);
          }
          if (result.svmAddress) {
            console.log(`   📍 SVM Address: ${result.svmAddress}`);
          }
          successCount++;
        } else {
          console.log(`   ⚠️  Failed to create wallet (returned null)`);
          failCount++;
          failures.push({
            userId: user._id,
            name: user.name,
            email: user.email,
            reason: 'Returned null result'
          });
        }
      } catch (error) {
        console.log(`   ❌ Error migrating user: ${error.message}`);
        failCount++;
        failures.push({
          userId: user._id,
          name: user.name,
          email: user.email,
          reason: error.message
        });
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📈 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total users processed: ${usersToMigrate.length}`);
    console.log(`✅ Successfully migrated: ${successCount}`);
    console.log(`❌ Failed migrations: ${failCount}`);

    if (failures.length > 0) {
      console.log('\n⚠️  FAILED MIGRATIONS:');
      console.log('='.repeat(60));
      failures.forEach((failure, index) => {
        console.log(`\n${index + 1}. ${failure.name} (${failure.email})`);
        console.log(`   User ID: ${failure.userId}`);
        console.log(`   Reason: ${failure.reason}`);
      });
    }

    console.log('\n✨ Migration complete!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('\n📊 Database connection closed');
  }
}

// Run migration
migrateToBread()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
