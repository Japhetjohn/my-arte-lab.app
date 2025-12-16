require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const walletEncryption = require('../src/services/walletEncryption');

async function migrateWalletEncryption() {
  try {
    console.log('Starting wallet encryption migration...\n');

    if (!process.env.WALLET_ENCRYPTION_KEY) {
      throw new Error('WALLET_ENCRYPTION_KEY must be set before running migration');
    }

    if (process.env.WALLET_ENCRYPTION_KEY === process.env.JWT_SECRET) {
      throw new Error('WALLET_ENCRYPTION_KEY must be different from JWT_SECRET');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database');

    const users = await User.find({
      'wallet.encryptedPrivateKey': { $exists: true }
    }).select('+wallet.encryptedPrivateKey');

    console.log(`Found ${users.length} users with encrypted wallets\n`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of users) {
      try {
        const encryptedKey = user.wallet.encryptedPrivateKey;

        if (walletEncryption.isNewFormat(encryptedKey)) {
          console.log(`✓ User ${user._id} already using new format - skipping`);
          skipped++;
          continue;
        }

        if (!walletEncryption.isLegacyFormat(encryptedKey)) {
          console.log(`⚠ User ${user._id} has unknown encryption format - skipping`);
          skipped++;
          continue;
        }

        const newEncryptedKey = walletEncryption.migrateToNewEncryption(encryptedKey);

        user.wallet.encryptedPrivateKey = newEncryptedKey;
        await user.save({ validateBeforeSave: false });

        console.log(`✓ Migrated wallet for user ${user._id}`);
        migrated++;
      } catch (error) {
        console.error(`✗ Error migrating user ${user._id}:`, error.message);
        errors++;
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total users: ${users.length}`);
    console.log(`Migrated: ${migrated}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);

    if (errors > 0) {
      console.log('\n⚠ WARNING: Some wallets failed to migrate. Review errors above.');
      process.exit(1);
    } else {
      console.log('\n✓ Migration completed successfully!');
      process.exit(0);
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

if (require.main === module) {
  migrateWalletEncryption();
}

module.exports = migrateWalletEncryption;
