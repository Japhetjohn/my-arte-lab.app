require('dotenv').config();
const axios = require('axios');

async function testDevnet() {
    const API_URL = 'https://api.dev.hostcap.io';
    const CLIENT_ID = process.env.HOSTFI_CLIENT_ID;
    const SECRET_KEY = process.env.HOSTFI_SECRET_KEY;

    console.log('Testing HostFi Devnet with:');
    console.log('URL:', API_URL);
    console.log('Client ID:', CLIENT_ID);

    try {
        console.log('\n1. Getting Access Token...');
        // Try /auth/token first (from test_devnet.js)
        let tokenResponse;
        try {
            tokenResponse = await axios.post(`${API_URL}/auth/token`, {
                clientId: CLIENT_ID,
                secretKey: SECRET_KEY
            });
            console.log('Using /auth/token SUCCESS');
        } catch (e) {
            console.log('Using /auth/token FAILED, trying /v1/auth/tokens...');
            tokenResponse = await axios.post(`${API_URL}/v1/auth/tokens`, {
                clientId: CLIENT_ID,
                secretKey: SECRET_KEY
            });
            console.log('Using /v1/auth/tokens SUCCESS');
        }

        const token = tokenResponse.data.accessToken || tokenResponse.data.token || tokenResponse.data.data?.accessToken || tokenResponse.data.data?.token;
        console.log('Token acquired:', token ? 'SUCCESS' : 'FAILED');

        if (!token) {
            console.error('Token response:', tokenResponse.data);
            return;
        }

        // Try Bearer token first (from test_devnet.js)
        const headers = { 'authorization': `Bearer ${token}` };

        console.log('\n2. Getting Supported Currencies...');
        const currenciesResponse = await axios.get(`${API_URL}/v1/assets`, { headers });
        const assets = currenciesResponse.data.assets || currenciesResponse.data.data || [];
        console.log('Supported Assets count:', assets.length);
        if (assets.length > 0) {
            console.log('First 1 asset:', JSON.stringify(assets[0], null, 2));
        }

        console.log('\n3. Getting Fiat Currencies...');
        const fiatResponse = await axios.get(`${API_URL}/v1/currency/fiat`, { headers });
        console.log('Fiat Currencies count:', (fiatResponse.data.data || fiatResponse.data).length);

    } catch (error) {
        console.error('Error during test:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Message:', error.message);
        }
    }
}

testDevnet();
