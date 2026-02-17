require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const hostfiService = require('./src/services/hostfiService');

async function checkActualBalances() {
    try {
        console.log('🔄 Checking actual HostFi balances...');
        await mongoose.connect(process.env.MONGODB_URI);

        const email = 'labossvisuals@gmail.com';
        const user = await User.findOne({ email });

        if (!user) {
            console.error('❌ User not found');
            process.exit(1);
        }

        console.log(`User: ${user.email}`);
        console.log(`Internal Ledger Balance: ${user.wallet.balance} ${user.wallet.currency}`);

        // Fetch actual balances from HostFi
        // Note: getUserWallets() returns all assets for the platform account or the sub-accounts?
        // Usually, in this implementation, the platform manages sub-wallets or individual accounts?
        // In MyArteLab, it seems like we use a single HostFi account and track users via customId?
        // OR does each user have their own HostFi sub-account?
        // The code shows user.wallet.hostfiWalletAssets, so they have their own asset IDs.

        const actualAssets = await hostfiService.getUserWallets();
        console.log('--- HostFi Actual Assets (Filtered for this user) ---');

        const userAssetIds = user.wallet.hostfiWalletAssets.map(a => a.assetId);
        const filteredAssets = actualAssets.filter(a => userAssetIds.includes(a.id));

        filteredAssets.forEach(asset => {
            console.log(`Asset: ${asset.currency.code || asset.currency}, ID: ${asset.id}, Balance: ${asset.balance}`);
        });

        console.log('--- All HostFi Assets (Debug) ---');
        actualAssets.forEach(asset => {
            if (asset.balance > 0) {
                console.log(`Asset: ${asset.currency.code || asset.currency}, ID: ${asset.id}, Balance: ${asset.balance}`);
            }
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Balance check failed:', error);
        process.exit(1);
    }
}

checkActualBalances();
