require('dotenv').config();
const mongoose = require('mongoose');
const hostfiWalletService = require('./src/services/hostfiWalletService');
const User = require('./src/models/User');

async function test() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const userId = '697ce1ce1dda0f8bcc8ae3d9';
        console.log(`\n--- Syncing Wallet for User ${userId} ---`);

        // This will trigger the new parsing logic in hostfiWalletService.syncWalletBalances
        const user = await hostfiWalletService.syncWalletBalances(userId);

        console.log('\n--- Sync Results ---');
        console.log('Wallet Currency:', user.wallet.currency);
        console.log('Aggregate Balance:', user.wallet.balance);

        if (user.wallet.hostfiWalletAssets && user.wallet.hostfiWalletAssets.length > 0) {
            console.log('\nAsset Breakdown:');
            user.wallet.hostfiWalletAssets.forEach(asset => {
                console.log(`- ${asset.currency}: Balance=${asset.balance}, Reserved=${asset.reservedBalance || 0}`);
            });
        }

        console.log('\nTest Complete');
        process.exit(0);
    } catch (error) {
        console.error('Test failed:', error.message);
        process.exit(1);
    }
}

test();
