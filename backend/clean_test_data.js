require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Transaction = require('./src/models/Transaction');

async function cleanData() {
    console.log('🧹 Connecting to DB...');
    await mongoose.connect(process.env.MONGODB_URI);

    const userEmail = 'japhetjohnk@gmail.com';
    const user = await User.findOne({ email: userEmail });

    if (!user) {
        console.error('❌ User not found');
        process.exit(1);
    }

    console.log(`✅ Found User: ${user._id}`);
    console.log(`💰 Current Balance: ${user.wallet.balance}`);

    // 1. Remove Test Transactions
    const result = await Transaction.deleteMany({
        user: user._id,
        $or: [
            { 'reference': { $regex: /^TEST-/ } },
            { 'reference': { $regex: /^REF-FIAT-/ } },
            { 'transactionHash': { $regex: /^0xHASH/ } }
        ]
    });
    console.log(`🗑️ Deleted ${result.deletedCount} test transactions.`);

    // 2. Reset Balance (or recalculate from valid transactions)
    // For now, we'll reset to 0 as requested to "remove fake funds"
    // Or strictly: verify real transactions.

    // Let's check if there are ANY real completed transactions
    const realTxns = await Transaction.find({
        user: user._id,
        status: 'completed',
        reference: { $not: { $regex: /^TEST-/ } } // Exclude our tests
    });

    console.log(`found ${realTxns.length} REAL completed transactions.`);

    // Recalculate balance from real transactions
    let newBalance = 0;
    for (const txn of realTxns) {
        if (['deposit', 'earning', 'bonus', 'onramp'].includes(txn.type)) {
            newBalance += (txn.netAmount || txn.amount);
        } else if (['withdrawal', 'payment', 'offramp'].includes(txn.type)) {
            newBalance -= (txn.netAmount || txn.amount);
        }
    }

    // Default to 0 if negative or weird, or just trust the calc
    if (newBalance < 0) newBalance = 0;

    user.wallet.balance = newBalance;
    user.wallet.ledgerBalance = newBalance; // Assuming ledger tracks cleared funds
    await user.save();

    console.log(`✨ Balance Reset to: ${newBalance}`);
    console.log('✅ Cleanup Complete.');
    process.exit();
}

cleanData();
