const Transaction = require('../models/Transaction');
const User = require('../models/User');
const WebhookEvent = require('../models/WebhookEvent');
const hostfiService = require('../services/hostfiService');
const hostfiWalletService = require('../services/hostfiWalletService');
const notificationService = require('../services/notificationService');
const { catchAsync } = require('../utils/errorHandler');

/**
 * Handle HostFi Fiat Deposit Webhook
 * Event: FIAT_DEPOSIT
 */
exports.handleFiatDeposit = catchAsync(async (req, res, next) => {
  const { event, data } = req.body;

  console.log('HostFi Fiat Deposit Webhook received:', { event, reference: data.reference });

  // Check for duplicate webhook
  const existingEvent = await WebhookEvent.findOne({
    eventId: data.reference,
    provider: 'hostfi',
    eventType: 'FIAT_DEPOSIT'
  });

  if (existingEvent) {
    console.log(`Duplicate webhook detected for reference ${data.reference}`);
    return res.status(200).json({ message: 'Webhook already processed' });
  }

  // Store webhook event
  await WebhookEvent.create({
    eventId: data.reference,
    provider: 'hostfi',
    eventType: 'FIAT_DEPOSIT',
    payload: req.body,
    signature: req.headers['x-webhook-signature']
  });

  try {
    // Find transaction by reference
    const transaction = await Transaction.findOne({ reference: data.reference });

    if (!transaction) {
      console.error(`Transaction not found for reference ${data.reference}`);
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const user = await User.findById(transaction.user);
    if (!user) {
      console.error(`User not found for transaction ${data.reference}`);
      return res.status(404).json({ message: 'User not found' });
    }

    if (data.status === 'SUCCESS') {
      // Update transaction
      transaction.status = 'completed';
      transaction.amount = data.amount.value;
      transaction.currency = data.amount.currency;
      transaction.completedAt = new Date();
      transaction.metadata = {
        ...transaction.metadata,
        hostfiData: data
      };
      await transaction.save();

      // Credit user wallet
      await hostfiWalletService.updateBalance(
        user._id,
        data.amount.currency,
        data.amount.value,
        'credit'
      );

      // Send notification
      await notificationService.createNotification({
        user: user._id,
        type: 'deposit_completed',
        title: 'Deposit Successful',
        message: `Your deposit of ${data.amount.currency} ${data.amount.value} has been credited to your wallet.`,
        metadata: {
          transactionId: transaction.transactionId,
          amount: data.amount.value,
          currency: data.amount.currency
        }
      });

      console.log(`Fiat deposit completed for user ${user._id}: ${data.amount.value} ${data.amount.currency}`);
    } else if (data.status === 'FAILED') {
      // Update transaction as failed
      transaction.status = 'failed';
      transaction.errorMessage = data.memo || 'Deposit failed';
      transaction.failedAt = new Date();
      await transaction.save();

      // Notify user
      await notificationService.createNotification({
        user: user._id,
        type: 'deposit_failed',
        title: 'Deposit Failed',
        message: `Your deposit has failed. ${data.memo || 'Please try again.'}`,
        metadata: {
          transactionId: transaction.transactionId
        }
      });

      console.log(`Fiat deposit failed for user ${user._id}: ${data.reference}`);
    }

    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing fiat deposit webhook:', error);
    res.status(500).json({ message: 'Error processing webhook', error: error.message });
  }
});

/**
 * Handle HostFi Fiat Withdrawal Webhook
 * Event: FIAT_WITHDRAWAL
 */
exports.handleFiatWithdrawal = catchAsync(async (req, res, next) => {
  const { event, data } = req.body;

  console.log('HostFi Fiat Withdrawal Webhook received:', { event, reference: data.reference });

  // Check for duplicate webhook
  const existingEvent = await WebhookEvent.findOne({
    eventId: data.reference,
    provider: 'hostfi',
    eventType: 'FIAT_WITHDRAWAL'
  });

  if (existingEvent) {
    console.log(`Duplicate webhook detected for reference ${data.reference}`);
    return res.status(200).json({ message: 'Webhook already processed' });
  }

  // Store webhook event
  await WebhookEvent.create({
    eventId: data.reference,
    provider: 'hostfi',
    eventType: 'FIAT_WITHDRAWAL',
    payload: req.body,
    signature: req.headers['x-webhook-signature']
  });

  try {
    // Find transaction by client reference
    const transaction = await Transaction.findOne({ reference: data.clientReference });

    if (!transaction) {
      console.error(`Transaction not found for reference ${data.clientReference}`);
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const user = await User.findById(transaction.user);
    if (!user) {
      console.error(`User not found for transaction ${data.clientReference}`);
      return res.status(404).json({ message: 'User not found' });
    }

    if (data.status === 'WITHDRAWAL_SUCCESS') {
      // Update transaction
      transaction.status = 'completed';
      transaction.completedAt = new Date();
      transaction.metadata = {
        ...transaction.metadata,
        hostfiData: data,
        fees: data.fees
      };
      await transaction.save();

      // Remove from pending balance
      if (user.wallet.pendingBalance >= transaction.amount) {
        user.wallet.pendingBalance -= transaction.amount;
        user.wallet.lastUpdated = new Date();
        await user.save();
      }

      // Send notification
      await notificationService.createNotification({
        user: user._id,
        type: 'withdrawal_completed',
        title: 'Withdrawal Successful',
        message: `Your withdrawal of ${data.amount.currency} ${data.amount.value} has been processed successfully.`,
        metadata: {
          transactionId: transaction.transactionId,
          amount: data.amount.value,
          currency: data.amount.currency,
          recipientAccount: data.recipient.accountNumber,
          recipientName: data.recipient.accountName
        }
      });

      console.log(`Fiat withdrawal completed for user ${user._id}: ${data.amount.value} ${data.amount.currency}`);
    } else if (data.status === 'WITHDRAWAL_FAILED') {
      // Update transaction as failed
      transaction.status = 'failed';
      transaction.errorMessage = data.memo || 'Withdrawal failed';
      transaction.failedAt = new Date();
      await transaction.save();

      // Refund to balance
      user.wallet.balance += transaction.amount;
      user.wallet.pendingBalance -= transaction.amount;
      user.wallet.lastUpdated = new Date();
      await user.save();

      // Notify user
      await notificationService.createNotification({
        user: user._id,
        type: 'withdrawal_failed',
        title: 'Withdrawal Failed',
        message: `Your withdrawal has failed and the amount has been refunded to your wallet. ${data.memo || ''}`,
        metadata: {
          transactionId: transaction.transactionId,
          amount: transaction.amount,
          currency: transaction.currency
        }
      });

      console.log(`Fiat withdrawal failed for user ${user._id}: ${data.clientReference}, amount refunded`);
    } else if (data.status === 'WITHDRAWAL_PENDING' || data.status === 'WITHDRAWAL_IN_PROGRESS') {
      // Update status
      transaction.status = 'processing';
      await transaction.save();

      console.log(`Fiat withdrawal in progress for user ${user._id}: ${data.clientReference}`);
    }

    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing fiat withdrawal webhook:', error);
    res.status(500).json({ message: 'Error processing webhook', error: error.message });
  }
});

/**
 * Test webhook endpoint (for development)
 */
exports.testWebhook = catchAsync(async (req, res, next) => {
  console.log('Test webhook received:', req.body);
  res.status(200).json({ message: 'Test webhook received successfully', data: req.body });
});
