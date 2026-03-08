require('dotenv').config();
const mongoose = require('mongoose');
const hostfi = require('./src/services/hostfiService');
const User = require('./src/models/User');

async function withdrawAll() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const user = await User.findOne({ email: 'japhetjohnk@gmail.com' });
        if (!user) {
            console.log('User not found');
            return;
        }

        console.log('User found:', user.email);

        // List HostFi Assets from API to get latest balances
        console.log('\nFetching latest balances from HostFi API...');
        const assets = await hostfi.getUserWallets();

        const recipient = {
            accountNumber: '7031632438',
            bankId: 'NG::100004',
            bankName: 'OPAY',
            accountName: "JOHN KUULSINIM JAPHET",
            country: 'NG',
            currency: 'NGN'
        };

        for (const asset of assets) {
            const currency = asset.currencyCode || (asset.currency && asset.currency.code) || asset.currency || 'UNKNOWN';
            const balance = Number(asset.balance);
            const assetId = asset.id || asset.assetId;

            if (balance > 0.01 && (currency === 'USDC' || currency === 'NGN')) {
                console.log(`\n--- Initiating Withdrawal for ${balance} ${currency} ---`);
                try {
                    const result = await hostfi.initiateWithdrawal({
                        walletAssetId: assetId,
                        amount: balance,
                        currency: currency,
                        methodId: 'BANK_TRANSFER',
                        recipient: { ...recipient, type: 'BANK' },
                        clientReference: `ALL-${currency}-${Date.now().toString().substring(10)}`,
                        memo: `Withdraw All ${currency}`
                    });
                    console.log(`Success: ${JSON.stringify(result, null, 2)}`);
                } catch (err) {
                    console.error(`Failed to withdraw ${currency}: ${err.message}`);
                    if (err.response) console.error('Error Details:', JSON.stringify(err.response.data, null, 2));
                }
            } else {
                console.log(`Skipping ${currency} (Balance: ${balance})`);
            }
        }

    } catch (error) {
        console.error('General Error:', error.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

withdrawAll();
