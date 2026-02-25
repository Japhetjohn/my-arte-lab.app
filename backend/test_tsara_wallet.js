require('dotenv').config();
const tsaraService = require('./src/services/tsaraService');

async function testTsaraWorkflow() {
    console.log('--- Starting Tsara Comprehensive Test ---');

    try {
        const timestamp = Date.now();
        const reference = `test_ref_${timestamp}`;
        const label = `Test User ${timestamp}`;

        console.log(`\nStep 1: Creating wallet...`);
        console.log(`Reference: ${reference}`);
        console.log(`Using BaseURL: ${tsaraService.api.defaults.baseURL}`);

        const walletResponse = await tsaraService.createWallet(label, reference, { purpose: 'testing' });
        console.log('Response:', JSON.stringify(walletResponse, null, 2));

        if (walletResponse.success) {
            const wallet = walletResponse.data;
            console.log(`\nSuccess! Wallet ID: ${wallet.id}`);
            console.log(`Primary Address: ${wallet.primary_address}`);

            console.log(`\nStep 2: Retrieving wallet details...`);
            const retrieveResponse = await tsaraService.getWallet({ reference: wallet.reference });
            console.log('Retrieve Message:', retrieveResponse.message);

            console.log(`\nStep 3: Checking balance...`);
            const balanceResponse = await tsaraService.getBalance(wallet.reference);
            console.log('Total Balance:', balanceResponse.counter.total_balance);
        } else {
            console.error('Failed to create wallet:', walletResponse.message);
        }

    } catch (error) {
        console.error('\n--- Test Caught Error ---');
        console.error(error.message);
    }
}

testTsaraWorkflow();
