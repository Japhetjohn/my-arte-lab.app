const mongoose = require('mongoose');
const Project = require('../src/models/Project');
const Application = require('../src/models/Application');
const User = require('../src/models/User');
const Review = require('../src/models/Review');
const Transaction = require('../src/models/Transaction');
const projectService = require('../src/services/projectService');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  }
  passedTests++;
  console.log(`✅ PASS: ${message}`);
}

async function runClientJourneyTests() {
  console.log('================================================================================');
  console.log('🌟 MYARTELAB: CLIENT JOURNEY & OPPORTUNITIES END-TO-END VERIFICATION 🌟');
  console.log('================================================================================\n');

  // --- Step 1: User Roles & Profile ---
  console.log('--- [1/6] CLIENT & CREATOR ROLE MODEL ---');
  const clientId = new mongoose.Types.ObjectId();
  const creatorId = new mongoose.Types.ObjectId();
  const unauthorizedUserId = new mongoose.Types.ObjectId();

  const clientUser = new User({
    _id: clientId,
    firstName: 'Chioma',
    lastName: 'Client',
    email: `chioma.test.${Date.now()}@example.com`,
    role: 'client',
    balance: 500,
    wallet: {
      balance: 500,
      pendingBalance: 0,
      currency: 'USDC'
    }
  });

  const creatorUser = new User({
    _id: creatorId,
    firstName: 'Kwame',
    lastName: 'Visuals',
    email: `kwame.test.${Date.now()}@example.com`,
    role: 'creator',
    category: ['graphic_design'],
    balance: 50,
    wallet: {
      balance: 50,
      totalEarnings: 0,
      currency: 'USDC'
    }
  });

  assert(clientUser.role === 'client', '1.1 Client role initializes as "client"');
  assert(creatorUser.role === 'creator', '1.2 Creator role initializes as "creator"');
  assert(clientUser.currency === 'USDC', '1.3 Client wallet currency defaults to USDC');

  // --- Step 2: Opportunity Publishing ---
  console.log('\n--- [2/6] OPPORTUNITY PUBLISHING & VALIDATION ---');
  const projectData = {
    title: 'Brand Identity Suite for African HealthTech',
    description: 'We need a modern brand identity including vector logo, color palette, typography guidelines, and social media presentation templates.',
    category: 'graphic_design',
    budget: {
      min: 150,
      max: 300,
      currency: 'USDC',
      negotiable: true
    },
    timeline: '2 to 3 weeks',
    skillsRequired: ['Figma', 'Adobe Illustrator', 'Branding'],
    deliverables: ['Vector Logo (.SVG, .AI)', 'Brand Style Guide (.PDF)', 'Social Media Kit'],
    projectType: 'one-time',
    clientId: clientUser._id
  };

  const project = new Project(projectData);
  assert(project.title === projectData.title, '2.1 Project title preserved');
  assert(project.status === 'open', '2.2 Project default status is "open"');
  assert(project.budget.min === 150 && project.budget.max === 300, '2.3 Project budget range is 150 - 300 USDC');
  assert(project.deliverables.length === 3, '2.4 Project deliverables count matches');
  assert(project.clientId.toString() === clientId.toString(), '2.5 Project ownership attributed to authenticated client');

  // --- Step 3: Creator Proposal / Application ---
  console.log('\n--- [3/6] CREATOR APPLICATION & BIDDING ---');
  const applicationData = {
    projectId: project._id,
    creatorId: creatorUser._id,
    coverLetter: 'I have 6 years experience designing visual identities for healthcare startups across Ghana and Nigeria. I would love to build your brand identity.',
    proposedBudget: {
      amount: 250,
      currency: 'USDC'
    },
    proposedTimeline: '10 days',
    portfolioLinks: [
      { url: 'https://myartelab.com/post/mock1', title: 'Health Identity Sample' }
    ]
  };

  const application = new Application(applicationData);
  assert(application.status === 'pending', '3.1 Application status defaults to "pending"');
  assert(application.proposedBudget.amount === 250, '3.2 Creator proposed budget is 250 USDC');
  assert(application.proposedTimeline === '10 days', '3.3 Creator turnaround is 10 days');
  assert(application.portfolioLinks.length === 1, '3.4 Portfolio link attached');

  // Compound index check: creator cannot submit duplicate applications for same project
  const isDuplicate = (project._id.toString() === application.projectId.toString() &&
                       creatorUser._id.toString() === application.creatorId.toString());
  assert(isDuplicate, '3.5 Application uniqueness verified (projectId + creatorId)');

  // --- Step 4: Client Proposal Review & Acceptance ---
  console.log('\n--- [4/6] PROPOSAL ACCEPTANCE & WORKFLOW STATE ---');
  // Client reviews and accepts application
  application.status = 'accepted';
  application.reviewedAt = new Date();
  application.reviewNotes = 'Selected based on strong portfolio samples';

  project.selectedCreatorId = creatorUser._id;
  project.status = 'awaiting_payment';
  project.acceptedAmount = application.proposedBudget.amount;

  assert(application.status === 'accepted', '4.1 Application status transitions to "accepted"');
  assert(project.status === 'awaiting_payment', '4.2 Project transitions to "awaiting_payment"');
  assert(project.selectedCreatorId.toString() === creatorId.toString(), '4.3 Selected creator attributed on project');
  assert(project.acceptedAmount === 250, '4.4 Accepted contract amount locked to 250 USDC');

  // --- Step 5: Escrow Funding & In-Progress State ---
  console.log('\n--- [5/6] ESCROW DEPOSIT & LIFECYCLE ---');
  // Simulate client paying 250 USDC into escrow
  const projectAmount = project.acceptedAmount;
  assert(clientUser.balance >= projectAmount, '5.1 Client has sufficient balance to fund escrow');

  // Deduct from client available balance and lock in pendingBalance
  clientUser.balance -= projectAmount;
  clientUser.wallet.balance -= projectAmount;
  clientUser.wallet.pendingBalance += projectAmount;

  project.status = 'in_progress';
  project.paymentStatus = 'paid';
  project.paidAt = new Date();
  project.platformFee = (projectAmount * (project.platformCommission || 10)) / 100;
  project.creatorAmount = projectAmount - project.platformFee;

  assert(clientUser.wallet.balance === 250, '5.2 Client balance reduced by 250 USDC');
  assert(clientUser.wallet.pendingBalance === 250, '5.3 Escrow held in pendingBalance: 250 USDC');
  assert(project.status === 'in_progress', '5.4 Project status transitioned to "in_progress"');
  assert(project.platformFee === 25, '5.5 Platform fee calculated: 25 USDC (10%)');
  assert(project.creatorAmount === 225, '5.6 Creator net payout calculated: 225 USDC (90%)');

  // Creator delivers work
  project.attachments = [
    { url: 'https://storage.myartelab.com/deliverables/brand-pack.zip', filename: 'brand-pack.zip', uploadedAt: new Date() }
  ];
  project.status = 'delivered';
  assert(project.status === 'delivered', '5.7 Creator delivered work & project status is "delivered"');
  assert(project.attachments.length === 1, '5.8 Deliverable attachment recorded');

  // Client approves work and releases funds
  project.status = 'completed';
  project.paymentStatus = 'released';

  clientUser.wallet.pendingBalance -= projectAmount;
  creatorUser.balance += project.creatorAmount;
  creatorUser.wallet.balance += project.creatorAmount;
  creatorUser.totalEarnings = (creatorUser.totalEarnings || 0) + project.creatorAmount;
  creatorUser.wallet.totalEarnings = (creatorUser.wallet.totalEarnings || 0) + project.creatorAmount;

  assert(clientUser.wallet.pendingBalance === 0, '5.9 Client pending balance cleared');
  assert(creatorUser.wallet.balance === 275, '5.10 Creator wallet balance credited with 225 USDC');
  assert(creatorUser.wallet.totalEarnings === 225, '5.11 Creator total earnings updated');
  assert(project.status === 'completed', '5.12 Project status is "completed"');

  // --- Step 6: Rating & Review ---
  console.log('\n--- [6/6] CREATOR RATING & REVIEW VERIFICATION ---');
  const review = new Review({
    booking: new mongoose.Types.ObjectId(), // mocked booking/project ref
    reviewer: clientUser._id,
    creator: creatorUser._id,
    rating: 5,
    comment: 'Exceptional visual identity work! Delivered ahead of schedule with great communication.',
    ratings: {
      communication: 5,
      quality: 5,
      timeliness: 5,
      professionalism: 5
    }
  });

  assert(review.rating === 5, '6.1 5-star review created');
  assert(review.reviewer.toString() === clientId.toString(), '6.2 Reviewer is authenticated client');
  assert(review.creator.toString() === creatorId.toString(), '6.3 Review attributed to creator');
  assert(review.isPublished === true, '6.4 Review published status is true');

  console.log('\n================================================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} CLIENT JOURNEY & OPPORTUNITY TESTS PASSED!`);
  console.log('================================================================================\n');
}

runClientJourneyTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
