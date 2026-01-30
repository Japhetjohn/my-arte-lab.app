const axios = require('axios');
require('dotenv').config();

const config = {
    prod: 'https://api.hostcap.io',
    dev: 'https://api.dev.hostcap.io',
    creds: {
        clientId: process.env.HOSTFI_CLIENT_ID,
        clientSecret: process.env.HOSTFI_SECRET_KEY
    }
};

async function testAuth(env, url) {
    console.log(`Testing ${env} auth against ${url}...`);
    try {
        const response = await axios.post(`${url}/auth/token`, config.creds);
        console.log(`✅ ${env} Auth SUCCESS! Token: ${response.data.data?.access_token ? 'Received' : 'Missing'}`);
        return true;
    } catch (err) {
        console.log(`❌ ${env} Auth FAILED: ${err.response?.status} - ${err.response?.data?.message || err.message}`);
        return false;
    }
}

async function run() {
    console.log('Credentials:', config.creds.clientId ? 'Present' : 'Missing');

    await testAuth('PROD', config.prod);
    await testAuth('DEV', config.dev);
}

run();
