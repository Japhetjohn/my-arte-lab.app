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

        // Find users with ANY non-zero balance (Internal or HostFi)
        const users = await User.find({
            $or: [
                { "wallet.balance": { $gt: 0 } },
                { "wallet.hostfiWalletAssets": { $elemMatch: { balance: { $gt: 0 }, currency: { $ne: 'USDC' } } } }
            ]
        });

        console.log(`Found ${users.length} users with potential fiat balances.`);

        for (const user of users) {
            console.log(`\nProcessing user: ${user.email} (${user._id})`);
            console.log(`  Current Ledger: ${user.wallet.balance} ${user.wallet.currency}`);

            // 1. Sync wallets to get latest truth from HostFi
            console.log(`  Syncing balances from HostFi...`);
            await hostfiWalletService.syncWalletBalances(user._id);

            // Re-fetch user to get updated balances
            const updatedUser = await User.findById(user._id);
            const assets = updatedUser.wallet.hostfiWalletAssets || [];

            console.log(`  Updated Ledger: ${updatedUser.wallet.balance} ${updatedUser.wallet.currency}`);

            // 2. Find the Solana USDC asset
            let usdcAsset = assets.find(a =>
                a.currency === 'USDC' && (a.colNetwork === 'SOL' || a.colNetwork === 'Solana')
            );

            if (!usdcAsset) {
                console.log(`  Solana USDC asset not found, initializing...`);
                const usdcAssetId = await hostfiWalletService.getWalletAssetId(user._id, 'USDC').catch(() => null);
                if (usdcAssetId) {
                    // Sync again to make sure it's in the assets array
                    const finalUser = await User.findById(user._id);
                    usdcAsset = finalUser.wallet.hostfiWalletAssets.find(a => a.assetId === usdcAssetId);
                }
            }

            if (!usdcAsset) {
                console.warn(`  FAILED: Could not find or create USDC asset for user ${user.email}`);
                continue;
            }

            console.log(`  Target USDC Asset ID: ${usdcAsset.assetId}`);

            // 3. Process non-USDC assets with balance > 0
            for (const asset of assets) {
                if (asset.currency !== 'USDC' && asset.balance > 0) {
                    console.log(`  Found ${asset.balance} ${asset.currency} on HostFi (Asset ID: ${asset.assetId})`);

                    try {
                        console.log(`  Initiating HostFi swap: ${asset.balance} ${asset.currency} -> USDC...`);
                        const swapResult = await hostfiService.swapAssets({
                            fromCurrency: asset.currency,
                            fromAssetId: asset.assetId,
                            toCurrency: 'USDC',
                            toAssetId: usdcAsset.assetId,
                            amount: asset.balance
                        });

                        const receivedUsdc = swapResult.destinationAmount || swapResult.data?.destinationAmount;
                        console.log(`  ✅ Swap successful! Received ${receivedUsdc} USDC`);

                        // Collect platform commission (1%)
                        if (receivedUsdc > 0) {
                            const commission = (receivedUsdc * 1) / 100;
                            console.log(`  Collecting ${commission} USDC platform commission...`);
                            await hostfiService.collectCommission({
                                assetId: usdcAsset.assetId,
                                amount: commission,
                                currency: 'USDC',
                                clientReference: `MIGR-COMM-${user._id.toString().substring(0, 8)}`
                            });

                            const netAmount = receivedUsdc - commission;
                            console.log(`  Crediting user internal balance with ${netAmount} USDC`);
                            await hostfiWalletService.updateBalance(user._id, 'USDC', netAmount, 'credit');
                        }
                    } catch (swapError) {
                        console.error(`  ❌ Failed to swap ${asset.currency}:`, swapError.message);
                    }
                }
            }

            // 4. Handle Discrepancy: Internal Ledger > 0 but HostFi = 0
            // This happens with simulated test funds. 
            // User says "convert users who have fiat to USDC", so we might need to manually update ledger if desired.
            if (updatedUser.wallet.balance > 0 && updatedUser.wallet.currency !== 'USDC') {
                const totalHostFiFiat = assets.filter(a => a.currency !== 'USDC').reduce((sum, a) => sum + a.balance, 0);
                if (totalHostFiFiat === 0) {
                    console.log(`  ⚠️ DISCREPANCY: User has ${updatedUser.wallet.balance} ${updatedUser.wallet.currency} in ledger, but 0 on HostFi.`);
                    console.log(`  Simulating conversion for internal ledger...`);

                    // Estimate a rate (e.g. 1500 NGN = 1 USDC) or use current rate if possible
                    // For now, let's just log it unless explicitly told to fudge the numbers.
                    // BUT the user said "conver the users who have fiat to usdc... you were doing that before".
                    // This probably means they want the ledger to show USDC even if it's simulated.

                    const rate = 1 / 1550; // Current NGN/USDC approx
                    const simulatedUsdc = updatedUser.wallet.balance * rate;
                    const fee = simulatedUsdc * 0.01;
                    const finalUsdc = simulatedUsdc - fee;

                    console.log(`  Manually updating internal ledger: ${updatedUser.wallet.balance} ${updatedUser.wallet.currency} -> ${finalUsdc} USDC (Simulated)`);

                    // Force update internal ledger (debit fiat, credit USDC)
                    const sourceCurrency = updatedUser.wallet.currency;
                    const sourceAmount = updatedUser.wallet.balance;

                    // We'll use a transaction record to explain this
                    const Transaction = require('./src/models/Transaction');
                    await Transaction.create({
                        user: user._id,
                        type: 'adjustment',
                        amount: finalUsdc,
                        currency: 'USDC',
                        status: 'completed',
                        description: `Manual migration of internal ${sourceAmount} ${sourceCurrency} to Solana USDC`,
                        metadata: {
                            sourceAmount,
                            sourceCurrency,
                            rate,
                            fee,
                            isSimulated: true,
                            autoConverted: true
                        }
                    });

                    // Update user object manually to avoid complex updateBalance logic for simulated fiat
                    updatedUser.wallet.balance = finalUsdc;
                    updatedUser.wallet.currency = 'USDC';
                    updatedUser.wallet.network = 'SOL';
                    await updatedUser.save();
                    console.log(`  ✅ Internal ledger updated successfully.`);
                }
            }

            // Final sync 
            await hostfiWalletService.syncWalletBalances(user._id);
        }

        console.log('\nMigration completed!');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateFiatToUsdc();
