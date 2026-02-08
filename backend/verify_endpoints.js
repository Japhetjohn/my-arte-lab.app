require('dotenv').config();
const mongoose = require('mongoose');
const hostfiService = require('./src/services/hostfiService');
const User = require('./src/models/User');

async function verifyAllEndpoints() {
    console.log('🔌 Connecting to Database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected.');

    const userId = '67a783da397576c94411135c'; // Real user ID from previous step

    console.log('\n🔍 --- STARTING COMPREHENSIVE ENDPOINT VERIFICATION --- 🔍\n');

    try {
        // 1. Supported Currencies
        console.log('1️⃣  Testing getSupportedCurrencies()...');
        const currencies = await hostfiService.getSupportedCurrencies();
        console.log(`   ✅ Success! Found ${currencies.length} supported currencies.`);
    } catch (e) {
        console.error(`   ❌ Failed: ${e.message}`);
    }

    try {
        // 2. Bank List (Nigeria)
        console.log('\n2️⃣  Testing getBanksList("NG")...');
        const banks = await hostfiService.getBanksList('NG');
        console.log(`   ✅ Success! Found ${banks.length} banks in Nigeria.`);
    } catch (e) {
        console.error(`   ❌ Failed: ${e.message}`);
    }

    try {
        // 3. User Wallets (HostFi Auth & User Scope)
        console.log('\n3️⃣  Testing getUserWallets()...');
        const wallets = await hostfiService.getUserWallets();
        console.log(`   ✅ Success! Retrieved ${wallets.length} wallet assets.`);
    } catch (e) {
        console.error(`   ❌ Failed: ${e.message}`);
    }

    try {
        // 4. Currency Rates (Direct & Bridge)
        console.log('\n4️⃣  Testing getCurrencyRates()...');

        // Direct
        const rateDirect = await hostfiService.getCurrencyRates('USDC', 'NGN');
        console.log(`   ✅ USDC -> NGN Rate: ${rateDirect.rate || rateDirect.data?.rate}`);

        // Bridge Path Check (BTC -> USDT)
        const rateBridge = await hostfiService.getCurrencyRates('BTC', 'USDT');
        console.log(`   ✅ BTC -> USDT Rate: ${rateBridge.rate || rateBridge.data?.rate}`);
    } catch (e) {
        console.error(`   ❌ Failed: ${e.message}`);
    }

    try {
        // 5. Withdrawal Transactions (History)
        console.log('\n5️⃣  Testing getWithdrawalTransactions()...');
        const withdrawals = await hostfiService.getWithdrawalTransactions({ pageSize: 5 });
        const count = withdrawals.records?.length || withdrawals.data?.length || 0;
        console.log(`   ✅ Success! Retrieved ${count} recent withdrawals.`);
    } catch (e) {
        console.error(`   ❌ Failed: ${e.message}`);
    }

    try {
        // 6. Fiat Collection Channels
        console.log('\n6️⃣  Testing getFiatCollectionChannels()...');
        const channels = await hostfiService.getFiatCollectionChannels();
        console.log(`   ✅ Success! Retrieved ${channels.length} collection channels.`);
    } catch (e) {
        // This is often empty or restricted, so failure is not critical but good to know
        console.warn(`   ⚠️  Note: ${e.message}`);
    }

    console.log('\n🏁 --- VERIFICATION COMPLETE --- 🏁');
    process.exit();
}

verifyAllEndpoints();
