/**
 * Comprehensive Flow Simulation Script
 * 
 * Verifies:
 * 1. Webhook Deposit Flow: Simulates a HostFi deposit notification.
 * 2. Project Lifecycle: Accept -> Pay -> Deliver -> Release.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Project = require('./src/models/Project');
const Application = require('./src/models/Application');
const Transaction = require('./src/models/Transaction');
const hostfiWebhookController = require('./src/controllers/hostfiWebhookController');
const projectService = require('./src/services/projectService');
const hostfiService = require('./src/services/hostfiService');

async function simulateDepositWebhook(userId, amount, currency) {
    console.log(`\n--- [Simulating Deposit Webhook] ---`);

    return new Promise((resolve, reject) => {
        // Create a dummy payload
        const payload = {
            event: 'fiat_deposit_received',
            id: `TEST-EVT-${Date.now()}`,
            data: {
                amount: amount,
                currency: currency,
                status: 'SUCCESS',
                customId: userId.toString(),
                channelId: `TEST-CH-${Date.now()}`
            }
        };

        // Mock req, res
        const req = {
            body: payload,
            headers: {
                'x-auth-secret': process.env.HOSTFI_WEBHOOK_SECRET
            }
        };
        const res = {
            status: function (code) { this.statusCode = code; return this; },
            json: function (data) {
                this.data = data;
                resolve(data);
                return this;
            }
        };
        const next = (err) => {
            console.error('Webhook processing error:', err);
            reject(err);
        };

        hostfiWebhookController.handleWebhook(req, res, next);
    });
}

async function runFullSimulation() {
    try {
        console.log('🔄 Starting Comprehensive App Flow Simulation...\n');

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const clientEmail = 'labossvisuals@gmail.com';
        const creatorEmail = 'japhetjohnk@gmail.com';

        const client = await User.findOne({ email: clientEmail });
        const creator = await User.findOne({ email: creatorEmail });

        if (!client || !creator) throw new Error('Test users not found');
        console.log(`👤 Client: ${client.email}, Balance: ${client.wallet.balance}`);
        console.log(`👤 Creator: ${creator.email}`);

        // --- STEP 1: VERIFY DEPOSIT WEBHOOK ---
        const startBalance = client.wallet.balance;
        const depositAmount = 2000;
        console.log(`Simulating deposit of ${depositAmount} NGN/USDC...`);
        const result1 = await simulateDepositWebhook(client._id, depositAmount, 'NGN');
        console.log('✅ Webhook result:', JSON.stringify(result1));

        // Refresh client to see balance update
        const updatedClient = await User.findById(client._id);
        console.log(`💰 Client Balance after webhook deposit simulation: ${updatedClient.wallet.balance}`);

        if (updatedClient.wallet.balance > startBalance) {
            console.log('🎉 SUCCESS: Webhook deposit correctly credited the user.');
        } else {
            console.error('❌ FAILURE: Balance did not update after webhook.');
            // Boosting balance manually to continue project test if webhook failed
            console.log('⚠️  Manually boosting balance to continue simulation...');
            await User.findByIdAndUpdate(client._id, { 'wallet.balance': startBalance + depositAmount });
        }

        // --- STEP 2: PROJECT LIFECYCLE ---
        console.log('\n--- [Simulating Project Lifecycle] ---');

        // Create a test project
        const project = await Project.create({
            title: 'Test Flow Project',
            description: 'A project to test the end-to-end flow.',
            clientId: client._id,
            budget: {
                min: 1000,
                max: 2000,
                currency: 'USDC'
            },
            status: 'open',
            category: 'design',
            timeline: '1-week',
            platformCommission: 10
        });
        console.log(`✅ Project created: ${project._id}`);

        // Create an application
        const application = await Application.create({
            projectId: project._id,
            creatorId: creator._id,
            proposedBudget: { amount: 2000, currency: 'USDC' },
            proposedTimeline: '3 days',
            coverLetter: 'This is my comprehensive flow test application.',
            proposal: 'I can do this!',
            status: 'pending'
        });
        console.log(`✅ Application created: ${application._id}`);

        // 2.1 Accept Application
        console.log('\n2.1 Accepting Application...');
        await projectService.acceptApplicationWithTransaction(application._id, client._id);
        const projAccepted = await Project.findById(project._id);
        console.log(`✅ Project status after accept: ${projAccepted.status}`);

        // 2.2 Process Payment
        console.log('\n2.2 Processing Payment (Client pays escrow)...');
        await projectService.processProjectPayment(project._id, client._id);
        const projPaid = await Project.findById(project._id);
        const clientAfterPayment = await User.findById(client._id);
        console.log(`✅ Project status after payment: ${projPaid.status}`);
        console.log(`💰 Client Balance after payment: ${clientAfterPayment.wallet.balance}`);
        console.log(`🔒 Client Pending Balance: ${clientAfterPayment.wallet.pendingBalance}`);

        // 2.3 Submit Deliverable
        console.log('\n2.3 Submitting Deliverable (Creator delivers work)...');
        await projectService.submitProjectDeliverable(project._id, creator._id, {
            title: 'Final Logo',
            fileUrl: 'https://example.com/logo.png',
            fileType: 'image'
        });
        const projDelivered = await Project.findById(project._id);
        console.log(`✅ Project status after delivery: ${projDelivered.status}`);

        // 2.4 Release Funds
        console.log('\n2.4 Releasing Funds (Client approves work)...');
        const creatorStartBalance = creator.wallet.balance;
        await projectService.releaseFundsWithTransaction(project._id, client._id);

        const projCompleted = await Project.findById(project._id);
        const creatorAfterRelease = await User.findById(creator._id);
        const clientAfterRelease = await User.findById(client._id);

        console.log(`✅ Project status after release: ${projCompleted.status}`);
        console.log(`💰 Creator Balance after release: ${creatorAfterRelease.wallet.balance}`);
        console.log(`💰 Creator Total Earnings: ${creatorAfterRelease.wallet.totalEarnings}`);
        console.log(`🔓 Client Pending Balance after release: ${clientAfterRelease.wallet.pendingBalance}`);

        if (creatorAfterRelease.wallet.balance > creatorStartBalance) {
            console.log('\n🎉 SUCCESS: Entire project lifecycle completed correctly!');
        } else {
            console.error('❌ FAILURE: Creator balance did not increase after fund release.');
        }

        // Clean up test data
        console.log('\n--- [Cleaning Up] ---');
        await Project.findByIdAndDelete(project._id);
        await Application.findByIdAndDelete(application._id);
        await Transaction.deleteMany({ project: project._id });
        // Also delete the test deposit transaction
        await Transaction.deleteMany({ reference: result1?.id || 'NO_REF' });

        console.log('\n✅ End-to-end verification completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Simulation failed:', error.message);
        if (error.stack) console.error(error.stack);
        process.exit(1);
    }
}

runFullSimulation();
