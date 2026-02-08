const axios = require('axios');

const API_URL = 'https://api.hostcap.io';
const CLIENT_ID = 'QYR6YHCA1H';
const SECRET_KEY = 'I31n5-xTI6fL_e9KOv1wurHL-mtHv6bTE5cNxVDM';
const NEW_SECRET = '1960de1eec0dd7cb6a3dd243bd852f75dd7104772a539cb9e880dcc5a7826e2f';
const BASE_URL = 'https://app.myartelab.com/api/hostfi/webhooks';

// HostFi uses individual endpoints per event type
const EVENT_ENDPOINTS = {
    'fiat_deposit': `${BASE_URL}/fiat-deposit`,
    'crypto_deposit': `${BASE_URL}/crypto-deposit`,
    'fiat_payout': `${BASE_URL}/fiat-payout`,
    'crypto_payout': `${BASE_URL}/crypto-payout`,
    'address_generated': `${BASE_URL}/address-generated`
};

async function updateWebhooks() {
    console.log('🔄 Updating HostFi Webhooks...');

    try {
        // 1. Authenticate
        console.log('🔑 Authenticating...');
        const authResponse = await axios.post(`${API_URL}/api/v1/auth/login`, {
            clientId: CLIENT_ID,
            clientSecret: SECRET_KEY
        });

        const token = authResponse.data.accessToken || authResponse.data.data?.accessToken;
        if (!token) {
            console.error('❌ Auth Failed:', authResponse.data);
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

            console.log(`found ${webhooks.length} existing webhooks.`);

            // 3. Delete ALL Existing Webhooks (To start fresh)
            for (const wh of webhooks) {
                console.log(`🗑️ Deleting Webhook ${wh.id}...`);
                await axios.delete(`${API_URL}/api/v1/webhooks/${wh.id}`, { headers });
            }
            console.log('✅ All old webhooks deleted.');

        } catch (err) {
            console.warn(`⚠️ Fetch/Delete Error: ${err.message}`);
        }

        // 4. Create New Webhooks
        console.log('🆕 Creating New Webhooks...');

        // We iterate over our map because HostFi likely expects one subscription per event/url
        // Based on user screenshot showing multiple subscriptions.

        /* 
           NOTE: The user screenshot shows "Select Events" dropdown. 
           If the API supports array of events, we could do 1 webhook.
           But the screenshot shows SEPARATE rows for each event type with distinct URLs.
           So we will create separate subscriptions as per the screenshot.
        */

        for (const [event, url] of Object.entries(EVENT_ENDPOINTS)) {
            console.log(`➕ Subscribing to [${event}] -> ${url}`);

            // Map internal keys to display names or API enums if needed
            // Assuming the API takes 'events': ['fiat_deposit'] etc.
            // User screenshot shows "Fiat Deposits" text but API likely uses snake_case IDs.

            const payload = {
                url: url,
                events: [event], // Array of event types
                secret: NEW_SECRET
            };

            try {
                await axios.post(`${API_URL}/api/v1/webhooks`, payload, { headers });
                console.log(`   ✅ Subscribed to ${event}`);
            } catch (err) {
                console.error(`   ❌ Failed to subscribe to ${event}:`);
                if (err.response) console.error(JSON.stringify(err.response.data, null, 2));
                else console.error(err.message);
            }
        }

        console.log('\n✨ Webhook Update Complete!');

    } catch (error) {
        console.error('❌ Critical Error:', error.message);
    }
}

updateWebhooks();
