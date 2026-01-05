const mongoose = require('mongoose');
const Project = require('../models/Project');
const Application = require('../models/Application');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const { ErrorHandler } = require('../utils/errorHandler');
const { PLATFORM_CONFIG } = require('../utils/constants');
const { getPlatformFeeDestination } = require('../utils/platformWallet');

class ProjectService {
  /**
   * Accept project application with payment/escrow transaction
   * Deducts the proposed budget from client's wallet and holds it in escrow
   */
  async acceptApplicationWithTransaction(applicationId, clientId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find application and populate necessary fields
      const application = await Application.findById(applicationId)
        .populate('projectId')
        .populate('creatorId', 'firstName lastName email name')
        .session(session);

      if (!application) {
        throw new ErrorHandler('Application not found', 404);
      }

      const project = application.projectId;

      // Verify client owns the project
      if (project.clientId.toString() !== clientId.toString()) {
        throw new ErrorHandler('Unauthorized to accept this application', 403);
      }

      // Verify application is still pending
      if (application.status !== 'pending') {
        throw new ErrorHandler('Application has already been processed', 400);
      }

      // Get client
      const client = await User.findById(clientId).session(session);
      if (!client) {
        throw new ErrorHandler('Client not found', 404);
      }

      const projectAmount = application.proposedBudget.amount;

      // Check if client has sufficient balance
      if (client.wallet.balance < projectAmount) {
        await session.abortTransaction();

        // Create insufficient balance notification
        await Notification.createNotification({
          recipient: clientId,
          sender: application.creatorId._id,
          type: 'insufficient_balance',
          title: 'Insufficient Balance',
          message: `Cannot accept application. Required: ${projectAmount} USDC, Available: ${client.wallet.balance} USDC. Please fund your wallet.`,
          link: `/wallet`,
          project: project._id
        });

        throw new ErrorHandler(
          `Insufficient balance. Required: ${projectAmount} USDC, Available: ${client.wallet.balance} USDC`,
          400
        );
      }

      // Deduct from client's balance and move to pending balance (escrow)
      const clientUpdate = await User.findOneAndUpdate(
        {
          _id: client._id,
          'wallet.balance': { $gte: projectAmount },
          __v: client.__v
        },
        {
          $inc: {
            'wallet.balance': -projectAmount,
            'wallet.pendingBalance': projectAmount,
            __v: 1
          },
          $set: {
            'wallet.lastUpdated': new Date()
          }
        },
        {
          session,
          new: true
        }
      );

      if (!clientUpdate) {
        await session.abortTransaction();
        throw new ErrorHandler('Concurrent modification detected or insufficient balance', 409);
      }

      // Create payment transaction
      await Transaction.create(
        [
          {
            user: client._id,
            type: 'payment',
            amount: projectAmount,
            currency: application.proposedBudget.currency || 'USDC',
            status: 'completed',
            project: project._id,
            description: `Payment for project "${project.title}"`,
            completedAt: new Date()
          }
        ],
        { session }
      );

      // Update application status
      application.status = 'accepted';
      application.acceptedAt = new Date();
      await application.save({ session });

      // Update project status and select creator
      project.selectedCreatorId = application.creatorId._id;
      project.status = 'in_progress';
      await project.save({ session });

      // Commit the transaction
      await session.commitTransaction();

      // Create payment deducted notification
      await Notification.createNotification({
        recipient: client._id,
        sender: application.creatorId._id,
        type: 'payment_deducted',
        title: 'Payment Held in Escrow',
        message: `${projectAmount} USDC has been deducted from your wallet and held in escrow for project "${project.title}"`,
        link: `/wallet`,
        project: project._id,
        metadata: {
          amount: projectAmount,
          currency: application.proposedBudget.currency || 'USDC',
          projectId: project._id,
          projectTitle: project.title
        }
      });

      return {
        application,
        project,
        client: clientUpdate
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Release funds to creator when project is completed
   * Similar to booking fund release
   */
  async releaseFundsWithTransaction(projectId, clientId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const project = await Project.findOne({
        _id: projectId,
        clientId: clientId
      })
        .populate('selectedCreatorId', 'wallet.address name email firstName lastName')
        .populate('clientId', 'name firstName lastName')
        .session(session);

      if (!project) {
        throw new ErrorHandler('Project not found', 404);
      }

      if (project.status !== 'completed') {
        throw new ErrorHandler('Project must be completed before releasing funds', 400);
      }

      // Get the accepted application to find the amount
      const application = await Application.findOne({
        projectId: project._id,
        status: 'accepted'
      }).session(session);

      if (!application) {
        throw new ErrorHandler('Accepted application not found', 404);
      }

      const projectAmount = application.proposedBudget.amount;

      // Calculate platform fee
      const platformCommission = PLATFORM_CONFIG.COMMISSION_RATE;
      const platformFee = (projectAmount * platformCommission) / 100;
      const creatorAmount = projectAmount - platformFee;

      const creator = await User.findById(project.selectedCreatorId._id).session(session);

      // Add funds to creator's wallet
      const creatorUpdate = await User.findOneAndUpdate(
        {
          _id: creator._id,
          __v: creator.__v
        },
        {
          $inc: {
            'wallet.balance': creatorAmount,
            'wallet.totalEarnings': creatorAmount,
            __v: 1
          },
          $set: {
            'wallet.lastUpdated': new Date()
          }
        },
        {
          session,
          new: true
        }
      );

      if (!creatorUpdate) {
        throw new ErrorHandler('Concurrent modification detected', 409);
      }

      // Remove from client's pending balance
      await User.findByIdAndUpdate(
        clientId,
        {
          $inc: {
            'wallet.pendingBalance': -projectAmount
          }
        },
        { session }
      );

      // Get platform fee destination (temp wallet)
      const platformWalletInfo = getPlatformFeeDestination(project._id.toString());

      // Create transactions
      await Transaction.create(
        [
          {
            user: creator._id,
            type: 'earning',
            amount: creatorAmount,
            currency: application.proposedBudget.currency || 'USDC',
            status: 'completed',
            project: project._id,
            toAddress: creator.wallet.address,
            description: `Payment received for project "${project.title}"`,
            completedAt: new Date()
          },
          {
            user: creator._id,
            type: 'platform_fee',
            amount: platformFee,
            currency: application.proposedBudget.currency || 'USDC',
            status: 'completed',
            project: project._id,
            toAddress: platformWalletInfo.address,
            description: `Platform fee for project "${project.title}"`,
            metadata: {
              isTempWallet: platformWalletInfo.isTemp,
              mainPlatformWallet: platformWalletInfo.mainWallet,
              tempWallet: platformWalletInfo.isTemp ? platformWalletInfo.address : null
            },
            completedAt: new Date()
          }
        ],
        { session }
      );

      await session.commitTransaction();

      return {
        project,
        creator: creatorUpdate,
        amount: creatorAmount,
        platformFee
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

module.exports = new ProjectService();
