const axios = require('axios');

async function testDevnet() {
    try {
        console.log('Fetching HostFi Access Token from Devnet...');
        const tokenResponse = await axios({
            method: 'POST',
            url: 'https://api.dev.hostcap.io/auth/token',
            headers: { accept: 'application/json', 'content-type': 'application/json' },
            data: {
                clientId: 'QYR6YHCA1H',
                secretKey: 'I31n5-xTI6fL_e9KOv1wurHL-mtHv6bTE5cNxVDM'
            }
        });

        console.log('Auth Response:', tokenResponse.data);
        const token = tokenResponse.data.accessToken || (tokenResponse.data.data && tokenResponse.data.data.accessToken);
        console.log('Token acquired successfully.');

        console.log('\n--- Fetching Fiat Currencies ---');
        const curResponse = await axios({
            method: 'GET',
            url: 'https://api.dev.hostcap.io/v1/currency/fiat',
            headers: { accept: 'application/json', authorization: `Bearer ${token}` }
        });

        console.log(JSON.stringify(curResponse.data.data, null, 2));

    } catch (error) {
        console.error('Test Failed:', error.response ? error.response.data : error.message);
    }
}

testDevnet();
