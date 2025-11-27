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
    const eventResult = await breadService.handleWebhookEvent(req.body);

    if (!eventResult.processed) {
      console.warn('bread.africa webhook: Event not processed', eventResult.reason);
      return successResponse(res, 200, 'Webhook received but not processed', eventResult);
    }

    switch (eventResult.event) {
      case breadConfig.events.ONRAMP_SUCCESS:
        await processOnrampSuccess(eventResult);
        break;

      case breadConfig.events.ONRAMP_FAILED:
        await processOnrampFailed(eventResult);
        break;

      case breadConfig.events.OFFRAMP_SUCCESS:
        await processOfframpSuccess(eventResult);
        break;

      case breadConfig.events.OFFRAMP_FAILED:
        await processOfframpFailed(eventResult);
        break;

      default:
        console.warn('bread.africa webhook: Unknown event type', eventResult.event);
    }

    successResponse(res, 200, 'Webhook processed successfully', eventResult);

  } catch (error) {
    console.error('bread.africa webhook processing error:', error);
    successResponse(res, 200, 'Webhook received but processing failed');
  }
});

// Helper function: Process successful onramp (deposit)
async function processOnrampSuccess(eventResult) {
  try {
    const { paymentId, userId, amountUSDC, amountNGN, exchangeRate, completedAt } = eventResult;

    const transaction = await Transaction.findOne({ breadPaymentId: paymentId });

    if (!transaction) {
      console.error(`Onramp transaction not found: ${paymentId}`);
      return;
    }

    if (transaction.status === 'completed') {
      console.warn(`Onramp transaction already completed: ${paymentId}`);
      return;
    }

    transaction.status = 'completed';
    transaction.completedAt = completedAt;
    await transaction.save();

    const user = await User.findById(transaction.user);
    if (user) {
      user.wallet.balance += amountUSDC;
      user.wallet.lastUpdated = new Date();
      await user.save({ validateBeforeSave: false });

      await notificationService.createNotification({
        user: user._id,
        type: 'payment_received',
        title: 'Deposit Successful',
        message: `Your deposit of ₦${amountNGN.toLocaleString()} has been credited as ${amountUSDC.toFixed(2)} USDC`,
        relatedId: transaction._id,
        relatedModel: 'Transaction'
      });

      try {
        await emailService.sendDepositConfirmation(user, {
          amountNGN,
          amountUSDC,
          exchangeRate,
          transactionId: transaction.transactionId
        });
      } catch (emailError) {
        console.error('Failed to send deposit confirmation email:', emailError);
      }
    }

    console.log(`Onramp processed successfully: ${paymentId}, credited ${amountUSDC} USDC`);

  } catch (error) {
    console.error('Error processing onramp success:', error);
    throw error;
  }
}

// Helper function: Process failed onramp (deposit)
async function processOnrampFailed(eventResult) {
  try {
    const { paymentId, failedReason, failedAt } = eventResult;

    const transaction = await Transaction.findOne({ breadPaymentId: paymentId });

    if (!transaction) {
      console.error(`Onramp transaction not found: ${paymentId}`);
      return;
    }

    transaction.status = 'failed';
    transaction.failedAt = failedAt;
    transaction.errorMessage = failedReason;
    await transaction.save();

    const user = await User.findById(transaction.user);
    if (user) {
      await notificationService.createNotification({
        user: user._id,
        type: 'payment_failed',
        title: 'Deposit Failed',
        message: `Your deposit of ₦${transaction.fiatAmount.toLocaleString()} failed. Reason: ${failedReason}`,
        relatedId: transaction._id,
        relatedModel: 'Transaction'
      });
    }

    console.log(`Onramp failed: ${paymentId}, reason: ${failedReason}`);

  } catch (error) {
    console.error('Error processing onramp failure:', error);
    throw error;
  }
}

// Helper function: Process successful offramp (withdrawal)
async function processOfframpSuccess(eventResult) {
  try {
    const { withdrawalId, userId, amountUSDC, amountNGN, exchangeRate, transactionHash, completedAt } = eventResult;

    const transaction = await Transaction.findOne({ breadPaymentId: withdrawalId });

    if (!transaction) {
      console.error(`Offramp transaction not found: ${withdrawalId}`);
      return;
    }

    if (transaction.status === 'completed') {
      console.warn(`Offramp transaction already completed: ${withdrawalId}`);
      return;
    }

    transaction.status = 'completed';
    transaction.completedAt = completedAt;
    transaction.transactionHash = transactionHash;
    await transaction.save();

    const user = await User.findById(transaction.user);
    if (user) {
      user.wallet.pendingBalance -= amountUSDC;
      user.wallet.lastUpdated = new Date();
      await user.save({ validateBeforeSave: false });

      await notificationService.createNotification({
        user: user._id,
        type: 'withdrawal_completed',
        title: 'Withdrawal Successful',
        message: `Your withdrawal of ${amountUSDC} USDC (₦${amountNGN.toLocaleString()}) has been completed`,
        relatedId: transaction._id,
        relatedModel: 'Transaction'
      });

      try {
        await emailService.sendWithdrawalCompleted(user, {
          amountUSDC,
          amountNGN,
          exchangeRate,
          transactionId: transaction.transactionId,
          accountDetails: transaction.paymentDetails
        });
      } catch (emailError) {
        console.error('Failed to send withdrawal confirmation email:', emailError);
      }
    }

    console.log(`Offramp processed successfully: ${withdrawalId}, sent ₦${amountNGN}`);

  } catch (error) {
    console.error('Error processing offramp success:', error);
    throw error;
  }
}

// Helper function: Process failed offramp (withdrawal)
async function processOfframpFailed(eventResult) {
  try {
    const { withdrawalId, failedReason, failedAt } = eventResult;

    const transaction = await Transaction.findOne({ breadPaymentId: withdrawalId });

    if (!transaction) {
      console.error(`Offramp transaction not found: ${withdrawalId}`);
      return;
    }

    transaction.status = 'failed';
    transaction.failedAt = failedAt;
    transaction.errorMessage = failedReason;
    await transaction.save();

    const user = await User.findById(transaction.user);
    if (user) {
      user.wallet.balance += transaction.amount;
      user.wallet.pendingBalance -= transaction.amount;
      user.wallet.lastUpdated = new Date();
      await user.save({ validateBeforeSave: false });

      await notificationService.createNotification({
        user: user._id,
        type: 'withdrawal_failed',
        title: 'Withdrawal Failed',
        message: `Your withdrawal of ${transaction.amount} USDC failed. Amount has been refunded. Reason: ${failedReason}`,
        relatedId: transaction._id,
        relatedModel: 'Transaction'
      });
    }

    console.log(`Offramp failed: ${withdrawalId}, refunded ${transaction.amount} USDC, reason: ${failedReason}`);

  } catch (error) {
    console.error('Error processing offramp failure:', error);
    throw error;
  }
}
