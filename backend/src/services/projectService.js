const mongoose = require('mongoose');
const Project = require('../models/Project');
const Application = require('../models/Application');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const { ErrorHandler } = require('../utils/errorHandler');
const { PLATFORM_CONFIG } = require('../utils/constants');
const { getPlatformFeeDestination } = require('../utils/platformWallet');
const notificationService = require('./notificationService');

class ProjectService {
  /**
   * Accept project application with payment/escrow transaction
   * Deducts the proposed budget from client's wallet and holds it in escrow
   */
  async acceptApplicationWithTransaction(applicationId, clientId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const application = await Application.findById(applicationId)
        .populate('projectId')
        .populate('creatorId', 'firstName lastName email name')
        .session(session);

      if (!application) {
        throw new ErrorHandler('Application not found', 404);
      }

      const project = application.projectId;

      if (project.clientId.toString() !== clientId.toString()) {
        throw new ErrorHandler('Unauthorized to accept this application', 403);
      }

      if (application.status !== 'pending') {
        throw new ErrorHandler('Application has already been processed', 400);
      }

      application.status = 'accepted';
      application.acceptedAt = new Date();
      await application.save({ session });

      project.selectedCreatorId = application.creatorId._id;
      project.status = 'awaiting_payment';
      project.acceptedAmount = application.proposedBudget.amount;
      await project.save({ session });

      // Notify creator that application was accepted
      await notificationService.createNotification({
        recipient: application.creatorId._id,
        type: 'project_application_accepted',
        title: 'Application Accepted',
        message: `Your application for "${project.title}" has been accepted! Please wait for the client to make the escrow payment.`,
        project: project._id,
        link: `/#/bookings`
      });

      await session.commitTransaction();

      return {
        application,
        project
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async processProjectPayment(projectId, clientId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const project = await Project.findOne({
        _id: projectId,
        clientId: clientId,
        status: 'awaiting_payment'
      }).session(session);

      if (!project) {
        throw new ErrorHandler('Project not found or not in awaiting payment status', 404);
      }

      const application = await Application.findOne({
        projectId: project._id,
        status: 'accepted'
      }).session(session);

      if (!application) {
        throw new ErrorHandler('Accepted application not found', 400);
      }

      const client = await User.findById(clientId).session(session);
      const projectAmount = application.proposedBudget.amount;

      if (client.wallet.balance < projectAmount) {
        throw new ErrorHandler(
          `Insufficient balance. Required: ${projectAmount} USDC, Available: ${client.wallet.balance} USDC`,
          400
        );
      }

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
        throw new ErrorHandler('Concurrent modification detected or insufficient balance', 409);
      }

      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 10).toUpperCase();
      const transactionId = `TXN-${timestamp}-${random}`;

      await Transaction.create(
        [
          {
            transactionId,
            user: client._id,
            type: 'payment',
            amount: projectAmount,
            currency: application.proposedBudget.currency || 'USDC',
            status: 'completed',
            project: project._id,
            description: `Escrow payment for project "${project.title}"`,
            completedAt: new Date()
          }
        ],
        { session }
      );

      project.status = 'in_progress';
      project.paymentStatus = 'paid';
      project.paidAt = new Date();

      // Calculate and store fee info on project
      project.platformFee = (projectAmount * project.platformCommission) / 100;
      project.creatorAmount = projectAmount - project.platformFee;

      await project.save({ session });

      // Notify creator that payment was received
      await notificationService.createNotification({
        recipient: project.selectedCreatorId,
        type: 'payment_received',
        title: 'Project Payment Received',
        message: `Client has paid for project "${project.title}". Funds are held in escrow. You can now start working!`,
        project: project._id,
        link: `/#/bookings`
      });

      await session.commitTransaction();

      return {
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

  async submitProjectDeliverable(projectId, creatorId, deliverableData) {
    const project = await Project.findOne({
      _id: projectId,
      selectedCreatorId: creatorId,
      status: 'in_progress'
    });

    if (!project) {
      throw new ErrorHandler('Project not found or not in a state to submit work', 404);
    }

    project.attachments.push({
      ...deliverableData,
      uploadedAt: new Date()
    });

    project.status = 'delivered';
    project.lastSubmissionDate = new Date();
    await project.save();

    // Notify client that work was delivered
    await notificationService.createNotification({
      recipient: project.clientId,
      type: 'work_delivered',
      title: 'Project Deliverables Submitted',
      message: `Creator has submitted deliverables for "${project.title}". Please review and approve to release funds.`,
      project: project._id,
      link: `/#/bookings`
    });

    return project;
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

      if (project.status !== 'delivered' && project.status !== 'completed') {
        throw new ErrorHandler('Project must be delivered before releasing funds', 400);
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

      // Use stored fee info or calculate on the fly
      const platformFee = project.platformFee || (projectAmount * project.platformCommission) / 100;
      const creatorAmount = project.creatorAmount || (projectAmount - platformFee);

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

      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 10).toUpperCase();

      // Create transactions
      await Transaction.create(
        [
          {
            transactionId: `TXN-${timestamp}-${random}-EARN`,
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
            transactionId: `TXN-${timestamp}-${random}-FEE`,
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
        { session, ordered: true }
      );

      // Notify both parties
      await Promise.all([
        notificationService.createNotification({
          recipient: creator._id,
          type: 'project_completed',
          title: 'Project Funds Released',
          message: `Funds have been released for project "${project.title}". The project is now complete!`,
          project: project._id,
          link: `/#/wallet`
        }),
        notificationService.createNotification({
          recipient: clientId,
          type: 'project_completed',
          title: 'Project Completed',
          message: `You have approved the work for project "${project.title}". The project is now completed.`,
          project: project._id,
          link: `/#/bookings`
        })
      ]);

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
