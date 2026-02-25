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
            console.log(`\nSuccess! Local Wallet Reference: ${wallet.reference}`);
            console.log(`Primary Address: ${wallet.primary_address}`);
            console.log(`Encrypted Mnemonic: ${wallet.mnemonic.substring(0, 20)}...`);

            console.log(`\nStep 2: Checking balance via RPC...`);
            const balanceResponse = await tsaraService.getBalance(wallet.primary_address);
            console.log('Balance Response:', JSON.stringify(balanceResponse, null, 2));
            console.log('Total USDC Balance:', balanceResponse.counter.total_balance);
        } else {
            console.error('Failed to create wallet:', walletResponse.message);
        }

    } catch (error) {
        console.error('\n--- Test Caught Error ---');
        console.error(error.message);
    }
}

testTsaraWorkflow();
