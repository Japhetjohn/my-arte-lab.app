require('dotenv').config();
const mongoose = require('mongoose');
const hostfiWebhookController = require('./src/controllers/hostfiWebhookController');
const User = require('./src/models/User');
const Transaction = require('./src/models/Transaction');

async function test() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const userId = '697ce1ce1dda0f8bcc8ae3d9';
        const secret = process.env.HOSTFI_WEBHOOK_SECRET || 'test_secret';

        const callWebhook = (payload) => {
            return new Promise((resolve, reject) => {
                const mockRes = {
                    status: function (s) { this.statusCode = s; return this; },
                    json: function (j) {
                        this.body = j;
                        console.log(`Response [${this.statusCode}]:`, JSON.stringify(j, null, 2));
                        resolve(j);
                        return this;
                    }
                };

                const next = (err) => {
                    if (err) reject(err);
                    else resolve();
                };

                hostfiWebhookController.handleWebhook({
                    body: payload,
                    headers: { 'x-auth-secret': secret }
                }, mockRes, next);
            });
        };

        const runId = Math.floor(Math.random() * 100000);

        console.log('\n--- Scenario 1: Host+ Pay Transaction SUCCESS ---');
        const payRef = `pay-${runId}`;

        const tx1 = new Transaction({
            user: userId,
            type: 'deposit',
            amount: 100,
            currency: 'USDT',
            status: 'pending',
            reference: payRef,
            transactionId: `HCHECK-${runId}-1`,
            metadata: { type: 'host_pay' }
        });
        await tx1.save();
        console.log('Created pending transaction:', tx1.transactionId);

        const payload1 = {
            "id": `evt-pay-succ-${runId}`,
            "event": "PAYMENT_SUCCESS",
            "data": {
                "id": `hfi-tx-${runId}`,
                "status": "SUCCESS",
                "amount": 100,
                "currency": "USDT",
                "metadata": [
                    { "name": "identifier", "value": payRef }
                ]
            }
        };
        await callWebhook(payload1);

        const finalTx1 = await Transaction.findOne({ reference: payRef });
        console.log('Final Transaction Status:', finalTx1.status);

        console.log('\n--- Scenario 2: Host+ Pay Transaction EXPIRED ---');
        const payRef2 = `pay-exp-${runId}`;
        const tx2 = new Transaction({
            user: userId,
            type: 'deposit',
            amount: 50,
            currency: 'USDT',
            status: 'pending',
            reference: payRef2,
            transactionId: `HCHECK-${runId}-2`,
            metadata: { type: 'host_pay' }
        });
        await tx2.save();
        console.log('Created pending transaction:', tx2.transactionId);

        const payload2 = {
            "id": `evt-pay-exp-${runId}`,
            "event": "PAYMENT_EXPIRED",
            "data": {
                "id": `hfi-tx-exp-${runId}`,
                "status": "EXPIRED",
                "amount": 50,
                "currency": "USDT",
                "metadata": [
                    { "name": "identifier", "value": payRef2 }
                ]
            }
        };
        await callWebhook(payload2);

        const finalTx2 = await Transaction.findOne({ reference: payRef2 });
        console.log('Final Transaction Status:', finalTx2.status);

        console.log('\nTest Complete');
        process.exit(0);
    } catch (error) {
        console.error('Test failed with error:', error);
        process.exit(1);
    }
}

test();
