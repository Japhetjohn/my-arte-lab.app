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

        const token = authResponse.data.accessToken || authResponse.data.token || authResponse.data.data?.accessToken;

        if (!token) {
            console.error('❌ Failed to get access token.', authResponse.data);
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
            const webhooks = webhookResponse.data.data || webhookResponse.data.records || [];
            console.log(`✅ Found ${webhooks.length} webhooks.`);
            console.log(JSON.stringify(webhooks, null, 2));

            // If no webhooks, we might need to create one?
            // But first let's just see what exists.
        } catch (err) {
            console.warn(`⚠️ Fetch failed: ${err.response?.status} - ${JSON.stringify(err.response?.data)}`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

manageWebhooks();
