const User = require('../models/User');
const Transaction = require('../models/Transaction');
const WebhookEvent = require('../models/WebhookEvent');
const { catchAsync } = require('../utils/errorHandler');

/**
 * Tsara Webhook Controller
 * Handles incoming stablecoin events from Tsara
 * Documentation: https://usetsara.readme.io/reference/webhooks
 */

exports.handleWebhook = catchAsync(async (req, res, next) => {
    const payload = req.body;
    const signature = req.headers['x-tsara-signature']; // Tsara uses this header for verification

    console.log('[Tsara Webhook] Received event:', JSON.stringify(payload, null, 2));

    const { event, data, reference, id } = payload;
    const eventId = id || `tsara-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 1. Record Event (Idempotency)
    try {
        await WebhookEvent.recordWebhook({
            eventId: eventId,
            provider: 'tsara',
            eventType: event,
            payload: payload,
            signature: signature || 'no-signature'
        });
    } catch (error) {
        if (error.message.includes('Duplicate') || error.code === 11000) {
            console.log(`[Tsara Webhook] Duplicate event ignored: ${eventId}`);
            return res.status(200).json({ success: true, message: 'Event already processed' });
        }
        console.error(`[Tsara Webhook] Failed to record event:`, error.message);
        throw error;
    }

    // 2. Dispatch event processing
    try {
        switch (event) {
            case 'stablecoin.received':
                await processStablecoinReceived(payload);
                break;
            case 'stablecoin.sent':
                await processStablecoinSent(payload);
                break;
            case 'stablecoin.failed':
                await processStablecoinFailed(payload);
                break;
            default:
                console.log(`[Tsara Webhook] Unhandled event type: ${event}`);
        }

        await WebhookEvent.markProcessed(eventId, 'tsara');
        res.status(200).json({ success: true, message: 'Webhook processed' });
    } catch (error) {
        console.error(`[Tsara Webhook] Error processing ${event}:`, error.message);
        await WebhookEvent.markProcessed(eventId, 'tsara', error.message);
        res.status(500).json({ success: false, error: 'Internal processing error' });
    }
});

/**
 * Process incoming stablecoin deposit
 */
async function processStablecoinReceived(payload) {
    const { data, reference } = payload;
    const { amount, asset, network, from_address, to_address, transaction_hash } = data;

    console.log(`[Tsara Webhook] Processing deposit: ${amount} ${asset} for ref: ${reference}`);

    // Find user by Tsara reference
    const user = await User.findOne({ 'wallet.tsaraReference': reference });
    if (!user) {
        console.error(`[Tsara Webhook] User not found for reference: ${reference}`);
        throw new Error(`User not found for reference: ${reference}`);
    }

    // Removal of platform fee (0%)
    const platformFee = 0;
    const netAmount = Number(amount);

    console.log(`[Tsara Webhook] Deposit Breakdown - Amount: ${amount}, Fee: ${platformFee}, Net: ${netAmount}`);

    // For local Solana wallet, the on-chain balance is the source of truth.
    // The aggregate balance will be updated on the next sync.
    // However, to provide immediate feedback, we update the local aggregate.
    user.wallet.balance = (user.wallet.balance || 0) + netAmount;
    user.wallet.tsaraBalance = (user.wallet.tsaraBalance || 0) + netAmount;
    user.wallet.lastUpdated = new Date();
    await user.save();

    console.log(`[Tsara Webhook] User ${user._id} balance updated. New Aggregate: ${user.wallet.balance}`);

    // Update or Create Transaction
    const transaction = await Transaction.findOneAndUpdate(
        {
            user: user._id,
            $or: [
                { reference: reference },
                { transactionId: reference },
                { transactionHash: transaction_hash }
            ]
        },
        {
            $set: {
                user: user._id,
                type: 'deposit',
                amount: Number(amount),
                currency: asset,
                status: 'completed',
                platformFee,
                netAmount,
                transactionHash: transaction_hash,
                blockchainNetwork: network || 'Solana',
                completedAt: new Date(),
                'metadata.provider': 'tsara',
                'metadata.tsaraReference': reference,
                'metadata.tsaraEventId': payload.id
            }
        },
        { upsert: true, new: true }
    );

    console.log(`[Tsara Webhook] Transaction history created: ${transaction._id}`);

    // Send Notification
    try {
        const Notification = require('../models/Notification');
        await Notification.createNotification({
            recipient: user._id,
            type: 'deposit_credited',
            title: 'Deposit Received',
            message: `Your deposit of ${amount} ${asset} has been credited to your wallet.`,
            link: '/wallet',
            metadata: {
                amount,
                currency: asset,
                txHash: transaction_hash
            }
        });
    } catch (err) {
        console.warn('[Tsara Webhook] Notification failed:', err.message);
    }
}

/**
 * Process outgoing stablecoin transfer
 */
async function processStablecoinSent(payload) {
    const { data, reference } = payload;
    const { amount, asset, transaction_hash } = data;

    console.log(`[Tsara Webhook] Processing outgoing transfer: ${amount} ${asset} for ref: ${reference}`);

    const transaction = await Transaction.findOne({
        $or: [{ reference: reference }, { transactionId: reference }]
    });

    if (!transaction) {
        console.warn(`[Tsara Webhook] Transaction not found for reference: ${reference}`);
        return;
    }

    const user = await User.findById(transaction.user);
    if (user) {
        // Pending balance cleanup
        user.wallet.pendingBalance = Math.max(0, user.wallet.pendingBalance - transaction.amount);
        await user.save();
    }

    transaction.status = 'completed';
    transaction.transactionHash = transaction_hash;
    transaction.completedAt = new Date();
    transaction.metadata.tsaraStatus = 'sent';
    await transaction.save();

    // Send Notification
    try {
        const Notification = require('../models/Notification');
        await Notification.createNotification({
            recipient: transaction.user,
            type: 'payout_completed',
            title: 'Withdrawal Successful',
            message: `Your withdrawal of ${amount} ${asset} has been processed successfully.`,
            link: '/wallet'
        });
    } catch (err) {
        console.warn('[Tsara Webhook] Notification failed:', err.message);
    }
}

/**
 * Process failed stablecoin transfer
 */
async function processStablecoinFailed(payload) {
    const { data, reference } = payload;
    const { amount, asset, failure_reason } = data;

    console.log(`[Tsara Webhook] Processing failed transfer: ${reference}. Reason: ${failure_reason}`);

    const transaction = await Transaction.findOne({
        $or: [{ reference: reference }, { transactionId: reference }]
    });

    if (!transaction) return;

    const user = await User.findById(transaction.user);
    if (user) {
        // Refund balance
        user.wallet.balance += transaction.amount;
        user.wallet.pendingBalance = Math.max(0, user.wallet.pendingBalance - transaction.amount);
        await user.save();
    }

    transaction.status = 'failed';
    transaction.errorMessage = failure_reason || 'Transfer failed';
    transaction.failedAt = new Date();
    await transaction.save();

    // Send Notification
    try {
        const Notification = require('../models/Notification');
        await Notification.createNotification({
            recipient: transaction.user,
            type: 'payout_failed',
            title: 'Withdrawal Failed',
            message: `Your withdrawal of ${amount} ${asset} failed and funds have been returned to your wallet.`,
            link: '/wallet'
        });
    } catch (err) {
        console.warn('[Tsara Webhook] Notification failed:', err.message);
    }
}
