require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function simulateWebhook() {
    console.log('🔗 Connecting to DB...');
    await mongoose.connect(process.env.MONGODB_URI);

    // Find our test user
    const user = await User.findOne({ email: 'japhetjohnk@gmail.com' });
    if (!user) {
        console.error('❌ Test user not found!');
        process.exit(1);
    }
    const userId = user._id.toString();
    console.log(`✅ Found User: ${userId}`);

    const webhookSecret = process.env.HOSTFI_WEBHOOK_SECRET;
    if (!webhookSecret) {
        console.error('❌ HOSTFI_WEBHOOK_SECRET is not set in .env');
        process.exit(1);
    }

    // --- HELPER FUNCTION TO SEND WEBHOOK ---
    async function sendWebhook(endpoint, type, payload) {
        console.log(`\n🚀 Sending Simulated [${type}] Webhook...`);

        try {
            const response = await axios.post(`http://localhost:5000/api/hostfi/webhooks/${endpoint}`, payload, {
                headers: {
                    'x-auth-secret': webhookSecret, // NEW: Standard Header per instructions
                    'Content-Type': 'application/json'
                }
            });

            console.log(`✅ Response: ${response.status} ${response.data.message}`);
            return true;
        } catch (error) {
            console.error(`❌ Request Failed:`);
            if (error.response) {
                console.error(`   Status: ${error.response.status}`);
                console.error(`   Data:`, error.response.data);
            } else {
                console.error(`   Error: ${error.message}`);
            }
            return false;
        }
    }

    // 1. TEST FIAT    // Payload for Fiat Deposit (Simulating the missing transaction)
    const payload = {
        id: `MANUAL-RECOVERY-${Date.now()}`,
        type: 'fiat_deposit',
        amount: 1000, // The missing amount
        currency: 'NGN',
        customId: '6984f82a2398198b0598ba50-FIAT', // Matching the new namespaced format
        reference: `REF-RECOVERY-${Date.now()}`,
        status: 'successful',
        timestamp: new Date().toISOString()
    };
    await sendWebhook('fiat-deposit', 'FIAT DEPOSIT', payload);

    // 2. TEST CRYPTO DEPOSIT (0.001 BTC)
    const cryptoPayload = {
        id: `TEST-CRYPTO-${Date.now()}`,
        type: 'crypto_deposit',
        amount: 0.001,
        currency: 'BTC',
        customId: userId,
        txHash: `0xHASH${Date.now()}`,
        network: 'BTC',
        status: 'completed',
        timestamp: new Date().toISOString()
    };
    await sendWebhook('crypto-deposit', 'CRYPTO DEPOSIT', cryptoPayload);

    // Check Final Balance
    const updatedUser = await User.findById(userId);
    console.log(`\n💰 Final User Balance: ${updatedUser.wallet.balance} ${updatedUser.wallet.currency}`);

    process.exit();
}

simulateWebhook();
