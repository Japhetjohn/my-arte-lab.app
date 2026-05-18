const User = require('../models/User');
const Transaction = require('../models/Transaction');
const WebhookEvent = require('../models/WebhookEvent');
const hostfiService = require('../services/hostfiService');
const hostfiWalletService = require('../services/hostfiWalletService');
const reconciliationService = require('../services/hostfiReconciliationService');
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
      case 'FIAT_PAYOUT': // Keeping FIAT_PAYOUT for backward compatibility if needed
        await processPayout(parsed, 'fiat');
        break;

      case 'CRYPTO_WITHDRAWAL':
      case 'CRYPTO_PAYOUT': // Keeping CRYPTO_PAYOUT for backward compatibility if needed
        await processPayout(parsed, 'crypto');
        break;

      case 'PAYMENT_SUCCESS':
      case 'PAYMENT_FAILED':
      case 'PAYMENT_EXPIRED':
      case 'PAYMENT_CANCELED':
        await processPayout(parsed, 'pay');
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

  if (!['SUCCESS', 'SUCCESSFUL', 'COMPLETED', 'CREDITED'].includes(status)) {
    console.log(`[Webhook:FiatDeposit] Status ${status} is not successful, ignoring credit logic.`);
    return;
  }

  let userId = customId;
  // If customId is a string and has a suffix like "-FIAT-1772842743721", extract the first 24 chars
  if (userId && typeof userId === 'string' && userId.length > 24) {
    userId = userId.substring(0, 24);
  }

  const user = await User.findById(userId);
  if (!user) {
    console.error(`[Webhook:FiatDeposit] User not found: ${userId} (from customId: ${customId})`);
    throw new Error(`User not found: ${userId}`);
  }

  console.log(`[Webhook:FiatDeposit] Processing deposit for User ${user._id}: ${amount} ${currency}`);

  // ─── HYBRID DEPOSIT FLOW ───
  // HostFi auto-swaps fiat (NGN) to USDC. We need the USDC amount, not the original NGN.
  // 1. Query HostFi for the actual swapped USDC amount
  // 2. Create Transaction record in DB (as USDC)
  // 3. Update user's wallet balance (USDC)
  // 4. Send notification

  const rawAmount = parseFloat(amount) || 0;
  const rawCurrency = (currency || 'NGN').toUpperCase();

  // ─── STEP 1: Get actual USDC amount from HostFi ───
  let usdcAmount = rawAmount;
  let usdcCurrency = 'USDC';
  let originalAmount = rawAmount;
  let originalCurrency = rawCurrency;
  let swapDetails = null;

  try {
    // Query HostFi transaction to get the swap result
    const hostfiTx = await hostfiService.getTransactionByReference(id);
    console.log(`[Webhook:FiatDeposit] HostFi transaction data:`, JSON.stringify(hostfiTx, null, 2));

    if (hostfiTx) {
      // Check if this is a swap transaction or has swap-related data
      const txData = hostfiTx.data || hostfiTx;
      
      // Look for the USDC credit leg in swap transactions
      if (txData.transactions && Array.isArray(txData.transactions)) {
        // It's a swap result with debit + credit legs
        const creditLeg = txData.transactions.find(t => 
          t.type === 'CREDIT' && 
          (t.amount?.currency === 'USDC' || t.asset?.currency?.code === 'USDC')
        );
        if (creditLeg) {
          usdcAmount = parseFloat(creditLeg.amount?.value || creditLeg.amount || 0);
          swapDetails = { creditLeg, debitLeg: txData.transactions.find(t => t.type === 'DEBIT') };
          console.log(`[Webhook:FiatDeposit] Swap detected. USDC credited: ${usdcAmount}`);
        }
      } else if (txData.amount?.currency === 'USDC' || txData.currency === 'USDC') {
        // Direct USDC amount
        usdcAmount = parseFloat(txData.amount?.value || txData.amount || 0);
        console.log(`[Webhook:FiatDeposit] Direct USDC amount: ${usdcAmount}`);
      } else if (txData.swappedAmount || txData.convertedAmount) {
        usdcAmount = parseFloat(txData.swappedAmount || txData.convertedAmount || 0);
        console.log(`[Webhook:FiatDeposit] Swapped amount: ${usdcAmount}`);
      }

      // If we still have NGN amount, try to get swap rate from metadata
      if (usdcAmount === rawAmount && rawCurrency === 'NGN') {
        // Fallback: use a reasonable conversion rate (HostFi rate ~1550-1600 NGN per USDC)
        // This is a fallback - the API query above should normally give us the real amount
        const estimatedRate = 1570; // Approximate HostFi rate
        usdcAmount = parseFloat((rawAmount / estimatedRate).toFixed(2));
        console.log(`[Webhook:FiatDeposit] Fallback conversion: ${rawAmount} NGN → ~${usdcAmount} USDC @ ${estimatedRate}`);
      }
    }
  } catch (apiError) {
    console.warn(`[Webhook:FiatDeposit] Could not fetch swap details from HostFi: ${apiError.message}`);
    // Fallback: estimate USDC from NGN
    if (rawCurrency === 'NGN') {
      const estimatedRate = 1570;
      usdcAmount = parseFloat((rawAmount / estimatedRate).toFixed(2));
      console.log(`[Webhook:FiatDeposit] Fallback conversion: ${rawAmount} NGN → ~${usdcAmount} USDC @ ${estimatedRate}`);
    }
  }

  // Ensure positive amount
  usdcAmount = Math.max(0, usdcAmount);

  console.log(`[Webhook:FiatDeposit] Final amounts: ${originalAmount} ${originalCurrency} → ${usdcAmount} USDC`);

  // ─── STEP 2: Create deposit transaction record (as USDC) ───
  const transactionId = `DEPOSIT-${id.substring(0, 12)}-${Date.now()}`;
  const txRecord = await Transaction.create({
    transactionId,
    user: user._id,
    type: 'deposit',
    amount: usdcAmount,
    currency: 'USDC',
    status: 'completed',
    description: `Deposit of ${originalAmount} ${originalCurrency} (≈ ${usdcAmount} USDC)`,
    completedAt: new Date(),
    metadata: {
      hostfiReference: id,
      hostfiStatus: status,
      channelId: data?.channelId,
      depositType: 'fiat',
      originalAmount: originalAmount,
      originalCurrency: originalCurrency,
      swapDetails: swapDetails,
      processedAt: new Date().toISOString()
    }
  });

  console.log(`[Webhook:FiatDeposit] Transaction created: ${txRecord.transactionId} (${usdcAmount} USDC)`);

  // ─── STEP 3: Update user's wallet balance (USDC) ───
  const currentBalance = parseFloat(user.wallet.balance) || 0;
  const newBalance = currentBalance + usdcAmount;
  user.wallet.balance = parseFloat(newBalance.toFixed(2));
  user.balance = user.wallet.balance;
  user.wallet.lastUpdated = new Date();
  await user.save({ validateBeforeSave: false });

  console.log(`[Webhook:FiatDeposit] Balance updated: ${currentBalance} → ${user.wallet.balance} USDC`);

  // ─── STEP 4: Send Notification ───
  try {
    const Notification = require('../models/Notification');
    await Notification.createNotification({
      recipient: user._id,
      type: 'deposit_credited',
      title: 'Deposit Credited',
      message: `Your deposit of ${originalAmount} ${originalCurrency} has been credited as ${usdcAmount} USDC to your wallet.`,
      link: '/wallet',
      metadata: {
        amount: usdcAmount,
        currency: 'USDC',
        originalAmount: originalAmount,
        originalCurrency: originalCurrency,
        transactionId: txRecord.transactionId
      }
    });
    console.log(`[Webhook:FiatDeposit] Notification sent to user ${user._id}`);
  } catch (err) {
    console.warn('[Webhook:FiatDeposit] Notification failed:', err.message);
  }
}

async function processCryptoDeposit(parsed) {
  const { id, amount, currency, customId, status, txHash, network, data } = parsed;

  if (!['SUCCESS', 'COMPLETED', 'CREDITED', 'SUCCESSFUL'].includes(status)) {
    return;
  }

  const user = await User.findById(customId);
  if (!user) throw new Error(`User not found: ${customId}`);

  const depositAmount = parseFloat(amount) || 0;
  const depositCurrency = (currency || 'USDC').toUpperCase();

  console.log(`[Webhook:CryptoDeposit] Processing deposit for User ${user._id}: ${depositAmount} ${depositCurrency}`);

  // 1. Create deposit transaction record
  const transactionId = `DEPOSIT-${id.substring(0, 12)}-${Date.now()}`;
  const txRecord = await Transaction.create({
    transactionId,
    user: user._id,
    type: 'deposit',
    amount: depositAmount,
    currency: depositCurrency,
    status: 'completed',
    description: `Crypto deposit of ${depositAmount} ${depositCurrency}`,
    transactionHash: txHash,
    completedAt: new Date(),
    metadata: {
      hostfiReference: id,
      hostfiStatus: status,
      txHash,
      network,
      address: data?.address,
      depositType: 'crypto',
      processedAt: new Date().toISOString()
    }
  });

  console.log(`[Webhook:CryptoDeposit] Transaction created: ${txRecord.transactionId}`);

  // 2. Update user's wallet balance directly
  const currentBalance = parseFloat(user.wallet.balance) || 0;
  const newBalance = currentBalance + depositAmount;
  user.wallet.balance = parseFloat(newBalance.toFixed(2));
  user.balance = user.wallet.balance;
  user.wallet.lastUpdated = new Date();
  await user.save({ validateBeforeSave: false });

  console.log(`[Webhook:CryptoDeposit] Balance updated: ${currentBalance} → ${user.wallet.balance} ${depositCurrency}`);

  // 3. Send Notification
  try {
    const Notification = require('../models/Notification');
    await Notification.createNotification({
      recipient: user._id,
      type: 'deposit_credited',
      title: 'Crypto Deposit Credited',
      message: `Your deposit of ${depositAmount} ${depositCurrency} has been credited to your wallet.`,
      link: '/wallet',
      metadata: {
        amount: depositAmount,
        currency: depositCurrency,
        txHash,
        transactionId: txRecord.transactionId
      }
    });
  } catch (err) {
    console.warn('[Webhook:CryptoDeposit] Notification failed:', err.message);
  }
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

  const isSuccess = ['COMPLETED', 'SUCCESS', 'WITHDRAWAL_SUCCESS', 'SUCCESSFUL', 'PAID'].includes(status);
  const isFailed = ['FAILED', 'REJECTED', 'WITHDRAWAL_FAILED', 'DEBIT_FAILED', 'FAILED_PAYOUT', 'CANCELED', 'EXPIRED'].includes(status);

  if (isSuccess) {
    // Just update the transaction hash/reference — balance already deducted
    transaction.transactionHash = txHash || transaction.transactionHash;
    transaction.metadata.hostfiStatus = status;
    transaction.metadata.hostfiReference = clientReference;
    await transaction.save();
    console.log(`[Webhook:Payout] Payout confirmed on HostFi for User ${user._id}, ref: ${clientReference}`);
  } else if (isFailed) {
    if (transaction.status !== 'failed') {
      console.log(`[Webhook:Payout] Payout failed. Refunding User ${user._id}`);
      
      // Refund: create a credit transaction
      await Transaction.create({
        transactionId: `REFUND-${Date.now()}`,
        user: user._id,
        type: 'refund',
        amount: transaction.amount,
        currency: transaction.currency,
        status: 'completed',
        description: `Refund for failed withdrawal`,
        metadata: {
          originalTransaction: transaction.transactionId,
          hostfiReference: clientReference,
          reason: data.reason || 'Payout failed'
        }
      });

      transaction.status = 'failed';
      transaction.failedAt = new Date();
      transaction.errorMessage = data.reason || 'Payout failed';
      transaction.metadata.hostfiStatus = status;
      await transaction.save();
    }
  }

  // Send Notification for success/failure
  try {
    const Notification = require('../models/Notification');
    if (isSuccess) {
      await Notification.createNotification({
        recipient: user._id,
        type: 'payout_completed',
        title: 'Withdrawal Successful',
        message: `Your withdrawal of ${transaction.amount} ${transaction.currency} has been processed successfully.`,
        link: '/wallet'
      });
    } else if (isFailed) {
      await Notification.createNotification({
        recipient: user._id,
        type: 'payout_failed',
        title: 'Withdrawal Failed',
        message: `Your withdrawal of ${transaction.amount} ${transaction.currency} failed. The funds have been returned to your wallet.`,
        link: '/wallet'
      });
    }
  } catch (err) {
    console.warn('[Webhook:Payout] Notification failed:', err.message);
  }

  // Sync balance to recalculate from transaction history
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
