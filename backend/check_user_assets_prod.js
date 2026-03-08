require('dotenv').config();
const mongoose = require('mongoose');
const hostfi = require('./src/services/hostfiService');
const User = require('./src/models/User');

async function checkAssets() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const user = await User.findOne({ email: 'japhetjohnk@gmail.com' });
        if (!user) {
            console.log('User not found');
            return;
        }

        console.log('User found:', user.email);

        // List HostFi Assets from API
        console.log('\nAssets from API:');
        const assets = await hostfi.getUserWallets();
        assets.forEach(asset => {
            const currency = asset.currencyCode || (asset.currency && asset.currency.code) || asset.currency || 'UNKNOWN';
            console.log(`- ${currency}: ${asset.balance} (ID: ${asset.id || asset.assetId})`);
        });

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await mongoose.disconnect();
    }
}

checkAssets();
