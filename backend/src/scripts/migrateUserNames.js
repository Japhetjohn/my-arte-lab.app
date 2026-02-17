const mongoose = require('mongoose');
require('dotenv').config();

async function migrateUserNames() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/myartelab');
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Find all users without firstName/lastName
    const usersToMigrate = await usersCollection.find({
      $or: [
        { firstName: { $exists: false } },
        { lastName: { $exists: false } },
        { firstName: null },
        { lastName: null }
      ]
    }).toArray();

    console.log(`\nFound ${usersToMigrate.length} users to migrate`);

    if (usersToMigrate.length === 0) {
      console.log('No users need migration');
      process.exit(0);
    }

    let migrated = 0;
    let skipped = 0;

    for (const user of usersToMigrate) {
      if (!user.name || user.name.trim() === '') {
        console.log(`⚠️  Skipping ${user.email} - no name field`);

        // Set default values for users with no name
        await usersCollection.updateOne(
          { _id: user._id },
          {
            $set: {
              firstName: 'User',
              lastName: user._id.toString().substring(0, 8)
            }
          }
        );
        skipped++;
        continue;
      }

      // Split name into firstName and lastName
      const nameParts = user.name.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            firstName: firstName,
            lastName: lastName || firstName
          }
        }
      );

      console.log(`✅ Migrated: ${user.name} → firstName: "${firstName}", lastName: "${lastName || firstName}"`);
      migrated++;
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   Migrated: ${migrated}`);
    console.log(`   Skipped (no name): ${skipped}`);
    console.log(`   Total: ${usersToMigrate.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateUserNames();
