require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Transaction = require('./src/models/Transaction');
const hostfiService = require('./src/services/hostfiService');
const hostfiWalletService = require('./src/services/hostfiWalletService');

async function manualConversion() {
    try {
        console.log('🔄 Starting manual conversion script...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const email = 'labossvisuals@gmail.com';
        const user = await User.findOne({ email });

        if (!user) {
            console.error('❌ User not found');
            process.exit(1);
        }

        console.log(`User: ${user.email}, Role: ${user.role}`);
        console.log(`Current NGN Balance: ${user.wallet.balance}`);

        // 1. Identify NGN and USDC (SOL) asset IDs
        const ngnAsset = user.wallet.hostfiWalletAssets.find(a => a.currency === 'NGN');
        const usdcAsset = user.wallet.hostfiWalletAssets.find(a => (a.currency === 'USDC' && a.colNetwork === 'SOL') || a.currency === 'USDC');

        if (!ngnAsset || !usdcAsset) {
            console.error('❌ Required wallet assets not found in user profile');
            process.exit(1);
        }

        console.log(`NGN Asset ID: ${ngnAsset.assetId}`);
        console.log(`USDC Asset ID: ${usdcAsset.assetId}`);

        const balanceToSwap = user.wallet.balance;
        if (balanceToSwap <= 0) {
            console.log('⚠️ No NGN balance to swap.');
            process.exit(0);
        }

        // 2. Perform Swap on HostFi
        console.log(`Swapping ${balanceToSwap} NGN to USDC on Solana...`);
        const swapResult = await hostfiService.swapAssets({
            fromCurrency: ngnAsset.currency,
            fromAssetId: ngnAsset.assetId,
            toCurrency: usdcAsset.currency,
            toAssetId: usdcAsset.assetId,
            amount: balanceToSwap
        });

        // swapResult example: { destinationAmount: 10.5, sourceAmount: 9810, ... }
        const receivedUsdc = swapResult.destinationAmount || swapResult.data?.destinationAmount;
        if (!receivedUsdc) {
            console.error('❌ Swap failed or returned unexpected result:', JSON.stringify(swapResult));
            process.exit(1);
        }

        console.log(`✅ Swap successful! Received: ${receivedUsdc} USDC`);

        // 3. Update Internal Ledger
        // Subtract NGN, Add USDC
        await hostfiWalletService.updateBalance(user._id, 'NGN', -balanceToSwap, 'debit');
        await hostfiWalletService.updateBalance(user._id, 'USDC', receivedUsdc, 'credit');

        // Set primary currency to USDC if it's NGN
        if (user.wallet.currency === 'NGN') {
            user.wallet.currency = 'USDC';
            await user.save();
        }

        // 4. Create Transaction Record for the swap
        const timestamp = Date.now().toString(36).toUpperCase();
        const transactionId = `SWAP-${timestamp}`;

        await Transaction.create({
            transactionId,
            user: user._id,
            type: 'exchange',
            amount: balanceToSwap,
            currency: 'NGN',
            status: 'completed',
            netAmount: receivedUsdc,
            paymentMethod: 'internal_swap',
            description: `Manual conversion of NGN balance to Solana USDC`,
            metadata: {
                fromAsset: 'NGN',
                toAsset: 'USDC',
                network: 'SOL',
                hostfiReference: swapResult.id || swapResult.reference
            }
        });

        console.log('✅ Internal ledger updated and transaction created.');
        console.log('🎉 Manual remediation complete.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Script failed:', error);
        process.exit(1);
    }
}

manualConversion();
