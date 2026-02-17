const Booking = require('../models/Booking');
const Project = require('../models/Project');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

class EscrowMonitoringService {
    constructor() {
        this.isRunning = false;
        this.interval = null;
        this.REFUND_THRESHOLD_DAYS = 2;
    }

    /**
     * Start monitoring for stagnant escrowed funds
     */
    start() {
        if (this.isRunning) {
            console.log('[Escrow Monitoring] Already running');
            return;
        }

        console.log('🚀 [Escrow Monitoring] Starting auto-refund detection...');
        console.log(`   Checking for unsubmitted deliverables after ${this.REFUND_THRESHOLD_DAYS} days\n`);

        this.isRunning = true;

        // Check every hour
        this.interval = setInterval(() => {
            this.checkAllStagnantEscrows();
        }, 3600000); // 1 hour

        // Run first check after a short delay
        setTimeout(() => this.checkAllStagnantEscrows(), 5000);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isRunning = false;
        console.log('⏹️  [Escrow Monitoring] Stopped');
    }

    async checkAllStagnantEscrows() {
        try {
            await this.checkStagnantBookings();
            await this.checkStagnantProjects();
        } catch (error) {
            console.error('[Escrow Monitoring] Error in master check:', error.message);
        }
    }

    async checkStagnantBookings() {
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - this.REFUND_THRESHOLD_DAYS);

        const stagnantBookings = await Booking.find({
            status: { $in: ['confirmed', 'in_progress'] },
            paymentStatus: 'paid',
            paidAt: { $lt: thresholdDate },
            'deliverables.0': { $exists: false } // No deliverables submitted
        });

        for (const booking of stagnantBookings) {
            await this.refundBooking(booking);
        }
    }

    async checkStagnantProjects() {
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - this.REFUND_THRESHOLD_DAYS);

        const stagnantProjects = await Project.find({
            status: 'in_progress',
            paymentStatus: 'paid',
            paidAt: { $lt: thresholdDate },
            lastSubmissionDate: { $exists: false } // No submissions
        });

        for (const project of stagnantProjects) {
            await this.refundProject(project);
        }
    }

    async refundBooking(booking) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            console.log(`[Escrow Monitoring] Auto-refunding Booking: ${booking.bookingId}`);

            const client = await User.findById(booking.client).session(session);
            if (client) {
                // Refund full amount to client
                client.wallet.balance += booking.amount;
                client.wallet.pendingBalance -= booking.amount;
                await client.save({ session, validateBeforeSave: false });

                // Record refund transaction
                await Transaction.create([{
                    user: client._id,
                    type: 'refund',
                    amount: booking.amount,
                    currency: booking.currency,
                    status: 'completed',
                    booking: booking._id,
                    description: `Auto-refund for booking ${booking.bookingId} - Deliverables not submitted within ${this.REFUND_THRESHOLD_DAYS} days`,
                    completedAt: new Date()
                }], { session });
            }

            booking.status = 'cancelled';
            booking.paymentStatus = 'refunded';
            booking.cancellationReason = `Auto-refunded: Creator failed to submit deliverables within ${this.REFUND_THRESHOLD_DAYS} days.`;
            await booking.save({ session });

            await session.commitTransaction();
            console.log(`   ✅ Refunded ${booking.amount} ${booking.currency} to ${client.email}`);
        } catch (error) {
            await session.abortTransaction();
            console.error(`[Escrow Monitoring] Failed to refund booking ${booking._id}:`, error.message);
        } finally {
            session.endSession();
        }
    }

    async refundProject(project) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            console.log(`[Escrow Monitoring] Auto-refunding Project: ${project.title}`);

            // Find the accepted application to get the amount
            const Application = mongoose.model('Application');
            const application = await Application.findOne({
                projectId: project._id,
                status: 'accepted'
            }).session(session);

            if (!application) {
                console.error(`[Escrow Monitoring] Accepted application not found for project ${project._id}`);
                await session.abortTransaction();
                return;
            }

            const amount = application.proposedBudget.amount;
            const client = await User.findById(project.clientId).session(session);

            if (client) {
                client.wallet.balance += amount;
                client.wallet.pendingBalance -= amount;
                await client.save({ session, validateBeforeSave: false });

                await Transaction.create([{
                    user: client._id,
                    type: 'refund',
                    amount: amount,
                    currency: application.proposedBudget.currency || 'USDC',
                    status: 'completed',
                    project: project._id,
                    description: `Auto-refund for project "${project.title}" - No submission within ${this.REFUND_THRESHOLD_DAYS} days`,
                    completedAt: new Date()
                }], { session });
            }

            project.status = 'cancelled';
            project.paymentStatus = 'refunded';
            await project.save({ session });

            await session.commitTransaction();
            console.log(`   ✅ Refunded ${amount} USDC to ${client.email}`);
        } catch (error) {
            await session.abortTransaction();
            console.error(`[Escrow Monitoring] Failed to refund project ${project._id}:`, error.message);
        } finally {
            session.endSession();
        }
    }
}

const escrowMonitoringService = new EscrowMonitoringService();
module.exports = escrowMonitoringService;
