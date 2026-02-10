require('dotenv').config();
const mongoose = require('mongoose');
const hostfiWebhookController = require('./src/controllers/hostfiWebhookController');
const User = require('./src/models/User');
const Transaction = require('./src/models/Transaction');

async function test() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const userId = '697ce1ce1dda0f8bcc8ae3d9';
    const secret = process.env.HOSTFI_WEBHOOK_SECRET || 'test_secret';

    const callWebhook = (payload) => {
        return new Promise((resolve, reject) => {
            const mockRes = {
                status: function (s) {
                    this.statusCode = s;
                    return this;
                },
                json: function (j) {
                    this.body = j;
                    console.log(`Response [${this.statusCode}]:`, JSON.stringify(j, null, 2));
                    resolve(j);
                    return this;
                }
            };

            const next = (err) => {
                if (err) {
                    console.error('Next called with error:', err);
                    reject(err);
                } else {
                    resolve();
                }
            };

            hostfiWebhookController.handleWebhook({
                body: payload,
                headers: { 'x-auth-secret': secret }
            }, mockRes, next);
        });
    };

    const runId = Math.floor(Math.random() * 100000);

    console.log('\n--- Scenario 1: Official Fiat Deposit Doc Payload ---');
    // From https://hostfi.readme.io/reference/fiat-deposit-received
    const payload1 = {
        "id": `test-fiat-dep-${runId}`,
        "event": "FIAT_DEPOSIT",
        "data": {
            "reference": `ref-${runId}`,
            "serviceReference": "d116cbd3-c3f3-4769-83ae-c6a6b22e4dbb",
            "assetId": "09e05a32-23df-4c17-9f6f-fc1fadfd1ff0",
            "category": "CASH_DEPOSIT",
            "status": "SUCCESS",
            "type": "CREDIT",
            "amount": {
                "currency": "NGN",
                "value": 195
            },
            "feeAmount": {
                "currency": "NGN",
                "value": 5
            },
            "metadata": [
                {
                    "name": "customId",
                    "value": userId
                },
                {
                    "name": "narration",
                    "value": "Transfer simulation"
                }
            ]
        }
    };
    await callWebhook(payload1);

    console.log('\n--- Scenario 2: Official Fiat Payout Doc Payload ---');
    // From https://hostfi.readme.io/reference/fiat-payout
    // Initialize user balance
    const user2 = await User.findById(userId);
    user2.wallet.balance += 1000;
    user2.wallet.pendingBalance += 680;
    await user2.save();
    console.log('Initialized user balance for fiat payout');

    // Create a pending transaction first to map
    const clientRef = `client-ref-${runId}`;
    await Transaction.create({
        user: userId,
        type: 'withdrawal',
        amount: 680,
        currency: 'NGN',
        status: 'pending',
        reference: clientRef,
        transactionId: `TXN-${runId}`
    });
    console.log('Created pending transaction for simulation');

    const payload2 = {
        "id": `test-fiat-payout-${runId}`,
        "event": "FIAT_WITHDRAWAL",
        "data": {
            "reference": `hostfi-ref-${runId}`,
            "clientReference": clientRef,
            "status": "WITHDRAWAL_SUCCESS",
            "amount": {
                "currency": "NGN",
                "value": 680
            }
        }
    };
    await callWebhook(payload2);

    console.log('\n--- Scenario 3: Official Crypto Payout Doc Payload ---');
    // Initialize user balance for crypto
    const user3 = await User.findById(userId);
    user3.wallet.pendingBalance += 11.82;
    await user3.save();
    console.log('Initialized user pendingBalance for crypto payout');

    // From https://hostfi.readme.io/reference/crypto-payout
    const cryptoClientRef = `crypto-ref-${runId}`;
    await Transaction.create({
        user: userId,
        type: 'withdrawal',
        amount: 11.82,
        currency: 'USDT',
        status: 'pending',
        reference: cryptoClientRef,
        transactionId: `TXN-CRYPTO-${runId}`
    });

    const payload3 = {
        "id": `test-crypto-payout-${runId}`,
        "event": "CRYPTO_WITHDRAWAL",
        "data": {
            "reference": `hostfi-crypto-ref-${runId}`,
            "clientReference": cryptoClientRef,
            "status": "WITHDRAWAL_SUCCESS",
            "amount": {
                "currency": "USDT",
                "value": 11.82
            },
            "metadata": [
                {
                    "name": "transactionId",
                    "value": `txhash-${runId}`
                },
                {
                    "name": "network",
                    "value": "BEP20"
                }
            ]
        }
    };
    await callWebhook(payload3);

    console.log('\nTest Complete');
    process.exit();
}

test().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
