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
                status: function (s) { this.statusCode = s; return this; },
                json: function (j) {
                    this.body = j;
                    console.log(`Response [${this.statusCode}]:`, JSON.stringify(j, null, 2));
                    resolve(j);
                    return this;
                }
            };

            const next = (err) => {
                if (err) {
                    console.error('Next error:', err);
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

    console.log('\n--- Scenario 1: Official Fiat Payout Doc Payload ---');
    const fiatClientRef = `payout-fiat-${runId}`;

    // Setup user and pending tx
    const user = await User.findById(userId);
    user.wallet.balance += 5000;
    user.wallet.pendingBalance += 680;
    await user.save();

    await Transaction.create({
        user: userId,
        type: 'withdrawal',
        amount: 680,
        currency: 'NGN',
        status: 'pending',
        reference: fiatClientRef,
        transactionId: `HFI-WD-${runId}`,
        metadata: {}
    });

    const payload1 = {
        "id": `evt-fiat-${runId}`,
        "event": "FIAT_WITHDRAWAL",
        "data": {
            "reference": `hostfi-ref-${runId}`,
            "walletAssetId": "1c7bcbd3-d1ff-449c-90eb-d4c641a99cf0",
            "clientReference": fiatClientRef,
            "status": "WITHDRAWAL_SUCCESS",
            "amount": { "currency": "NGN", "value": 680 },
            "fees": { "amount": 20, "flat": 20, "percent": 0 },
            "memo": "Simulation",
            "metadata": [
                { "name": "recipient_account_name", "value": "TEST USER" },
                { "name": "recipient_bank_name", "value": "OPAY" },
                { "name": "recipient_bank_id", "value": "NG::100004" },
                { "name": "recipient_account_number", "value": "0123456789" },
                { "name": "sessionId", "value": `sess-${runId}` }
            ],
            "methodId": "BANK_TRANSFER",
            "recipient": {
                "accountName": "TEST USER",
                "accountNumber": "0123456789",
                "bankId": "NG::100004",
                "bankName": "OPAY",
                "currency": "NGN",
                "method": "BANK_TRANSFER",
                "type": "BANK"
            }
        }
    };
    await callWebhook(payload1);

    console.log('\n--- Scenario 2: Official Crypto Payout Doc Payload ---');
    const cryptoClientRef = `payout-crypto-${runId}`;
    user.wallet.pendingBalance += 11.82;
    await user.save();

    await Transaction.create({
        user: userId,
        type: 'withdrawal',
        amount: 11.82,
        currency: 'USDT',
        status: 'pending',
        reference: cryptoClientRef,
        transactionId: `HFI-CRY-${runId}`,
        metadata: {}
    });

    const payload2 = {
        "id": `evt-crypto-${runId}`,
        "event": "CRYPTO_WITHDRAWAL",
        "data": {
            "reference": `hostfi-cry-ref-${runId}`,
            "clientReference": cryptoClientRef,
            "status": "WITHDRAWAL_SUCCESS",
            "amount": { "currency": "USDT", "value": 11.82 },
            "metadata": [
                { "name": "network", "value": "BEP20" },
                { "name": "transactionId", "value": `txhash-${runId}` },
                { "name": "address", "value": "0x123...abc" }
            ],
            "methodId": "CRYPTO",
            "recipient": {
                "accountNumber": "0x123...abc",
                "currency": "USDT",
                "method": "CRYPTO",
                "network": "BEP20",
                "type": "CRYPTO"
            }
        }
    };
    await callWebhook(payload2);

    console.log('\nTest Complete');
    process.exit(0);
}

test().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
