const mongoose = require('mongoose');
require('dotenv').config();

async function cleanupTestUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/myartelab');
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Find japhet john user to preserve
    const japhetUser = await usersCollection.findOne({
      $or: [
        { email: 'johnjaphetkuulsinim@gmail.com' },
        { firstName: { $regex: /japhet/i } },
        { name: { $regex: /japhet/i } }
      ]
    });

    if (!japhetUser) {
      console.log('⚠️  Could not find japhet john user! Aborting to be safe.');
      process.exit(1);
    }

    console.log(`✅ Found user to preserve: ${japhetUser.firstName || japhetUser.name} (${japhetUser.email})`);

    // Delete all users except japhet john
    const deleteResult = await usersCollection.deleteMany({
      _id: { $ne: japhetUser._id }
    });

    console.log(`\n🗑️  Deleted ${deleteResult.deletedCount} test users`);
    console.log(`✅ Kept: ${japhetUser.firstName || japhetUser.name} (${japhetUser.email})`);

    // Show remaining users
    const remainingUsers = await usersCollection.find({}).toArray();
    console.log(`\n📊 Total users in database: ${remainingUsers.length}`);
    remainingUsers.forEach(user => {
      console.log(`   - ${user.firstName || user.name} ${user.lastName || ''} (${user.email}) - ${user.role}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

cleanupTestUsers();
