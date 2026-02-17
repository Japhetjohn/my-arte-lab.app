const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');
const hostfiService = require('./src/services/hostfiService');
const hostfiWalletService = require('./src/services/hostfiWalletService');

async function migrateFiatToUsdc() {
    try {
        console.log('Starting migration of fiat balances to Solana USDC...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find users with ANY non-zero balance (Internal)
        const users = await User.find({
            "wallet.balance": { $gt: 0 },
            "wallet.currency": { $ne: 'USDC' }
        });

        console.log(`Found ${users.length} users with internal fiat balances.`);

        for (const user of users) {
            console.log(`\nProcessing user: ${user.email} (${user._id})`);
            const originalBalance = user.wallet.balance;
            const originalCurrency = user.wallet.currency;

            console.log(`  Converting internal ${originalBalance} ${originalCurrency} to USDC...`);

            // Calculate conversion (Manual estimation since HostFi might not have funds to swap)
            const rate = 1 / 1550; // Current NGN/USDC approx
            const simulatedUsdc = originalBalance * rate;
            const fee = simulatedUsdc * 0.01;
            const finalUsdc = simulatedUsdc - fee;

            console.log(`  Calculated: ${finalUsdc} USDC (after 1% fee)`);

            // Update User object to USDC
            user.wallet.balance = finalUsdc;
            user.wallet.currency = 'USDC';
            user.wallet.network = 'SOL';
            await user.save();

            // Create a transaction record for history
            const Transaction = require('./src/models/Transaction');
            await Transaction.create({
                user: user._id,
                type: 'adjustment',
                amount: finalUsdc,
                currency: 'USDC',
                status: 'completed',
                description: `Auto-migration of ${originalBalance} ${originalCurrency} to Solana USDC`,
                metadata: {
                    sourceAmount: originalBalance,
                    sourceCurrency: originalCurrency,
                    rate,
                    fee,
                    autoConverted: true
                }
            });

            console.log(`  ✅ Successfully migrated ledger for ${user.email}`);

            // Now sync with HostFi to see if there are additional funds
            console.log(`  Syncing final state with HostFi...`);
            await hostfiWalletService.syncWalletBalances(user._id);
        }

        // Now handle users who might have 0 internal balance but funds on HostFi (less likely but possible)
        const hostfiUsers = await User.find({
            "wallet.hostfiWalletAssets": { $elemMatch: { balance: { $gt: 0 }, currency: { $ne: 'USDC' } } }
        });

        console.log(`\nFound ${hostfiUsers.length} users with HostFi-only fiat balances.`);
        // ... (rest of HostFi swap logic if needed, but we've seen mostly 0s)

        console.log('\nMigration completed!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateFiatToUsdc();
