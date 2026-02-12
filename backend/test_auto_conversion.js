const axios = require('axios');
require('dotenv').config();

async function testWebhook() {
    const webhookUrl = 'http://localhost:5000/api/hostfi/webhooks';
    const userId = '6985e9e84f74dfb2c18e7a54'; // labossvisuals@gmail.com
    const timestamp = Date.now();
    const eventId = `TEST-EVT-${timestamp}`;

    const payload = {
        event: 'fiat_deposit_received',
        id: eventId,
        data: {
            amount: 5000,
            currency: 'NGN',
            status: 'SUCCESS',
            customId: userId,
            channelId: `TEST-CH-${timestamp}`
        }
    };

    const secret = process.env.HOSTFI_WEBHOOK_SECRET || '1960de1eec0dd7cb6a3dd243bd852f75dd7104772a539cb9e880dcc5a7826e2f';

    try {
        console.log(`Sending test webhook for ${payload.data.amount} ${payload.data.currency}...`);
        const response = await axios.post(webhookUrl, payload, {
            headers: {
                'x-auth-secret': secret,
                'Content-Type': 'application/json'
            }
        });

        console.log('Response Status:', response.status);
        console.log('Response Data:', response.data);

        if (response.status === 200) {
            console.log('✅ Webhook sent successfully! Check PM2 logs for processing details.');
        } else {
            console.error('❌ Webhook failed with status:', response.status);
        }
    } catch (error) {
        console.error('❌ Error sending webhook:', error.response?.data || error.message);
    }
}

testWebhook();
