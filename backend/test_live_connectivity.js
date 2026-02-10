require('dotenv').config();
const hostfiService = require('./src/services/hostfiService');

async function testLive() {
    try {
        console.log('--- Testing HostFi Live Connectivity ---');
        console.log('API URL:', hostfiService.api.defaults.baseURL);
        console.log('Client ID:', hostfiService.clientId);

        const token = await hostfiService.getAccessToken();
        console.log('Token obtained successfully. Length:', token.length);

        console.log('\n--- Fetching Live Wallet Assets ---');
        const assets = await hostfiService.getUserWallets();
        console.log('Number of live assets found:', assets.length);

        if (assets.length > 0) {
            console.log('First Live Asset:', assets[0].currency.code || assets[0].currency);
            console.log('Balance:', assets[0].balance);
        }

        console.log('\n✅ Live environment connectivity verified!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Live connectivity test failed!');
        console.error('Error:', error.message);
        if (error.hostfiError) {
            console.error('HostFi Error:', JSON.stringify(error.hostfiError, null, 2));
        }
        process.exit(1);
    }
}

testLive();
