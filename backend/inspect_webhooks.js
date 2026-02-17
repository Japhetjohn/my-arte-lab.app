const axios = require('axios');

const API_URL = 'https://api.hostcap.io';
const CLIENT_ID = 'QYR6YHCA1H';
const SECRET_KEY = 'I31n5-xTI6fL_e9KOv1wurHL-mtHv6bTE5cNxVDM';

async function manageWebhooks() {
    console.log('🔍 Inspecting HostFi Webhook Settings...');

    try {
        // 1. Authenticate
        console.log('🔑 Authenticating...');
        const authResponse = await axios.post(`${API_URL}/api/v1/auth/login`, {
            clientId: CLIENT_ID,
            clientSecret: SECRET_KEY
        });

        // Check for different token fields just in case
        const token = authResponse.data.accessToken ||
            authResponse.data.token ||
            authResponse.data.data?.accessToken ||
            authResponse.data.data?.token;

        if (!token) {
            console.error('❌ Failed to get access token.', JSON.stringify(authResponse.data, null, 2));
            return;
        }
        console.log('✅ Authenticated.');

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        // 2. Fetch Existing Webhooks
        console.log('📡 Fetching Existing Webhooks...');
        try {
            const webhookResponse = await axios.get(`${API_URL}/api/v1/webhooks`, { headers });
            // console.log('Raw Response:', JSON.stringify(webhookResponse.data, null, 2));

            const webhooks = webhookResponse.data.data || webhookResponse.data.records || [];

            if (Array.isArray(webhooks)) {
                console.log(`✅ Found ${webhooks.length} webhooks.`);
                webhooks.forEach(wh => {
                    console.log(`   - ID: ${wh.id}`);
                    console.log(`     URL: ${wh.url || wh.endpoint}`);
                    console.log(`     Events: ${wh.events?.join(', ')}`);
                    console.log(`     Secret: ${wh.secret || '******'}`); // Often masked
                });
            } else {
                console.log('⚠️ Unexpected response format:', webhookResponse.data);
            }

        } catch (err) {
            console.warn(`⚠️ Fetch failed: ${err.response?.status}`);
            if (err.response?.data) console.warn(JSON.stringify(err.response.data, null, 2));
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

manageWebhooks();
