require('dotenv').config();
const hostfiService = require('./backend/src/services/hostfiService');

async function verify() {
    console.log('--- HostFi Integration Verification ---');

    try {
        console.log('\n1. Testing Authentication...');
        const token = await hostfiService.getAccessToken();
        console.log('✅ Auth successful. Token obtained.');

        console.log('\n2. Testing Supported Currencies...');
        const currencies = await hostfiService.getSupportedCurrencies();
        console.log(`✅ Fetched ${currencies.length} currencies.`);

        const usdc = currencies.find(c => c.code === 'USDC');
        if (usdc) {
            console.log('USDC Details:', JSON.stringify(usdc, null, 2));
        }

        console.log('\n3. Testing Exchange Rates (USDT/NGN)...');
        const rates = await hostfiService.getCurrencyRates('USDT', 'NGN');
        console.log('Rate USDT/NGN:', rates.rate || rates.data?.rate);

        console.log('\n--- Verification Complete ---');
    } catch (error) {
        console.error('\n❌ Verification failed:');
        if (error.hostfiError) {
            console.error(JSON.stringify(error.hostfiError, null, 2));
        } else {
            console.error(error.message);
        }
        process.exit(1);
    }
}

verify();
