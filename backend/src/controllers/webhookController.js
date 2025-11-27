const { successResponse } = require('../utils/apiResponse');
const { ErrorHandler, catchAsync } = require('../utils/errorHandler');
const breadService = require('../services/breadService');
const breadConfig = require('../config/bread');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const notificationService = require('../services/notificationService');
const emailService = require('../services/emailService');

exports.testWebhook = catchAsync(async (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return next(new ErrorHandler('Test endpoint not available in production', 404));
  }

  successResponse(res, 200, 'Test webhook received', {
    receivedData: req.body,
    timestamp: new Date()
  });
});

// ============= bread.africa Webhook Handler =============

exports.handleBreadWebhook = catchAsync(async (req, res, next) => {
  const signature = req.headers['x-bread-signature'] || req.headers['x-webhook-signature'];

  if (!signature) {
    console.warn('bread.africa webhook: Missing signature');
    return next(new ErrorHandler('Missing webhook signature', 401));
  }

  const rawBody = JSON.stringify(req.body);

  const isValid = breadService.verifyWebhookSignature(rawBody, signature);

  if (!isValid) {
    console.warn('bread.africa webhook: Invalid signature');
    return next(new ErrorHandler('Invalid webhook signature', 401));
  }

  try {
    const { event, data } = req.body;

    if (!event || !data) {
      console.warn('bread.africa webhook: Invalid payload structure');
      return successResponse(res, 200, 'Webhook received but invalid structure');
    }

    console.log(`bread.africa webhook received: ${event}`, JSON.stringify(data, null, 2));

    switch (event) {
      case 'wallet.credited':
        await processWalletCredited(data);
        break;

      case 'offramp.completed':
        await processOfframpCompleted(data);
        break;

      case 'offramp.failed':
        await processOfframpFailed(data);
        break;

      default:
        console.warn('bread.africa webhook: Unknown event type', event);
    }

    successResponse(res, 200, 'Webhook processed successfully', { event });

  } catch (error) {
    console.error('bread.africa webhook processing error:', error);
    // Always return 200 to prevent bread.africa from retrying
    successResponse(res, 200, 'Webhook received but processing failed');
  }
});

// Helper function: Process wallet credited (deposit completed)
async function processWalletCredited(data) {
  try {
    const {
      wallet_id: walletId,
      amount,
      currency,
      reference,
      transaction_id: transactionId,
      credited_at: creditedAt
    } = data;

    // Find user by breadWalletId
    const user = await User.findOne({ 'wallet.breadWalletId': walletId });

    if (!user) {
      console.error(`User not found for wallet: ${walletId}`);
      return;
    }

    // Create transaction record for the deposit
    const transaction = await Transaction.create({
      user: user._id,
      type: 'onramp',
      amount: parseFloat(amount),
      currency: currency || 'USDC',
      fiatCurrency: 'NGN',
      paymentMethod: 'virtual_account',
      status: 'completed',
      breadTransactionId: transactionId,
      breadWalletId: walletId,
      description: 'Virtual account deposit',
      completedAt: creditedAt ? new Date(creditedAt) : new Date(),
      paymentDetails: {
        reference,
        accountNumber: user.wallet.virtualAccount?.accountNumber,
        accountName: user.wallet.virtualAccount?.accountName,
        bankName: user.wallet.virtualAccount?.bankName
      }
    });

    // Credit user wallet
    user.wallet.balance += parseFloat(amount);
    user.wallet.lastUpdated = new Date();
    await user.save({ validateBeforeSave: false });

    // Send notification
    await notificationService.createNotification({
      user: user._id,
      type: 'payment_received',
      title: 'Deposit Successful',
      message: `Your wallet has been credited with ${parseFloat(amount).toFixed(2)} ${currency}`,
      relatedId: transaction._id,
      relatedModel: 'Transaction'
    });

    // Send email
    try {
      await emailService.sendDepositConfirmation(user, {
        amountUSDC: parseFloat(amount),
        currency,
        transactionId: transaction.transactionId
      });
    } catch (emailError) {
      console.error('Failed to send deposit confirmation email:', emailError);
    }

    console.log(`Wallet credited: ${walletId}, amount: ${amount} ${currency}`);

  } catch (error) {
    console.error('Error processing wallet.credited event:', error);
    throw error;
  }
}

// Helper function: Process offramp completed (withdrawal successful)
async function processOfframpCompleted(data) {
  try {
    const {
      transaction_id: transactionId,
      wallet_id: walletId,
      amount,
      currency,
      output_amount: outputAmount,
      output_currency: outputCurrency,
      completed_at: completedAt
    } = data;

    const transaction = await Transaction.findOne({ breadTransactionId: transactionId });

    if (!transaction) {
      console.error(`Offramp transaction not found: ${transactionId}`);
      return;
    }

    if (transaction.status === 'completed') {
      console.warn(`Offramp transaction already completed: ${transactionId}`);
      return;
    }

    transaction.status = 'completed';
    transaction.completedAt = completedAt ? new Date(completedAt) : new Date();
    await transaction.save();

    const user = await User.findById(transaction.user);
    if (user) {
      // Remove from pending balance
      user.wallet.pendingBalance -= parseFloat(amount);
      user.wallet.lastUpdated = new Date();
      await user.save({ validateBeforeSave: false });

      await notificationService.createNotification({
        user: user._id,
        type: 'withdrawal_completed',
        title: 'Withdrawal Successful',
        message: `Your withdrawal of ${parseFloat(amount).toFixed(2)} ${currency} (₦${parseFloat(outputAmount).toLocaleString()}) has been sent to your bank account`,
        relatedId: transaction._id,
        relatedModel: 'Transaction'
      });

      try {
        await emailService.sendWithdrawalCompleted(user, {
          amountUSDC: parseFloat(amount),
          amountNGN: parseFloat(outputAmount),
          currency,
          transactionId: transaction.transactionId,
          accountDetails: transaction.paymentDetails
        });
      } catch (emailError) {
        console.error('Failed to send withdrawal confirmation email:', emailError);
      }
    }

    console.log(`Offramp completed: ${transactionId}, sent ₦${outputAmount} to bank`);

  } catch (error) {
    console.error('Error processing offramp.completed event:', error);
    throw error;
  }
}

// Helper function: Process offramp failed (withdrawal failed)
async function processOfframpFailed(data) {
  try {
    const {
      transaction_id: transactionId,
      wallet_id: walletId,
      failed_reason: failedReason,
      failed_at: failedAt
    } = data;

    const transaction = await Transaction.findOne({ breadTransactionId: transactionId });

    if (!transaction) {
      console.error(`Offramp transaction not found: ${transactionId}`);
      return;
    }

    transaction.status = 'failed';
    transaction.failedAt = failedAt ? new Date(failedAt) : new Date();
    transaction.errorMessage = failedReason;
    await transaction.save();

    const user = await User.findById(transaction.user);
    if (user) {
      // Refund: move from pending back to available balance
      user.wallet.balance += transaction.amount;
      user.wallet.pendingBalance -= transaction.amount;
      user.wallet.lastUpdated = new Date();
      await user.save({ validateBeforeSave: false });

      await notificationService.createNotification({
        user: user._id,
        type: 'withdrawal_failed',
        title: 'Withdrawal Failed',
        message: `Your withdrawal of ${transaction.amount} ${transaction.currency} failed and has been refunded. Reason: ${failedReason}`,
        relatedId: transaction._id,
        relatedModel: 'Transaction'
      });
    }

    console.log(`Offramp failed: ${transactionId}, refunded ${transaction.amount} ${transaction.currency}, reason: ${failedReason}`);

  } catch (error) {
    console.error('Error processing offramp.failed event:', error);
    throw error;
  }
}
