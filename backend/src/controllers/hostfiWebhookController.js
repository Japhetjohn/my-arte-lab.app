const User = require('../models/User');
const Transaction = require('../models/Transaction');
const WebhookEvent = require('../models/WebhookEvent');
const hostfiService = require('../services/hostfiService');
const hostfiWalletService = require('../services/hostfiWalletService');
const { catchAsync } = require('../utils/errorHandler');

/**
 * Handle Address Generated Webhook
 * Triggered when a new collection address is created
 */
exports.handleAddressGenerated = catchAsync(async (req, res) => {
  const payload = req.body;

  // Verify webhook signature
  const signature = req.headers['x-hostfi-signature'];
  if (!hostfiService.verifyWebhookSignature(signature, payload)) {
    return res.status(401).json({ success: false, error: 'Invalid signature' });
  }

  // Record webhook event
  try {
    await WebhookEvent.recordWebhook({
      eventId: payload.id || payload.reference,
      provider: 'hostfi',
      eventType: 'address_generated',
      payload,
      signature
    });
  } catch (error) {
    if (error.message.includes('Duplicate')) {
      return res.status(200).json({ success: true, message: 'Event already processed' });
    }
  }

  console.log('Address generated webhook received:', payload);

  // Update transaction record if needed
  if (payload.customId && payload.address) {
    await Transaction.updateOne(
      { reference: payload.id, user: payload.customId },
      {
        $set: {
          'paymentDetails.walletAddress': payload.address,
          'paymentDetails.qrCode': payload.qrCode,
          processedAt: new Date()
        }
      }
    );
  }

  res.status(200).json({ success: true, message: 'Webhook processed' });
});

/**
 * Handle Fiat Deposit Received Webhook
 * Triggered when user sends fiat money to collection channel
 */
exports.handleFiatDeposit = catchAsync(async (req, res) => {
  const payload = req.body;

  // Verify webhook signature
  const signature = req.headers['x-hostfi-signature'];
  if (!hostfiService.verifyWebhookSignature(signature, payload)) {
    return res.status(401).json({ success: false, error: 'Invalid signature' });
  }

  // Record webhook event
  try {
    await WebhookEvent.recordWebhook({
      eventId: payload.id || payload.reference,
      provider: 'hostfi',
      eventType: 'fiat_deposit',
      payload,
      signature
    });
  } catch (error) {
    if (error.message.includes('Duplicate')) {
      return res.status(200).json({ success: true, message: 'Event already processed' });
    }
  }

  console.log('Fiat deposit webhook received:', payload);

  // Apply 1% platform fee on deposits (on-ramp)
  const depositAmount = payload.amount || 0;
  const feeBreakdown = hostfiService.calculateOnRampFee(depositAmount);

  // Find user by customId
  const user = await User.findById(payload.customId);
  if (!user) {
    console.error(`User not found for deposit: ${payload.customId}`);
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  try {
    // Credit user wallet (amount after 1% platform fee)
    user.wallet.balance += feeBreakdown.amountAfterFee;
    user.wallet.totalEarnings += feeBreakdown.amountAfterFee;
    user.wallet.lastUpdated = new Date();
    await user.save();

    // Create or update transaction record
    await Transaction.findOneAndUpdate(
      { reference: payload.channelId || payload.id },
      {
        $set: {
          amount: depositAmount,
          status: 'completed',
          platformFee: feeBreakdown.platformFee,
          netAmount: feeBreakdown.amountAfterFee,
          completedAt: new Date(),
          'paymentDetails.actualAmount': depositAmount
        }
      },
      { upsert: true, new: true }
    );

    // Sync wallet balances
    await hostfiWalletService.syncWalletBalances(user._id);

    console.log(`Fiat deposit credited: User ${user._id}, Gross: ${depositAmount}, Fee: ${feeBreakdown.platformFee} (1%), Net: ${feeBreakdown.amountAfterFee}`);

    await WebhookEvent.markProcessed(payload.id || payload.reference, 'hostfi');

    res.status(200).json({ success: true, message: 'Deposit processed successfully' });
  } catch (error) {
    console.error('Error processing fiat deposit:', error);
    await WebhookEvent.markProcessed(payload.id || payload.reference, 'hostfi', error.message);
    res.status(500).json({ success: false, error: 'Processing failed' });
  }
});

/**
 * Handle Crypto Deposit Received Webhook
 * Triggered when user sends crypto to collection address
 */
exports.handleCryptoDeposit = catchAsync(async (req, res) => {
  const payload = req.body;

  // Verify webhook signature
  const signature = req.headers['x-hostfi-signature'];
  if (!hostfiService.verifyWebhookSignature(signature, payload)) {
    return res.status(401).json({ success: false, error: 'Invalid signature' });
  }

  // Record webhook event
  try {
    await WebhookEvent.recordWebhook({
      eventId: payload.id || payload.txHash,
      provider: 'hostfi',
      eventType: 'crypto_deposit',
      payload,
      signature
    });
  } catch (error) {
    if (error.message.includes('Duplicate')) {
      return res.status(200).json({ success: true, message: 'Event already processed' });
    }
  }

  console.log('Crypto deposit webhook received:', payload);

  // Apply 1% platform fee on deposits (on-ramp)
  const depositAmount = payload.amount || 0;
  const feeBreakdown = hostfiService.calculateOnRampFee(depositAmount);

  // Find user by customId
  const user = await User.findById(payload.customId);
  if (!user) {
    console.error(`User not found for crypto deposit: ${payload.customId}`);
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  try {
    // Credit user wallet (amount after 1% platform fee)
    user.wallet.balance += feeBreakdown.amountAfterFee;
    user.wallet.totalEarnings += feeBreakdown.amountAfterFee;
    user.wallet.lastUpdated = new Date();
    await user.save();

    // Create or update transaction record
    await Transaction.findOneAndUpdate(
      { reference: payload.addressId || payload.id },
      {
        $set: {
          amount: depositAmount,
          currency: payload.currency,
          status: 'completed',
          platformFee: feeBreakdown.platformFee,
          netAmount: feeBreakdown.amountAfterFee,
          transactionHash: payload.txHash,
          blockchainNetwork: payload.network,
          confirmations: payload.confirmations || 0,
          completedAt: new Date(),
          'paymentDetails.txHash': payload.txHash,
          'paymentDetails.network': payload.network
        }
      },
      { upsert: true, new: true }
    );

    // Sync wallet balances
    await hostfiWalletService.syncWalletBalances(user._id);

    console.log(`Crypto deposit credited: User ${user._id}, Gross: ${depositAmount} ${payload.currency}, Fee: ${feeBreakdown.platformFee} (1%), Net: ${feeBreakdown.amountAfterFee}`);

    await WebhookEvent.markProcessed(payload.id || payload.txHash, 'hostfi');

    res.status(200).json({ success: true, message: 'Crypto deposit processed successfully' });
  } catch (error) {
    console.error('Error processing crypto deposit:', error);
    await WebhookEvent.markProcessed(payload.id || payload.txHash, 'hostfi', error.message);
    res.status(500).json({ success: false, error: 'Processing failed' });
  }
});

/**
 * Handle Fiat Payout Webhook
 * Triggered when withdrawal to bank account completes
 */
exports.handleFiatPayout = catchAsync(async (req, res) => {
  const payload = req.body;

  // Verify webhook signature
  const signature = req.headers['x-hostfi-signature'];
  if (!hostfiService.verifyWebhookSignature(signature, payload)) {
    return res.status(401).json({ success: false, error: 'Invalid signature' });
  }

  // Record webhook event
  try {
    await WebhookEvent.recordWebhook({
      eventId: payload.id || payload.reference,
      provider: 'hostfi',
      eventType: 'fiat_payout',
      payload,
      signature
    });
  } catch (error) {
    if (error.message.includes('Duplicate')) {
      return res.status(200).json({ success: true, message: 'Event already processed' });
    }
  }

  console.log('Fiat payout webhook received:', payload);

  // Find transaction by reference
  const transaction = await Transaction.findOne({ reference: payload.clientReference });
  if (!transaction) {
    console.error(`Transaction not found for payout: ${payload.clientReference}`);
    return res.status(404).json({ success: false, error: 'Transaction not found' });
  }

  try {
    const user = await User.findById(transaction.user);
    if (!user) {
      throw new Error('User not found');
    }

    if (payload.status === 'COMPLETED' || payload.status === 'SUCCESS') {
      // Withdrawal successful - remove from pending
      user.wallet.pendingBalance -= transaction.amount;
      await user.save();

      // Update transaction
      transaction.status = 'completed';
      transaction.completedAt = new Date();
      transaction.metadata.hostfiStatus = payload.status;
      await transaction.save();

      console.log(`Fiat payout completed: User ${user._id}, Amount: ${transaction.amount}`);
    } else if (payload.status === 'FAILED' || payload.status === 'REJECTED') {
      // Withdrawal failed - refund balance
      user.wallet.balance += transaction.amount;
      user.wallet.pendingBalance -= transaction.amount;
      await user.save();

      // Update transaction
      transaction.status = 'failed';
      transaction.failedAt = new Date();
      transaction.errorMessage = payload.reason || 'Payout failed';
      transaction.metadata.hostfiStatus = payload.status;
      await transaction.save();

      console.log(`Fiat payout failed: User ${user._id}, Amount refunded: ${transaction.amount}`);
    } else {
      // Processing status
      transaction.status = 'processing';
      transaction.processedAt = new Date();
      transaction.metadata.hostfiStatus = payload.status;
      await transaction.save();
    }

    // Sync wallet balances
    await hostfiWalletService.syncWalletBalances(user._id);

    await WebhookEvent.markProcessed(payload.id || payload.reference, 'hostfi');

    res.status(200).json({ success: true, message: 'Payout webhook processed successfully' });
  } catch (error) {
    console.error('Error processing fiat payout:', error);
    await WebhookEvent.markProcessed(payload.id || payload.reference, 'hostfi', error.message);
    res.status(500).json({ success: false, error: 'Processing failed' });
  }
});

/**
 * Handle Crypto Payout Webhook
 * Triggered when crypto withdrawal completes
 */
exports.handleCryptoPayout = catchAsync(async (req, res) => {
  const payload = req.body;

  // Verify webhook signature
  const signature = req.headers['x-hostfi-signature'];
  if (!hostfiService.verifyWebhookSignature(signature, payload)) {
    return res.status(401).json({ success: false, error: 'Invalid signature' });
  }

  // Record webhook event
  try {
    await WebhookEvent.recordWebhook({
      eventId: payload.id || payload.txHash,
      provider: 'hostfi',
      eventType: 'crypto_payout',
      payload,
      signature
    });
  } catch (error) {
    if (error.message.includes('Duplicate')) {
      return res.status(200).json({ success: true, message: 'Event already processed' });
    }
  }

  console.log('Crypto payout webhook received:', payload);

  // Find transaction by reference
  const transaction = await Transaction.findOne({ reference: payload.clientReference });
  if (!transaction) {
    console.error(`Transaction not found for crypto payout: ${payload.clientReference}`);
    return res.status(404).json({ success: false, error: 'Transaction not found' });
  }

  try {
    const user = await User.findById(transaction.user);
    if (!user) {
      throw new Error('User not found');
    }

    if (payload.status === 'COMPLETED' || payload.status === 'SUCCESS') {
      // Withdrawal successful - remove from pending
      user.wallet.pendingBalance -= transaction.amount;
      await user.save();

      // Update transaction
      transaction.status = 'completed';
      transaction.completedAt = new Date();
      transaction.transactionHash = payload.txHash;
      transaction.blockchainNetwork = payload.network;
      transaction.metadata.hostfiStatus = payload.status;
      await transaction.save();

      console.log(`Crypto payout completed: User ${user._id}, Amount: ${transaction.amount}`);
    } else if (payload.status === 'FAILED' || payload.status === 'REJECTED') {
      // Withdrawal failed - refund balance
      user.wallet.balance += transaction.amount;
      user.wallet.pendingBalance -= transaction.amount;
      await user.save();

      // Update transaction
      transaction.status = 'failed';
      transaction.failedAt = new Date();
      transaction.errorMessage = payload.reason || 'Crypto payout failed';
      transaction.metadata.hostfiStatus = payload.status;
      await transaction.save();

      console.log(`Crypto payout failed: User ${user._id}, Amount refunded: ${transaction.amount}`);
    } else {
      // Processing status
      transaction.status = 'processing';
      transaction.processedAt = new Date();
      transaction.metadata.hostfiStatus = payload.status;
      await transaction.save();
    }

    // Sync wallet balances
    await hostfiWalletService.syncWalletBalances(user._id);

    await WebhookEvent.markProcessed(payload.id || payload.txHash, 'hostfi');

    res.status(200).json({ success: true, message: 'Crypto payout webhook processed successfully' });
  } catch (error) {
    console.error('Error processing crypto payout:', error);
    await WebhookEvent.markProcessed(payload.id || payload.txHash, 'hostfi', error.message);
    res.status(500).json({ success: false, error: 'Processing failed' });
  }
});

/**
 * Test webhook endpoint (development only)
 */
exports.testWebhook = catchAsync(async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, error: 'Test endpoint not available in production' });
  }

  const { type, payload } = req.body;

  console.log(`Test webhook received: ${type}`, payload);

  res.status(200).json({
    success: true,
    message: 'Test webhook received',
    type,
    payload
  });
});
