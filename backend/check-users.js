require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function checkUsers() {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Get all users
        const users = await User.find({}).select('+password').lean();

        console.log(`📊 Total Users: ${users.length}\n`);

        users.forEach((user, index) => {
            console.log(`\n=== USER ${index + 1} ===`);
            console.log(`ID: ${user._id}`);
            console.log(`Name: ${user.name}`);
            console.log(`Email: ${user.email}`);
            console.log(`Role: ${user.role}`);
            console.log(`Wallet Address: ${user.wallet?.address}`);
            console.log(`Wallet Balance: ${user.wallet?.balance} ${user.wallet?.currency}`);
            console.log(`Email Verified: ${user.isEmailVerified}`);
            console.log(`Created: ${user.createdAt}`);
            console.log(`Has Password: ${user.password ? 'Yes (hashed)' : 'No'}`);
        });

        console.log('\n✅ Done');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkUsers();
