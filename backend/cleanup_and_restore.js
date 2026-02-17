const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');
const Transaction = require('./src/models/Transaction');
const Booking = require('./src/models/Booking');
const Project = require('./src/models/Project');

async function cleanupAndRestore() {
    try {
        console.log('Starting cleanup of test data and restoration of correct balances...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const userEmails = ['labossvisuals@gmail.com', 'japhetjohnk@gmail.com'];
        const users = await User.find({ email: { $in: userEmails } });

        for (const user of users) {
            console.log(`\nProcessing user: ${user.email} (${user._id})`);

            // 1. Delete all transactions except the "Restoration" one if possible, 
            // but safer to just delete all and recreate the correct one.
            console.log('  Deleting all transactions...');
            await Transaction.deleteMany({ user: user._id });

            // 2. Delete all bookings associated with the user
            console.log('  Deleting all bookings...');
            await Booking.deleteMany({ $or: [{ client: user._id }, { creator: user._id }] });

            // 3. Delete all projects associated with the user
            console.log('  Deleting all projects...');
            await Project.deleteMany({ $or: [{ clientId: user._id }, { selectedCreatorId: user._id }] });

            // 4. Reset earnings and pending balances
            console.log('  Resetting ledger fields...');
            user.wallet.pendingBalance = 0;
            user.wallet.totalEarnings = 0;

            // 5. Restore correct balance from migration
            // Laboss: 9.23 USDC, Japhet: 1.15 USDC
            let restoreAmount = user.email === 'labossvisuals@gmail.com' ? 9.23326374 : 1.14967742;
            user.wallet.balance = restoreAmount;
            user.wallet.currency = 'USDC';
            user.wallet.network = 'SOL';

            await user.save();
            console.log(`  ✅ Wallet reset: Balance ${restoreAmount} USDC, Earnings 0, Pending 0`);

            // 6. Create a clean restoration transaction record
            const timestamp = Date.now().toString(36).toUpperCase();
            const random = Math.random().toString(36).substring(2, 6).toUpperCase();
            const transactionId = `TXN-CORRECT-${timestamp}-${random}`;

            await Transaction.create({
                transactionId,
                user: user._id,
                type: 'onramp',
                amount: restoreAmount,
                currency: 'USDC',
                status: 'completed',
                description: 'Post-migration balance adjustment (Verified Solana USDC)',
                metadata: {
                    isManualCorrection: true,
                    autoConverted: true,
                    note: 'Clean slate restoration'
                }
            });
            console.log('  ✅ Created clean restoration transaction record');
        }

        console.log('\nCleanup and Restoration completed!');
        process.exit(0);
    } catch (error) {
        console.error('Cleanup failed:', error);
        process.exit(1);
    }
}

cleanupAndRestore();
