const { successResponse } = require('../utils/apiResponse');
const { ErrorHandler, catchAsync } = require('../utils/errorHandler');
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


/**
 * Handle Switch onramp webhooks (deposit completion)
 */
exports.handleSwitchOnrampWebhook = catchAsync(async (req, res, next) => {
  try {
    const webhookData = req.body;

    console.log('Switch onramp webhook received:', JSON.stringify(webhookData, null, 2));

    const { reference, status, data } = webhookData;

    if (!reference) {
      console.warn('Switch onramp webhook: Missing reference');
      return successResponse(res, 200, 'Webhook received but missing reference');
    }

    const transaction = await Transaction.findOne({ reference });

    if (!transaction) {
      console.error(`Onramp transaction not found: ${reference}`);
      return successResponse(res, 200, 'Transaction not found');
    }

    if (transaction.status === 'completed') {
      console.warn(`Onramp transaction already completed: ${reference}`);
      return successResponse(res, 200, 'Transaction already processed');
    }

    if (status === 'completed' || status === 'success') {
      await processOnrampCompleted(transaction, data);
    } else if (status === 'failed' || status === 'error') {
      await processOnrampFailed(transaction, data);
    } else {
      console.log(`Onramp status update: ${reference} -> ${status}`);
      transaction.status = status === 'pending' ? 'pending' : 'processing';
      await transaction.save();
    }

    successResponse(res, 200, 'Webhook processed successfully', { reference, status });

  } catch (error) {
    console.error('Switch onramp webhook processing error:', error);
    successResponse(res, 200, 'Webhook received but processing failed');
  }
});

/**
 * Handle Switch offramp webhooks (withdrawal completion)
 */
exports.handleSwitchOfframpWebhook = catchAsync(async (req, res, next) => {
  try {
    const webhookData = req.body;

    console.log('Switch offramp webhook received:', JSON.stringify(webhookData, null, 2));

    const { reference, status, data } = webhookData;

    if (!reference) {
      console.warn('Switch offramp webhook: Missing reference');
      return successResponse(res, 200, 'Webhook received but missing reference');
    }

    const transaction = await Transaction.findOne({ reference });

    if (!transaction) {
      console.error(`Offramp transaction not found: ${reference}`);
      return successResponse(res, 200, 'Transaction not found');
    }

    if (transaction.status === 'completed') {
      console.warn(`Offramp transaction already completed: ${reference}`);
      return successResponse(res, 200, 'Transaction already processed');
    }

    if (status === 'completed' || status === 'success') {
      await processSwitchOfframpCompleted(transaction, data);
    } else if (status === 'failed' || status === 'error') {
      await processSwitchOfframpFailed(transaction, data);
    } else {
      console.log(`Offramp status update: ${reference} -> ${status}`);
      transaction.status = status === 'pending' ? 'pending' : 'processing';
      await transaction.save();
    }

    successResponse(res, 200, 'Webhook processed successfully', { reference, status });

  } catch (error) {
    console.error('Switch offramp webhook processing error:', error);
    successResponse(res, 200, 'Webhook received but processing failed');
  }
});


/**
 * Process completed onramp (deposit successful - credit user wallet)
 */
async function processOnrampCompleted(transaction, webhookData) {
  try {
    const cryptoAmount = webhookData?.destination?.amount || transaction.amount;
    const asset = webhookData?.destination?.asset || 'USDC';

    transaction.status = 'completed';
    transaction.completedAt = new Date();
    transaction.metadata = {
      ...transaction.metadata,
      webhookData,
      completedAmount: cryptoAmount
    };
    await transaction.save();

    const user = await User.findById(transaction.user);
    if (user) {
      const amountToCredit = parseFloat(cryptoAmount);

      const updatedUser = await User.findOneAndUpdate(
        { _id: user._id, __v: user.__v },
        {
          $inc: {
            'wallet.balance': amountToCredit,
            __v: 1
          },
          $set: {
            'wallet.lastUpdated': new Date()
          }
        },
        { new: true }
      );

      if (!updatedUser) {
        throw new ErrorHandler('Concurrent modification detected during wallet credit', 409);
      }

      await notificationService.createNotification({
        user: user._id,
        type: 'deposit_completed',
        title: 'Deposit Successful',
        message: `Your deposit of ${amountToCredit.toFixed(2)} ${asset} has been credited to your wallet`,
        relatedId: transaction._id,
        relatedModel: 'Transaction'
      });

      console.log(`Onramp completed: ${transaction.reference}, credited ${cryptoAmount} ${asset} to user ${user.email}`);
    }

  } catch (error) {
    console.error('Error processing onramp completion:', error);
    throw error;
  }
}

/**
 * Process failed onramp (deposit failed - notify user)
 */
async function processOnrampFailed(transaction, webhookData) {
  try {
    const failReason = webhookData?.error?.message || 'Deposit processing failed';

    transaction.status = 'failed';
    transaction.failedAt = new Date();
    transaction.errorMessage = failReason;
    transaction.metadata = {
      ...transaction.metadata,
      webhookData
    };
    await transaction.save();

    const user = await User.findById(transaction.user);
    if (user) {
      await notificationService.createNotification({
        user: user._id,
        type: 'deposit_failed',
        title: 'Deposit Failed',
        message: `Your deposit failed. Reason: ${failReason}. Please contact support if funds were deducted.`,
        relatedId: transaction._id,
        relatedModel: 'Transaction'
      });

      console.log(`Onramp failed: ${transaction.reference}, reason: ${failReason}`);
    }

  } catch (error) {
    console.error('Error processing onramp failure:', error);
    throw error;
  }
}

/**
 * Process completed offramp (withdrawal successful - remove from pending)
 */
async function processSwitchOfframpCompleted(transaction, webhookData) {
  try {
    const fiatAmount = webhookData?.destination?.amount || transaction.metadata?.fiatAmount;
    const currency = webhookData?.destination?.currency || transaction.metadata?.fiatCurrency;

    transaction.status = 'completed';
    transaction.completedAt = new Date();
    transaction.metadata = {
      ...transaction.metadata,
      webhookData,
      completedAmount: fiatAmount
    };
    await transaction.save();

    const user = await User.findById(transaction.user);
    if (user) {
      const updatedUser = await User.findOneAndUpdate(
        { _id: user._id, __v: user.__v },
        {
          $inc: {
            'wallet.pendingBalance': -transaction.amount,
            __v: 1
          },
          $set: {
            'wallet.lastUpdated': new Date()
          }
        },
        { new: true }
      );

      if (!updatedUser) {
        throw new ErrorHandler('Concurrent modification detected during offramp completion', 409);
      }

      await notificationService.createNotification({
        user: user._id,
        type: 'withdrawal_completed',
        title: 'Withdrawal Successful',
        message: `Your withdrawal of ${transaction.amount} USDC (${fiatAmount} ${currency}) has been sent successfully`,
        relatedId: transaction._id,
        relatedModel: 'Transaction'
      });

      console.log(`Offramp completed: ${transaction.reference}, sent ${fiatAmount} ${currency} to user ${user.email}`);
    }

  } catch (error) {
    console.error('Error processing offramp completion:', error);
    throw error;
  }
}

/**
 * Process failed offramp (withdrawal failed - refund user)
 */
async function processSwitchOfframpFailed(transaction, webhookData) {
  try {
    const failReason = webhookData?.error?.message || 'Withdrawal processing failed';

    transaction.status = 'failed';
    transaction.failedAt = new Date();
    transaction.errorMessage = failReason;
    transaction.metadata = {
      ...transaction.metadata,
      webhookData
    };
    await transaction.save();

    const user = await User.findById(transaction.user);
    if (user) {
      const updatedUser = await User.findOneAndUpdate(
        { _id: user._id, __v: user.__v },
        {
          $inc: {
            'wallet.balance': transaction.amount,
            'wallet.pendingBalance': -transaction.amount,
            __v: 1
          },
          $set: {
            'wallet.lastUpdated': new Date()
          }
        },
        { new: true }
      );

      if (!updatedUser) {
        throw new ErrorHandler('Concurrent modification detected during offramp refund', 409);
      }

      await notificationService.createNotification({
        user: user._id,
        type: 'withdrawal_failed',
        title: 'Withdrawal Failed',
        message: `Your withdrawal of ${transaction.amount} USDC failed and has been refunded. Reason: ${failReason}`,
        relatedId: transaction._id,
        relatedModel: 'Transaction'
      });

      console.log(`Offramp failed: ${transaction.reference}, refunded ${transaction.amount} USDC, reason: ${failReason}`);
    }

  } catch (error) {
    console.error('Error processing offramp failure:', error);
    throw error;
  }
}
