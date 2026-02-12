const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');
const Transaction = require('./src/models/Transaction');

async function restoreAndConvert() {
    try {
        console.log('Starting balance restoration and conversion to Solana USDC...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const migrations = [
            { email: 'labossvisuals@gmail.com', amount: 14456.12, currency: 'NGN' },
            { email: 'japhetjohnk@gmail.com', amount: 1800.00, currency: 'NGN' }
        ];

        const rate = 1 / 1550;

        for (const mig of migrations) {
            const user = await User.findOne({ email: mig.email });
            if (!user) {
                console.warn(`User not found: ${mig.email}`);
                continue;
            }

            console.log(`\nRestoring for ${mig.email}:`);
            const simulatedUsdc = mig.amount * rate;
            const fee = simulatedUsdc * 0.01;
            const finalUsdc = simulatedUsdc - fee;

            console.log(`  Fiat Amount: ${mig.amount} ${mig.currency}`);
            console.log(`  Converting to: ${finalUsdc} USDC (at ${rate.toFixed(6)})`);

            // Update Ledger
            user.wallet.balance = finalUsdc;
            user.wallet.currency = 'USDC';
            user.wallet.network = 'SOL';
            await user.save();

            // Create Adjustment Transaction
            const timestamp = Date.now().toString(36).toUpperCase();
            const random = Math.random().toString(36).substring(2, 6).toUpperCase();
            const transactionId = `TXN-RESTORE-${timestamp}-${random}`;

            await Transaction.create({
                transactionId,
                user: user._id,
                type: 'onramp',
                amount: finalUsdc,
                currency: 'USDC',
                status: 'completed',
                description: `Restoration and auto-conversion of lost ${mig.amount} ${mig.currency} balance to Solana USDC`,
                metadata: {
                    originalBalance: mig.amount,
                    originalCurrency: mig.currency,
                    rate,
                    fee,
                    isManualCorrection: true,
                    autoConverted: true
                }
            });

            console.log(`  ✅ Successfully restored and converted for ${mig.email}`);
        }

        console.log('\nRestoration completed!');
        process.exit(0);
    } catch (error) {
        console.error('Restoration failed:', error);
        process.exit(1);
    }
}

restoreAndConvert();
