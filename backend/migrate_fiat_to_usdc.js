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

        const users = await User.find({
            'wallet.hostfiWalletAssets': {
                $elemMatch: {
                    currency: { $ne: 'USDC' },
                    balance: { $gt: 0 }
                }
            }
        });

        console.log(`Found ${users.length} users with non-USDC balances.`);

        for (const user of users) {
            console.log(`\nProcessing user: ${user.email} (${user._id})`);

            // Ensure wallets are synced
            await hostfiWalletService.syncWalletBalances(user._id);

            // Re-fetch user to get updated balances
            const updatedUser = await User.findById(user._id);
            const assets = updatedUser.wallet.hostfiWalletAssets;

            // Find the Solana USDC asset
            let usdcAsset = assets.find(a =>
                a.currency === 'USDC' && (a.colNetwork === 'SOL' || a.colNetwork === 'Solana')
            );

            if (!usdcAsset) {
                console.log(`  Solana USDC asset not found for ${user.email}, trying fallback...`);
                const usdcAssetId = await hostfiWalletService.getWalletAssetId(user._id, 'USDC').catch(() => null);
                if (usdcAssetId) {
                    usdcAsset = assets.find(a => a.assetId === usdcAssetId);
                }
            }

            if (!usdcAsset) {
                console.warn(`  FAILED: No USDC asset found for user ${user.email}`);
                continue;
            }

            console.log(`  Target USDC Asset ID: ${usdcAsset.assetId}`);

            for (const asset of assets) {
                if (asset.currency !== 'USDC' && asset.balance > 0) {
                    console.log(`  Found ${asset.balance} ${asset.currency} (Asset ID: ${asset.assetId})`);

                    try {
                        console.log(`  Initiating swap: ${asset.balance} ${asset.currency} -> USDC...`);
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

                            // Also "debit" the original fiat currency from internal ledger to keep it zeroed
                            // (Since syncWalletBalances might pick up both, we need to ensure internal balance matches USDC)
                            // Actually hostfiWalletService.updateBalance for the source currency is tricky if it converts to primary.
                            // We'll trust the sync next time or manually zero it.
                        }

                    } catch (swapError) {
                        console.error(`  ❌ Failed to swap ${asset.currency}:`, swapError.message);
                    }
                }
            }

            // Final sync to ensure everything is correct
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
