const axios = require('axios');
require('dotenv').config();

const clientId = process.env.HOSTFI_CLIENT_ID;
const secretKey = process.env.HOSTFI_SECRET_KEY;

async function diagnose() {
    console.log('--- HostFi Environment Diagnostic ---');
    console.log('Client ID:', clientId);

    const envs = [
        { name: 'DEV', url: 'https://api.dev.hostcap.io/auth/token' },
        { name: 'LIVE', url: 'https://api.hostcap.io/auth/token' }
    ];

    for (const env of envs) {
        try {
            console.log(`\nTesting ${env.name} (${env.url})...`);
            const response = await axios.post(env.url, {
                clientId: clientId,
                clientSecret: secretKey
            }, { timeout: 10000 });

            console.log(`✅ ${env.name} Authentication SUCCESS!`);
            console.log('Token starts with:', response.data.token.substring(0, 10));
        } catch (error) {
            console.log(`❌ ${env.name} Authentication FAILED`);
            console.log('Status:', error.response?.status);
            console.log('Message:', error.response?.data?.message || error.message);
        }
    }
}

diagnose();
