const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');
const hostfiWalletService = require('../src/services/hostfiWalletService');

async function migrateTsaraWallets() {
    console.log('--- Starting Tsara Wallet Migration ---');

    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find all users who don't have a tsaraAddress yet
        const users = await User.find({
            $or: [
                { 'wallet.tsaraAddress': { $exists: false } },
                { 'wallet.tsaraAddress': null }
            ]
        });

        console.log(`Found ${users.length} users needing Tsara wallet initialization.`);

        let successCount = 0;
        let failCount = 0;

        for (const user of users) {
            console.log(`Processing user: ${user.email} (${user._id})`);
            try {
                await hostfiWalletService.initializeUserWallets(user._id);
                successCount++;
                console.log(`Successfully initialized wallet for ${user.email}`);
            } catch (err) {
                failCount++;
                console.error(`Failed to initialize wallet for ${user.email}:`, err.message);
            }
        }

        console.log('\n--- Migration Summary ---');
        console.log(`Total users processed: ${users.length}`);
        console.log(`Success: ${successCount}`);
        console.log(`Failures: ${failCount}`);

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.connection.close();
        console.log('MongoDB connection closed.');
        process.exit(0);
    }
}

migrateTsaraWallets();
