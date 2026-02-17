require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Transaction = require('./src/models/Transaction');
const WebhookEvent = require('./src/models/WebhookEvent');
const hostfiService = require('./src/services/hostfiService');
const hostfiWalletService = require('./src/services/hostfiWalletService');

async function reprocessStuckWebhook() {
    try {
        console.log('🔄 Starting stuck webhook reprocessing...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Find the stuck event
        const eventId = 'TEST-EVT-1770861205607';
        const webhookEvent = await WebhookEvent.findOne({ eventId });

        if (!webhookEvent) {
            console.error('❌ Webhook event not found in DB!');
            process.exit(1);
        }

        if (webhookEvent.processed) {
            console.log('⚠️ Event already marked as processed.');
            process.exit(0);
        }

        console.log(`Found event: ${eventId}`);

        // 2. Parse Payload safely
        // stored payload in DB is the raw body
        const parsed = hostfiService.parseWebhookData(webhookEvent.payload);
        const { amount, currency, customId, status, id } = parsed;

        console.log(`Parsed Data: ${amount} ${currency}, Status: ${status}, User: ${customId}`);

        if (!['SUCCESS', 'COMPLETED', 'CREDITED'].includes(status)) {
            console.log(`Status ${status} is not successful. Skipping.`);
            process.exit(0);
        }

        // 3. Fee Calculation
        const feeBreakdown = hostfiService.calculateOnRampFee(amount);
        console.log(`Fee Breakdown: Amount: ${amount}, Fee: ${feeBreakdown.platformFee}, Net: ${feeBreakdown.amountAfterFee}`);

        // 4. Resolve User
        let userId = customId;
        if (userId && typeof userId === 'string' && userId.endsWith('-FIAT')) {
            userId = userId.replace('-FIAT', '');
        }

        const user = await User.findById(userId);
        if (!user) {
            throw new Error(`User not found: ${userId}`);
        }

        console.log(`User: ${user.email}, Current Balance: ${user.wallet.balance}`);

        // 5. Update Balance
        console.log(`Crediting User for ${feeBreakdown.amountAfterFee} ${currency}...`);
        await hostfiWalletService.updateBalance(user._id, currency, feeBreakdown.amountAfterFee, 'credit');

        const updatedUser = await User.findById(userId);
        console.log(`New Balance: ${updatedUser.wallet.balance}`);

        // 6. Create/Update Transaction
        // Generate ID since it's missing in older code
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 10).toUpperCase();
        const transactionId = `TXN-${timestamp}-${random}`;

        // Try to find existing first to avoid duplicate
        const existingTxn = await Transaction.findOne({ 'metadata.hostfiReference': id });

        if (existingTxn) {
            console.log(`Transaction already exists: ${existingTxn._id}, skipping creation.`);
        } else {
            const txn = await Transaction.create({
                transactionId,
                user: user._id,
                type: 'deposit',
                amount: amount,
                currency: currency,
                status: 'completed',
                platformFee: feeBreakdown.platformFee,
                netAmount: feeBreakdown.amountAfterFee,
                completedAt: new Date(),
                paymentDetails: { actualAmount: amount },
                metadata: {
                    hostfiReference: id,
                    hostfiStatus: status,
                    processedBy: 'manual_remediation_script'
                }
            });
            console.log(`✅ Transaction created: ${txn._id}`);
        }

        // 7. Mark Processed
        webhookEvent.processed = true;
        webhookEvent.processedAt = new Date();
        webhookEvent.processingError = null;
        await webhookEvent.save();
        console.log('✅ Webhook event marked as processed.');

        console.log('🎉 Successfully remediated missing deposit.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Script failed:', error);
        process.exit(1);
    }
}

reprocessStuckWebhook();
