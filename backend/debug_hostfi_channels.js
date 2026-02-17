require('dotenv').config();
const hostfiService = require('./src/services/hostfiService');
const Transaction = require('./src/models/Transaction');
const User = require('./src/models/User');
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

async function debugChannels() {
    const customId = '6984f82a2398198b0598ba50-FIAT'; // UPDATED: The FAILING user ID from logs
    console.log(`🔍 Debugging Channels for CustomID: ${customId}`);

    try {
        // 1. Try standard lookup
        console.log('\n--- Attempt 1: customId (camelCase) ---');
        const channels1 = await hostfiService.getFiatCollectionChannels({ customId });
        console.log(`Found: ${channels1.length}`);
        if (channels1.length > 0) console.log(JSON.stringify(channels1[0], null, 2));

        // 2. Try snake_case with currency (Exact Controller Match - BEFORE FIX)
        console.log('\n--- Attempt 2: custom_id (snake_case) + currency ---');
        const channels2 = await hostfiService.getFiatCollectionChannels({
            custom_id: customId,
            currency: 'NGN'
        });
        console.log(`Found: ${channels2.length}`);

        // 3. Try snake_case WITHOUT currency (AFTER FIX)
        console.log('\n--- Attempt 3: custom_id (snake_case) ONLY ---');
        const channels3 = await hostfiService.getFiatCollectionChannels({
            custom_id: customId
        });
        console.log(`Found: ${channels3.length}`);

        // 4. Try fetching ALL and filtering manually
        console.log('\n--- Attempt 4: Fetch All & Filter ---');
        const allChannels = await hostfiService.getFiatCollectionChannels({ limit: 100 });
        console.log(`Fetched Total: ${allChannels.length}`);

        const manualFilter = allChannels.filter(c => c.customId === customId || c.custom_id === customId);
        console.log(`Manually Filtered matches: ${manualFilter.length}`);
        if (manualFilter.length > 0) {
            console.log('Match found via manual filter!');
            console.log(JSON.stringify(manualFilter[0], null, 2));
        } else {
            // Let's dump the customIds of the first few to see if we are close
            const ids = allChannels.map(c => c.customId || c.custom_id).slice(0, 10);
            console.log('First 10 channel customIds:', ids);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) console.error(error.response.data);
    }
}

async function checkTransactions() {
    // User ID from logs: 6984f82a2398198b0598ba50
    const userId = '6984f82a2398198b0598ba50';
    console.log(`🔍 Checking Transactions for User: ${userId}`);

    try {
        const transactions = await Transaction.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(5);

        console.log(`Found ${transactions.length} recent transactions`);
        transactions.forEach(t => {
            console.log(`- [${t.status}] ${t.type} ${t.amount} ${t.currency} (Ref: ${t.reference}) Time: ${t.createdAt}`);
            if (t.metadata) console.log('  Metadata:', t.metadata);
        });

        // Also check User Balance
        const user = await User.findById(userId);
        if (user) {
            console.log(`\nUser Balance: ${user.wallet.balance} ${user.wallet.currency}`);
            console.log(`Pending Balance: ${user.wallet.pendingBalance} ${user.wallet.currency}`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Run sequentially
(async () => {
    await debugChannels();
    await checkTransactions();
    mongoose.disconnect();
})();
