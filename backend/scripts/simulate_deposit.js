const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

async function simulateDeposit() {
    const WEBHOOK_URL = 'http://localhost:5000/api/hostfi/webhooks';
    const WEBHOOK_SECRET = process.env.HOSTFI_WEBHOOK_SECRET;
    const USER_ID = '67ac7598c25528399589d985'; // Using a known user ID from logs or DB

    const payload = {
        event: 'fiat_deposit',
        id: `TEST-EVT-${Date.now()}`,
        status: 'SUCCESS',
        amount: 5000,
        currency: 'NGN',
        data: {
            channelId: 'CH-SIM-12345',
            method: 'BANK_TRANSFER',
            accountNumber: '1234567890',
            accountName: 'TEST USER',
            bankName: 'WEMA BANK',
            reference: 'REF-SIM-NGN'
        },
        customId: `${USER_ID}-FIAT`,
        createdAt: new Date().toISOString()
    };

    const body = JSON.stringify(payload);
    const signature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(body)
        .digest('hex');

    try {
        console.log('🚀 Sending simulated fiat_deposit webhook...');
        console.log('Payload:', JSON.stringify(payload, null, 2));

        const response = await axios.post(WEBHOOK_URL, payload, {
            headers: {
                'Content-Type': 'application/json',
                'x-auth-secret': WEBHOOK_SECRET,
                'x-hostfi-signature': signature // Keep HMAC just in case for future alignment
            }
        });

        console.log('✅ Response:', response.data);
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

simulateDeposit();
