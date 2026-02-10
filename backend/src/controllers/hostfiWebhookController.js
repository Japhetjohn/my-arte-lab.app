const User = require('../models/User');
const Transaction = require('../models/Transaction');
const WebhookEvent = require('../models/WebhookEvent');
const hostfiService = require('../services/hostfiService');
const hostfiWalletService = require('../services/hostfiWalletService');
const { catchAsync } = require('../utils/errorHandler');

/**
 * Unified HostFi Webhook Handler
 */
exports.handleWebhook = catchAsync(async (req, res, next) => {
  const payload = req.body;
  const authSecret = req.headers['x-auth-secret'] || 'no-signature';

  // 1. Verify Signature
  if (!hostfiService.verifyWebhookSignature(authSecret)) {
    console.warn('[HostFi Webhook] Unauthorized attempt - Invalid secret');
    return res.status(401).json({ success: false, error: 'Invalid secret' });
  }

  // 2. Parse Payload
  const parsed = hostfiService.parseWebhookData(payload);
  const { event, id, amount, currency, status, customId, clientReference } = parsed;

  console.log(`[HostFi Webhook] Received ${event}. Status: ${status}, Amount: ${amount} ${currency}, User: ${customId}`);

  // 3. Record Event (Idempotency)
  try {
    await WebhookEvent.recordWebhook({
      eventId: id,
      provider: 'hostfi',
      eventType: event.toLowerCase(),
      payload: payload,
      signature: authSecret
    });
  } catch (error) {
    if (error.message.includes('Duplicate') || error.code === 11000) {
      console.log(`[HostFi Webhook] Duplicate event ignored: ${id}`);
      return res.status(200).json({ success: true, message: 'Event already processed' });
    }
    console.error(`[HostFi Webhook] Failed to record event:`, error.message);
    throw error;
  }

  // 4. Dispatch
  try {
    switch (event.toUpperCase()) {
      case 'FIAT_DEPOSIT':
      case 'FIAT_DEPOSIT_RECEIVED':
        await processFiatDeposit(parsed);
        break;

      case 'CRYPTO_DEPOSIT':
      case 'CRYPTO_DEPOSIT_RECEIVED':
        await processCryptoDeposit(parsed);
        break;

      case 'FIAT_WITHDRAWAL':
      case 'FIAT_PAYOUT':
        await processPayout(parsed, 'fiat');
        break;

      case 'CRYPTO_WITHDRAWAL':
      case 'CRYPTO_PAYOUT':
        await processPayout(parsed, 'crypto');
        break;

      case 'ADDRESS_GENERATED':
        await processAddressGenerated(parsed);
        break;

      default:
        console.log(`[HostFi Webhook] Unhandled event type: ${event}`);
    }

    await WebhookEvent.markProcessed(id, 'hostfi');
    console.log(`[HostFi Webhook] Successfully processed ${event}: ${id}`);
    res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error(`[HostFi Webhook] Error processing ${event}:`, error.message);
    console.error(error.stack);
    await WebhookEvent.markProcessed(id, 'hostfi', error.message);
    res.status(500).json({ success: false, error: 'Internal processing error', details: error.message });
  }
});

// ============================================
// Internal Processors
// ============================================

async function processFiatDeposit(parsed) {
  const { id, amount, currency, customId, status, data } = parsed;

  if (!['SUCCESS', 'COMPLETED', 'CREDITED'].includes(status)) {
    console.log(`[Webhook:FiatDeposit] Status ${status} is not successful, ignoring credit logic.`);
    return;
  }

  const feeBreakdown = hostfiService.calculateOnRampFee(amount);

  let userId = customId;
  if (userId && typeof userId === 'string' && userId.endsWith('-FIAT')) {
    userId = userId.replace('-FIAT', '');
  }

  const user = await User.findById(userId);
  if (!user) {
    console.error(`[Webhook:FiatDeposit] User not found: ${userId}`);
    throw new Error(`User not found: ${userId}`);
  }

  console.log(`[Webhook:FiatDeposit] Crediting User ${user._id} for ${amount} ${currency}`);
  await hostfiWalletService.updateBalance(user._id, currency, feeBreakdown.amountAfterFee, 'credit');

  const updateResult = await Transaction.findOneAndUpdate(
    {
      user: user._id,
      $or: [
        { reference: data.channelId },
        { reference: id },
        { 'metadata.collectionChannelId': data.channelId }
      ]
    },
    {
      $set: {
        type: 'deposit',
        amount: amount,
        currency: currency,
        status: 'completed',
        platformFee: feeBreakdown.platformFee,
        netAmount: feeBreakdown.amountAfterFee,
        completedAt: new Date(),
        'paymentDetails.actualAmount': amount,
        'metadata.hostfiReference': id,
        'metadata.hostfiStatus': status
      }
    },
    { upsert: true, new: true }
  );

  if (updateResult) {
    console.log(`[Webhook:FiatDeposit] Transaction record updated: ${updateResult._id}`);
  }
}

async function processCryptoDeposit(parsed) {
  const { id, amount, currency, customId, status, txHash, network, data } = parsed;

  if (!['SUCCESS', 'COMPLETED', 'CREDITED', 'SUCCESSFUL'].includes(status)) {
    return;
  }

  const feeBreakdown = hostfiService.calculateOnRampFee(amount);
  const user = await User.findById(customId);
  if (!user) throw new Error(`User not found: ${customId}`);

  console.log(`[Webhook:CryptoDeposit] Crediting User ${user._id} for ${amount} ${currency}`);
  await hostfiWalletService.updateBalance(user._id, currency, feeBreakdown.amountAfterFee, 'credit');

  await Transaction.findOneAndUpdate(
    {
      user: user._id,
      $or: [
        { reference: data.addressId },
        { reference: id },
        { 'paymentDetails.walletAddress': data.address }
      ]
    },
    {
      $set: {
        user: user._id,
        type: 'deposit',
        amount: amount,
        currency: currency,
        status: 'completed',
        platformFee: feeBreakdown.platformFee,
        netAmount: feeBreakdown.amountAfterFee,
        transactionHash: txHash,
        blockchainNetwork: network,
        completedAt: new Date(),
        'paymentDetails.txHash': txHash,
        'paymentDetails.network': network,
        'metadata.hostfiReference': id,
        'metadata.hostfiStatus': status
      }
    },
    { upsert: true, new: true }
  );
}

async function processPayout(parsed, payoutType) {
  const { status, clientReference, txHash, data } = parsed;
  console.log(`[Webhook:Payout] processing ${payoutType} payout for ref: ${clientReference}, status: ${status}`);

  const transaction = await Transaction.findOne({ reference: clientReference });
  if (!transaction) {
    console.warn(`[Webhook:Payout] Transaction not found for clientReference: ${clientReference}`);
    return;
  }

  const user = await User.findById(transaction.user);
  if (!user) throw new Error('User not found linked to transaction');

  const isSuccess = ['COMPLETED', 'SUCCESS', 'WITHDRAWAL_SUCCESS', 'SUCCESSFUL'].includes(status);
  const isFailed = ['FAILED', 'REJECTED', 'WITHDRAWAL_FAILED', 'DEBIT_FAILED', 'FAILED_PAYOUT'].includes(status);

  if (isSuccess) {
    if (transaction.status !== 'completed') {
      user.wallet.pendingBalance -= transaction.amount;
      await user.save();

      transaction.status = 'completed';
      transaction.completedAt = new Date();
      transaction.transactionHash = txHash || transaction.transactionHash;
      transaction.metadata.hostfiStatus = status;
      await transaction.save();
      console.log(`[Webhook:Payout] Payout marked complete for User ${user._id}`);
    }
  } else if (isFailed) {
    if (transaction.status !== 'failed') {
      console.log(`[Webhook:Payout] Payout failed. Refunding User ${user._id}`);
      await hostfiWalletService.updateBalance(user._id, transaction.currency, transaction.amount, 'credit');
      user.wallet.pendingBalance -= transaction.amount;
      await user.save();

      transaction.status = 'failed';
      transaction.failedAt = new Date();
      transaction.errorMessage = data.reason || 'Payout failed';
      transaction.metadata.hostfiStatus = status;
      await transaction.save();
    }
  } else {
    transaction.status = 'processing';
    transaction.metadata.hostfiStatus = status;
    await transaction.save();
  }

  await hostfiWalletService.syncWalletBalances(user._id);
}

async function processAddressGenerated(parsed) {
  const { id, data, customId } = parsed;
  if (!customId || !data.address) return;

  console.log(`[Webhook:AddressGenerated] Linking address ${data.address} to user ${customId}`);
  await Transaction.updateOne(
    { reference: id, user: customId },
    {
      $set: {
        'paymentDetails.walletAddress': data.address,
        'paymentDetails.qrCode': data.qrCode,
        processedAt: new Date()
      }
    }
  );
}

// ============================================
// Legacy compatibility exports
// ============================================
exports.handleAddressGenerated = exports.handleWebhook;
exports.handleFiatDeposit = exports.handleWebhook;
exports.handleCryptoDeposit = exports.handleWebhook;
exports.handleFiatPayout = exports.handleWebhook;
exports.handleCryptoPayout = exports.handleWebhook;

/**
 * Test webhook endpoint (development only)
 */
exports.testWebhook = catchAsync(async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, error: 'Test endpoint not available in production' });
  }
  console.log('Test webhook received:', req.body);
  res.status(200).json({ success: true, message: 'Test webhook received', payload: req.body });
});
