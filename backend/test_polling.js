require('dotenv').config();
const mongoose = require('mongoose');
const depositPollingService = require('./src/services/depositPollingService');
const hostfiService = require('./src/services/hostfiService');
const User = require('./src/models/User');

async function testPolling() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    // Mock HostFi Service methods to avoid actual API calls/swaps
    // We want to test logic, not external API
    hostfiService.getFiatCollectionTransactions = async () => ({
        records: [
            {
                id: 'TEST-FIAT-' + Date.now(),
                status: 'SUCCESSFUL',
                amount: 5000,
                currency: 'NGN',
                customId: '67a783da397576c94411135c', // Japhet
                metadata: { customId: '67a783da397576c94411135c' }
            }
        ]
    });

    hostfiService.getUserWallets = async () => [
        { id: 'asset-ngn', currency: 'NGN', type: 'FIAT' },
        { id: 'asset-usdc', currency: 'USDC', type: 'CRYPTO' },
        { id: 'asset-btc', currency: 'BTC', type: 'CRYPTO' }
    ];

    hostfiService.swapAssets = async () => ({
        rate: 0.00066,
        amount: 3.3 // 5000 NGN -> 3.3 USDC
    });

    hostfiService.getWalletTransactions = async (assetId) => {
        if (assetId === 'asset-btc') {
            return {
                records: [
                    {
                        id: 'TEST-BTC-' + Date.now(),
                        status: 'SUCCESSFUL',
                        amount: 0.001, // 0.001 BTC
                        currency: 'BTC', // HostFi might not send currency in txn object, relying on asset
                        customId: '67a783da397576c94411135c',
                        address: 'bc1qtest...',
                        txHash: 'hash...',
                        network: 'BTC'
                    }
                ]
            };
        }
        return { records: [] };
    };

    // Mock Currency Rates for updateBalance
    hostfiService.getCurrencyRates = async (from, to) => {
        if (from === 'BTC' && to === 'NGN') return { rate: 100000000 }; // 1 BTC = 100M NGN
        if (from === 'USDC' && to === 'NGN') return { rate: 1500 };
        return { rate: 1 };
    };

    console.log('--- Testing Fiat Collection ---');
    await depositPollingService.checkFiatCollections();

    console.log('\n--- Testing Crypto Deposit ---');
    await depositPollingService.checkCryptoDeposits();

    // Verify User Balance
    const user = await User.findById('67a783da397576c94411135c');
    console.log('\n--- User Status ---');
    console.log(`Balance: ${user.wallet.balance} ${user.wallet.currency}`);

    process.exit();
}

testPolling();
