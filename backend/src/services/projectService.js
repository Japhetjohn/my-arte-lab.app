const mongoose = require('mongoose');
const Project = require('../models/Project');
const Application = require('../models/Application');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const { ErrorHandler } = require('../utils/errorHandler');
const { PLATFORM_CONFIG } = require('../utils/constants');
const notificationService = require('./notificationService');
const hostfiService = require('./hostfiService');

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

      // Handle both populated and unpopulated clientId
      const projectClientId = project.clientId._id ? project.clientId._id.toString() : project.clientId.toString();
      if (projectClientId !== clientId.toString()) {
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

      // Calculate balance inline (avoid syncWalletBalances write conflict)
      const userTransactions = await Transaction.find({
        user: clientId,
        status: 'completed'
      }).session(session);
      
      let calculatedBalance = 0;
      for (const tx of userTransactions) {
        const amt = parseFloat(tx.amount) || 0;
        const curr = (tx.currency || 'USDC').toUpperCase();
        if (curr !== 'USDC') continue;
        switch (tx.type) {
          case 'deposit': case 'earning': case 'refund':
            calculatedBalance += amt; break;
          case 'withdrawal': case 'payment': case 'escrow':
            calculatedBalance -= amt; break;
        }
      }
      
      // Subtract active escrow (projects in progress with paid status)
      const Project = require('../models/Project');
      const activeEscrow = await Project.find({
        clientId: clientId,
        status: { $in: ['in_progress', 'delivered'] },
        paymentStatus: 'paid'
      }).session(session);
      const escrowTotal = activeEscrow.reduce((sum, p) => sum + (parseFloat(p.acceptedAmount) || 0), 0);
      calculatedBalance -= escrowTotal;
      calculatedBalance = Math.max(0, parseFloat(calculatedBalance.toFixed(6)));
      
      console.log(`[ProjectPayment] Calculated balance for ${clientId}: ${calculatedBalance} USDC (escrow: ${escrowTotal})`);

      if (calculatedBalance < projectAmount) {
        throw new ErrorHandler(
          `Insufficient balance. Required: ${projectAmount} USDC, Available: ${calculatedBalance} USDC`,
          400
        );
      }

      // Atomic update - no __v check (syncWalletBalances modifies outside tx)
      const clientUpdate = await User.findOneAndUpdate(
        {
          _id: client._id,
          'wallet.balance': { $gte: projectAmount }
        },
        {
          $inc: {
            'wallet.balance': -projectAmount,
            'wallet.pendingBalance': projectAmount
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
        throw new ErrorHandler('Insufficient balance for this project', 400);
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

      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 10).toUpperCase();

      // Create earning transaction for creator
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
          }
        ],
        { session }
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

      // ═══════════════════════════════════════════════════════════════
      // PAYOUT PHASE: Creator payout via HostFi B2B
      // 
      // HostFi B2B automatically handles the split:
      // - Creator receives their share directly
      // - Platform fee goes to platform wallet automatically
      // ═══════════════════════════════════════════════════════════════
      
      const client = await User.findById(clientId);
      const clientUsdcAsset = client.wallet.hostfiWalletAssets?.find(
        a => a.currency === (application.proposedBudget.currency || 'USDC') || a.currency === 'USDC'
      );
      
      let creatorWalletAddress = project.selectedCreatorId?.wallet?.address;
      
      // If creator doesn't have a wallet, create one
      if (!creatorWalletAddress) {
        console.log(`[ProjectService] Creator ${project.selectedCreatorId._id} has no wallet, creating one...`);
        try {
          const tsaraService = require('./tsaraService');
          const walletResult = await tsaraService.createWallet(
            `${project.selectedCreatorId.firstName || 'Creator'} ${project.selectedCreatorId.lastName || ''}`.trim(),
            `creator_${project.selectedCreatorId._id}_${Date.now()}`,
            { userId: project.selectedCreatorId._id, purpose: 'auto-created-for-payout' }
          );
          
          if (walletResult.success) {
            const creator = await User.findById(project.selectedCreatorId._id);
            creator.wallet.address = walletResult.data.primary_address;
            creator.wallet.network = 'Solana';
            creator.wallet.tsaraAddress = walletResult.data.primary_address;
            creator.wallet.tsaraWalletId = walletResult.data.id;
            creator.wallet.tsaraEncryptedPrivateKey = walletResult.data.secretKey;
            await creator.save();
            
            creatorWalletAddress = walletResult.data.primary_address;
            console.log(`[ProjectService] ✓ Created wallet for creator: ${creatorWalletAddress}`);
          }
        } catch (walletError) {
          console.error('[ProjectService] ✗ Failed to create wallet for creator:', walletError.message);
        }
      }
      
      if (creatorWalletAddress && clientUsdcAsset?.assetId) {
        try {
          console.log(`[ProjectService] Creator payout: ${creatorAmount} ${application.proposedBudget.currency || 'USDC'} to ${creatorWalletAddress}`);
          
          const creatorPayout = await hostfiService.initiateWithdrawal({
            walletAssetId: clientUsdcAsset.assetId,
            amount: creatorAmount,
            currency: application.proposedBudget.currency || 'USDC',
            methodId: 'CRYPTO',
            recipient: {
              type: 'CRYPTO',
              method: 'CRYPTO',
              currency: application.proposedBudget.currency || 'USDC',
              address: creatorWalletAddress,
              network: 'SOL',
              country: 'NG'
            },
            clientReference: `CREATOR-PAYOUT-PRJ-${project._id}-${Date.now()}`,
            memo: `Payment for project "${project.title}"`
          });

          if (creatorPayout.reference || creatorPayout.id) {
            await Transaction.updateOne(
              { project: project._id, type: 'earning' },
              { 
                transactionHash: creatorPayout.reference || creatorPayout.id,
                metadata: {
                  payoutReference: creatorPayout.reference || creatorPayout.id,
                  toAddress: creatorWalletAddress,
                  network: 'SOL'
                }
              }
            );
            console.log(`[ProjectService] ✓ Creator payout initiated: ${creatorPayout.reference || creatorPayout.id}`);
          }
        } catch (payoutError) {
          console.error('[ProjectService] ✗ Creator payout failed:', payoutError.message);
          // Don't throw — log for manual reconciliation
        }
      } else {
        console.error('[ProjectService] Missing creator wallet or client asset for payout');
      }

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
