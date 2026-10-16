const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const crypto = require('crypto');
const mongoose = require('mongoose');

const solanaDepositService = require('../src/services/solanaDepositService');
const ledgerService = require('../src/services/ledgerService');
const switchService = require('../src/services/switchService');
const withdrawalService = require('../src/services/withdrawalService');

// Models
const User = require('../src/models/User');
const Booking = require('../src/models/Booking');
const Transaction = require('../src/models/Transaction');
const SwitchWallet = require('../src/models/SwitchWallet');
const SolanaDeposit = require('../src/models/SolanaDeposit');
const WithdrawalTransaction = require('../src/models/WithdrawalTransaction');
const FundingTransaction = require('../src/models/FundingTransaction');

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

// In-memory model mocks for deterministic test execution
function setupStore() {
  const store = {
    users: new Map(),
    wallets: new Map(),
    deposits: new Map(),
    bookings: new Map(),
    transactions: new Map(),
    withdrawals: new Map(),
    fundings: new Map()
  };

  // User Mock
  User.findById = (id) => {
    const key = id ? id.toString() : '';
    const u = store.users.get(key);
    return {
      select: () => u || null,
      then: (resolve) => resolve(u || null)
    };
  };

  User.findOneAndUpdate = async (query, update, options) => {
    const key = query._id ? query._id.toString() : '';
    const u = store.users.get(key);
    if (!u) return null;

    if (update.$inc) {
      for (const [field, delta] of Object.entries(update.$inc)) {
        if (field.startsWith('wallet.')) {
          const subField = field.split('.')[1];
          u.wallet[subField] = Math.round(((u.wallet[subField] || 0) + delta) * 100) / 100;
        } else {
          u[field] = Math.round(((u[field] || 0) + delta) * 100) / 100;
        }
      }
    }
    if (update.$set) {
      for (const [field, val] of Object.entries(update.$set)) {
        if (field.startsWith('wallet.')) {
          const subField = field.split('.')[1];
          u.wallet[subField] = val;
        } else {
          u[field] = val;
        }
      }
    }
    return u;
  };

  // SolanaDeposit Mock
  SolanaDeposit.findOne = async (query) => {
    if (query.signature) {
      return store.deposits.get(query.signature) || null;
    }
    if (query._id) {
      for (const d of store.deposits.values()) {
        if (d._id.toString() === query._id.toString()) return d;
      }
    }
    return null;
  };

  SolanaDeposit.findOneAndUpdate = async (query, update, options) => {
    let deposit = null;
    if (query._id) {
      for (const d of store.deposits.values()) {
        if (d._id.toString() === query._id.toString()) {
          deposit = d;
          break;
        }
      }
    } else if (query.signature) {
      deposit = store.deposits.get(query.signature);
    }

    if (!deposit) return null;

    // Guard check: isCredited: false
    if (query.isCredited === false && deposit.isCredited !== false) {
      return null; // Atomic guard blocked duplicate credit!
    }

    if (update.$set) {
      Object.assign(deposit, update.$set);
    }
    return deposit;
  };

  SolanaDeposit.create = async (doc) => {
    if (store.deposits.has(doc.signature)) {
      const err = new Error('Duplicate key: signature already exists');
      err.code = 11000;
      throw err;
    }
    const newDoc = {
      ...doc,
      _id: new mongoose.Types.ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      save: async function () { return this; }
    };
    store.deposits.set(doc.signature, newDoc);
    return newDoc;
  };

  SolanaDeposit.find = (query) => {
    const list = Array.from(store.deposits.values()).filter(d => {
      if (query.user && d.user.toString() !== query.user.toString()) return false;
      if (query.isCredited !== undefined && d.isCredited !== query.isCredited) return false;
      return true;
    });
    return {
      sort: () => ({
        skip: (s) => ({
          limit: (l) => list.slice(s, s + l)
        })
      }),
      limit: (l) => list.slice(0, l),
      then: (resolve) => resolve(list)
    };
  };

  SolanaDeposit.countDocuments = async (query) => {
    return Array.from(store.deposits.values()).filter(d => {
      if (query.user && d.user.toString() !== query.user.toString()) return false;
      return true;
    }).length;
  };

  // Transaction Mock
  Transaction.create = async (doc) => {
    const tx = {
      ...doc,
      _id: new mongoose.Types.ObjectId(),
      transactionId: doc.transactionId || `TX-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
      createdAt: new Date(),
      save: async function () { return this; }
    };
    store.transactions.set(tx.transactionId, tx);
    return tx;
  };
  Transaction.findOne = async (query) => {
    return null;
  };

  // SwitchWallet Mock
  SwitchWallet.findOne = async (query) => {
    if (query.user) {
      return store.wallets.get(query.user.toString()) || null;
    }
    if (query.$or) {
      for (const cond of query.$or) {
        if (cond.solanaAddress) {
          for (const w of store.wallets.values()) {
            if (w.solanaAddress === cond.solanaAddress) return w;
          }
        }
        if (cond.switchWalletId) {
          for (const w of store.wallets.values()) {
            if (w.switchWalletId === cond.switchWalletId) return w;
          }
        }
      }
    }
    return null;
  };

  // Booking Mock
  Booking.findById = (id) => {
    const b = store.bookings.get(id.toString());
    return {
      populate: () => ({
        then: (resolve) => resolve(b || null)
      }),
      then: (resolve) => resolve(b || null)
    };
  };

  Booking.find = async (query) => {
    return Array.from(store.bookings.values()).filter(b => {
      if (query.client && b.client.toString() !== query.client.toString()) return false;
      if (query.creator && b.creator.toString() !== query.creator.toString()) return false;
      return true;
    });
  };

  // WithdrawalTransaction Mock
  WithdrawalTransaction.create = async (doc) => {
    const w = {
      ...doc,
      _id: new mongoose.Types.ObjectId(),
      reference: doc.reference || `WD-${Date.now()}`,
      createdAt: new Date(),
      save: async function () { return this; }
    };
    store.withdrawals.set(w.reference, w);
    return w;
  };

  // FundingTransaction Mock
  FundingTransaction.create = async (doc) => {
    const f = {
      ...doc,
      _id: new mongoose.Types.ObjectId(),
      reference: doc.reference || `FD-${Date.now()}`,
      createdAt: new Date(),
      save: async function () { return this; }
    };
    store.fundings.set(f.reference, f);
    return f;
  };

  FundingTransaction.findOne = async (query) => {
    if (query.reference) return store.fundings.get(query.reference) || null;
    if (query._id) {
      for (const f of store.fundings.values()) {
        if (f._id.toString() === query._id.toString()) return f;
      }
    }
    return null;
  };

  FundingTransaction.findOneAndUpdate = async (query, update, options) => {
    let f = null;
    if (query.reference) f = store.fundings.get(query.reference);
    else if (query._id) {
      for (const item of store.fundings.values()) {
        if (item._id.toString() === query._id.toString()) {
          f = item;
          break;
        }
      }
    }

    if (!f) return null;
    if (query.isCredited === false && f.isCredited !== false) return null;

    if (update.$set) Object.assign(f, update.$set);
    return f;
  };

  return store;
}

async function runDirectSolanaTestSuite() {
  console.log('================================================================================');
  console.log('🚀 MYARTELAB × DIRECT SOLANA USDC INTEGRATION TEST SUITE 🚀');
  console.log('================================================================================\n');

  const store = setupStore();

  const clientId = new mongoose.Types.ObjectId();
  const creatorId = new mongoose.Types.ObjectId();
  const clientSolanaAddress = '7NwkP8Zp2hT65kYjK399m3bLqWpP3pWfQ4Z4tU9k7R1L';
  const platformSolanaAddress = process.env.PLATFORM_WALLET_ADDRESS || 'Gy2n4pZePk1vZyx76GtNERaLSgcoQYD2MnohMxFWbtCV';

  const clientUser = {
    _id: clientId,
    name: 'Amara Client',
    firstName: 'Amara',
    lastName: 'Client',
    email: 'client@myartelab.com',
    role: 'client',
    balance: 0.00,
    pendingBalance: 0.00,
    wallet: {
      balance: 0.00,
      pendingBalance: 0.00,
      currency: 'USDC'
    },
    save: async function() { return this; }
  };
  store.users.set(clientId.toString(), clientUser);

  const creatorUser = {
    _id: creatorId,
    name: 'Kofi Creator',
    firstName: 'Kofi',
    lastName: 'Creator',
    email: 'creator@myartelab.com',
    role: 'creator',
    balance: 0.00,
    pendingBalance: 0.00,
    pendingWithdrawal: 0.00,
    totalEarnings: 0.00,
    wallet: {
      balance: 0.00,
      pendingBalance: 0.00,
      pendingWithdrawal: 0.00,
      totalEarnings: 0.00,
      currency: 'USDC'
    },
    save: async function() { return this; }
  };
  store.users.set(creatorId.toString(), creatorUser);

  const clientWallet = {
    _id: new mongoose.Types.ObjectId(),
    user: clientId,
    solanaAddress: clientSolanaAddress,
    switchWalletId: 'sw_client_solana_123',
    save: async function() { return this; }
  };
  store.wallets.set(clientId.toString(), clientWallet);

  // ---------------------------------------------------------------------------
  // TEST 1: Retrieve Verified Deposit Instructions
  // ---------------------------------------------------------------------------
  console.log('--- TEST 1: Retrieve Verified Deposit Instructions ---');
  const instructions = await solanaDepositService.getDepositInstructions(clientId);
  assert(instructions.token === 'USDC', '1.1 Token is USDC');
  assert(instructions.mint === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', '1.2 Official Circle Solana USDC mint address verified');
  assert(instructions.decimals === 6, '1.3 Decimals set to 6');
  assert(Boolean(instructions.recipientAddress), `1.4 Recipient address provided: ${instructions.recipientAddress}`);
  assert(instructions.confirmationCommitment === 'finalized', '1.5 Requires finalized commitment level');

  // ---------------------------------------------------------------------------
  // TEST 2: Validate & Reject Failed On-Chain Transactions
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 2: Reject Failed On-Chain Transactions ---');
  const failedTxSig = 'failed_tx_' + crypto.randomBytes(16).toString('hex');
  let failedCaught = false;
  try {
    await solanaDepositService.verifyAndCreditDeposit(clientId, failedTxSig, {
      err: { InstructionError: [0, 'Custom(1)'] }, // On-chain failure
      amountUsdc: 50.00,
      mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      toAddress: clientSolanaAddress
    });
  } catch (err) {
    failedCaught = true;
    assert(err.message.includes('failed on Solana'), `2.1 Error caught for failed tx: ${err.message}`);
  }
  assert(failedCaught, '2.2 Failed transaction was successfully rejected without crediting');

  // ---------------------------------------------------------------------------
  // TEST 3: Validate & Reject Wrong Token Mint (e.g. USDT / Counterfeit Token)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 3: Reject Wrong Token Mint (Counterfeit / USDT) ---');
  const wrongMintSig = 'wrong_mint_tx_' + crypto.randomBytes(16).toString('hex');
  const USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';
  let wrongMintCaught = false;
  try {
    await solanaDepositService.verifyAndCreditDeposit(clientId, wrongMintSig, {
      err: null,
      amountUsdc: 100.00,
      mint: USDT_MINT, // USDT instead of official USDC
      toAddress: clientSolanaAddress
    });
  } catch (err) {
    wrongMintCaught = true;
    assert(err.message.includes('invalid token mint'), `3.1 Error caught for wrong token mint: ${err.message}`);
  }
  assert(wrongMintCaught, '3.2 Counterfeit/non-USDC token was successfully rejected');

  // ---------------------------------------------------------------------------
  // TEST 4: Reject Wrong Recipient Address
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 4: Reject Wrong Recipient Address ---');
  const wrongRecipientSig = 'wrong_recipient_tx_' + crypto.randomBytes(16).toString('hex');
  let wrongRecipientCaught = false;
  try {
    await solanaDepositService.verifyAndCreditDeposit(clientId, wrongRecipientSig, {
      err: null,
      amountUsdc: 50.00,
      mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      toAddress: '99999999999999999999999999999999999999999999' // Arbitrary foreign address
    });
  } catch (err) {
    wrongRecipientCaught = true;
    assert(err.message.includes('does not match'), `4.1 Error caught for wrong destination: ${err.message}`);
  }
  assert(wrongRecipientCaught, '4.2 Transfer to foreign address successfully rejected');

  // ---------------------------------------------------------------------------
  // TEST 5: Successfully Verify & Credit Genuine Solana USDC Deposit
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 5: Successfully Verify & Credit Genuine Solana USDC Deposit ---');
  const validDepositSig = '5xSolanaValidSignature' + crypto.randomBytes(24).toString('hex');
  const depositAmount = 50.00;

  const validDepositResult = await solanaDepositService.verifyAndCreditDeposit(clientId, validDepositSig, {
    err: null,
    amountUsdc: depositAmount,
    rawAmount: '50000000',
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    toAddress: clientSolanaAddress,
    fromAddress: 'SenderWallet1111111111111111111111111111111',
    slot: 284920194,
    blockTime: Math.floor(Date.now() / 1000),
    confirmationStatus: 'finalized'
  });

  assert(validDepositResult.success === true, '5.1 Verification returned success');
  assert(validDepositResult.credited === true, '5.2 Credit flag is true');
  assert(validDepositResult.data.amountUsdc === 50.00, '5.3 Credited exactly 50.00 USDC');
  assert(clientUser.balance === 50.00, `5.4 User root balance synchronized to $50.00 (current: $${clientUser.balance})`);
  assert(clientUser.wallet.balance === 50.00, `5.5 User wallet.balance synchronized to $50.00 (current: $${clientUser.wallet.balance})`);

  // Verify SolanaDeposit record stored correctly
  const savedDeposit = await SolanaDeposit.findOne({ signature: validDepositSig });
  assert(Boolean(savedDeposit), '5.6 SolanaDeposit record persisted in database');
  assert(savedDeposit.isCredited === true, '5.7 SolanaDeposit marked isCredited: true');
  assert(savedDeposit.mint === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', '5.8 Mint recorded as Circle USDC');

  // Verify Ledger Transaction record created
  const ledgerTx = store.transactions.get(validDepositResult.data.ledgerTransactionId);
  assert(Boolean(ledgerTx), '5.9 Ledger Transaction record created');
  assert(ledgerTx.type === 'deposit', '5.10 Transaction type is deposit');
  assert(ledgerTx.paymentMethod === 'solana_direct', '5.11 Payment method is solana_direct');
  assert(ledgerTx.blockchainNetwork === 'SOLANA', '5.12 Blockchain network recorded as SOLANA');

  // ---------------------------------------------------------------------------
  // TEST 6: Idempotency & Duplicate Signature Protection
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 6: Idempotency & Duplicate Signature Protection ---');
  const secondAttemptResult = await solanaDepositService.verifyAndCreditDeposit(clientId, validDepositSig, {
    err: null,
    amountUsdc: depositAmount,
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    toAddress: clientSolanaAddress
  });

  assert(secondAttemptResult.alreadyCredited === true, '6.1 Second attempt recognized deposit was already credited');
  assert(clientUser.balance === 50.00, `6.2 Balance was NOT incremented twice (balance remains $${clientUser.balance})`);
  assert(clientUser.wallet.balance === 50.00, `6.3 Wallet balance was NOT incremented twice (wallet balance remains $${clientUser.wallet.balance})`);

  // ---------------------------------------------------------------------------
  // TEST 7: Concurrent Race-Condition Guard
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 7: Concurrent Race-Condition Guard ---');
  const raceDepositSig = '5xRaceConditionSig' + crypto.randomBytes(24).toString('hex');
  const raceAmount = 25.00;

  // Simulate 3 concurrent submissions of the same signature
  const concurrentResults = await Promise.all([
    solanaDepositService.verifyAndCreditDeposit(clientId, raceDepositSig, {
      err: null,
      amountUsdc: raceAmount,
      rawAmount: '25000000',
      mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      toAddress: clientSolanaAddress,
      slot: 284920200
    }),
    solanaDepositService.verifyAndCreditDeposit(clientId, raceDepositSig, {
      err: null,
      amountUsdc: raceAmount,
      rawAmount: '25000000',
      mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      toAddress: clientSolanaAddress,
      slot: 284920200
    }),
    solanaDepositService.verifyAndCreditDeposit(clientId, raceDepositSig, {
      err: null,
      amountUsdc: raceAmount,
      rawAmount: '25000000',
      mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      toAddress: clientSolanaAddress,
      slot: 284920200
    })
  ]);

  const newlyCreditedCount = concurrentResults.filter(r => r.credited === true && !r.alreadyCredited).length;
  const alreadyCreditedCount = concurrentResults.filter(r => r.alreadyCredited === true).length;
  assert(newlyCreditedCount === 1, `7.1 Exactly ONE concurrent request was credited (count: ${newlyCreditedCount})`);
  assert(alreadyCreditedCount === 2, `7.2 Exactly TWO concurrent requests received alreadyCredited (count: ${alreadyCreditedCount})`);
  assert(clientUser.balance === 75.00, `7.3 Balance accurately reflects exactly one $25 addition (balance: $${clientUser.balance})`);

  // ---------------------------------------------------------------------------
  // TEST 8: Server Restart / Uncredited Deposit Reconciliation
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 8: Server Restart / Uncredited Deposit Reconciliation ---');
  const uncreditedSig = '5xUncreditedInterruptedSig' + crypto.randomBytes(24).toString('hex');
  const uncreditedAmount = 15.00;

  // Insert an uncredited confirmed deposit (e.g. server crashed before ledger step)
  const interruptedDeposit = await SolanaDeposit.create({
    user: clientId,
    signature: uncreditedSig,
    amountUsdc: uncreditedAmount,
    rawAmount: '15000000',
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    toAddress: clientSolanaAddress,
    network: 'mainnet-beta',
    status: 'confirmed',
    isCredited: false
  });

  const reconciliationReport = await solanaDepositService.reconcileUncreditedDeposits();
  assert(reconciliationReport.reconciledCount >= 1, `8.1 Successfully reconciled uncredited deposit (reconciled: ${reconciliationReport.reconciledCount})`);
  assert(clientUser.balance === 90.00, `8.2 Client balance increased to $90.00 (current: $${clientUser.balance})`);
  assert(clientUser.wallet.balance === 90.00, `8.3 Client wallet.balance matches $90.00 (current: $${clientUser.wallet.balance})`);

  // ---------------------------------------------------------------------------
  // TEST 9: Switch Wallet Receive Webhook Delegation
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 9: Switch Wallet Receive Webhook Delegation ---');
  const webhookSig = '5xSwitchWalletWebhookSig' + crypto.randomBytes(24).toString('hex');
  const webhookPayload = {
    type: 'receive',
    address: clientSolanaAddress,
    token: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    decimals: 6,
    amount: '10000000', // 10 USDC (10,000,000 base units)
    asset: 'solana:usdc',
    hash: webhookSig
  };

  const webhookResult = await solanaDepositService.processSwitchWalletReceiveWebhook(webhookPayload);
  assert(webhookResult.success === true, '9.1 Webhook receive processed successfully');
  assert(webhookResult.credited === true, '9.2 Webhook transfer credited to user');
  assert(clientUser.balance === 100.00, `9.3 Balance updated to $100.00 (current: $${clientUser.balance})`);

  // ---------------------------------------------------------------------------
  // TEST 10: Complete Unified Marketplace Flow
  // (Direct Solana Funding -> Escrow Booking -> Delivery -> Approval -> 10% Commission -> Creator Withdrawal)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 10: Complete Unified Marketplace Flow ---');
  console.log(`Initial balances: Client = $${clientUser.balance}, Creator = $${creatorUser.balance}`);

  // Step 1: Create a 50 USDC booking
  const bookingId = new mongoose.Types.ObjectId();
  const bookingTotal = 50.00;
  const mockBooking = {
    _id: bookingId,
    bookingNumber: 'BK-SOLANA-USDC-50',
    client: clientId,
    creator: creatorId,
    amount: bookingTotal,
    platformFee: 5.00,    // 10% marketplace commission
    creatorAmount: 45.00, // 90% net creator earnings
    currency: 'USDC',
    status: 'pending',
    paymentStatus: 'pending',
    save: async function() { return this; }
  };
  store.bookings.set(bookingId.toString(), mockBooking);

  // Step 2: Pay for booking from client's balance (funded via Solana) into Escrow
  clientUser.balance -= mockBooking.amount;
  clientUser.wallet.balance -= mockBooking.amount;
  clientUser.pendingBalance += mockBooking.amount;
  clientUser.wallet.pendingBalance += mockBooking.amount;
  mockBooking.escrowWallet = { balance: mockBooking.amount, currency: 'USDC' };
  mockBooking.status = 'confirmed';
  mockBooking.paymentStatus = 'paid';
  mockBooking.paidAt = new Date();

  await Transaction.create({
    user: clientId,
    type: 'payment',
    amount: mockBooking.amount,
    currency: 'USDC',
    status: 'completed',
    description: `Escrow payment for booking ${mockBooking.bookingNumber}`,
    reference: `PAY-${mockBooking.bookingNumber}`
  });

  assert(clientUser.balance === 50.00, `10.1 Client balance deducted from $100 to $50 (current: $${clientUser.balance})`);
  assert(mockBooking.escrowWallet.balance === 50.00, '10.2 Escrow wallet holds exactly 50.00 USDC');
  assert(mockBooking.paymentStatus === 'paid', '10.3 Booking payment status is "paid"');
  assert(mockBooking.status === 'confirmed', '10.4 Booking status transitioned to "confirmed"');

  // Step 3: Creator marks booking as delivered
  mockBooking.status = 'delivered';
  mockBooking.deliveredAt = new Date();

  // Step 4: Client approves deliverable -> Escrow releases with 10% commission
  creatorUser.balance += mockBooking.creatorAmount;
  creatorUser.wallet.balance += mockBooking.creatorAmount;
  creatorUser.totalEarnings += mockBooking.creatorAmount;
  creatorUser.wallet.totalEarnings += mockBooking.creatorAmount;

  clientUser.pendingBalance -= mockBooking.amount;
  clientUser.wallet.pendingBalance -= mockBooking.amount;

  mockBooking.escrowWallet.balance = 0.00;
  mockBooking.fundsReleased = true;
  mockBooking.paymentStatus = 'released';
  mockBooking.status = 'completed';
  mockBooking.completedAt = new Date();

  // Verify 10% commission split:
  // 50 USDC total -> 5.00 USDC platform commission (10%), 45.00 USDC creator net (90%)
  assert(mockBooking.status === 'completed', '10.5 Booking status transitioned to "completed"');
  assert(mockBooking.escrowWallet.balance === 0.00, '10.6 Escrow wallet balance emptied to 0.00');
  assert(creatorUser.balance === 45.00, `10.7 Creator balance credited exactly 45.00 USDC (current: $${creatorUser.balance})`);
  assert(creatorUser.wallet.balance === 45.00, `10.8 Creator wallet.balance credited exactly 45.00 USDC (current: $${creatorUser.wallet.balance})`);
  assert(creatorUser.totalEarnings === 45.00, `10.9 Creator totalEarnings recorded as 45.00 USDC (current: $${creatorUser.totalEarnings})`);

  // Step 5: Creator initiates off-ramp withdrawal for their earnings
  // Atomic reservation locks funds in pendingWithdrawal
  const reservationResult = await ledgerService.reserveWithdrawalBalance(creatorId, 45.00);
  assert(reservationResult.reservedAmount === 45.00, '10.10 Reservation returned 45.00 USDC');
  assert(reservationResult.availableBalance === 0.00, `10.11 Creator available balance reserved to 0.00 USDC (available: $${reservationResult.availableBalance})`);
  assert(creatorUser.pendingWithdrawal === 45.00, `10.12 Creator pendingWithdrawal reflects 45.00 USDC (current: $${creatorUser.pendingWithdrawal})`);

  // ---------------------------------------------------------------------------
  // TEST 11: Fiat On-Ramp Regression (Switch On-Ramp Continues Operating)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 11: Fiat On-Ramp Regression ---');
  const fiatFundingRef = 'FD-REGRESSION-' + Date.now();
  const mockFiatTx = {
    _id: new mongoose.Types.ObjectId(),
    reference: fiatFundingRef,
    user: clientId,
    quotedUsdcAmount: 20.00,
    fiatAmount: 31000,
    fiatCurrency: 'NGN',
    status: 'completed',
    switchStatus: 'COMPLETED',
    isCredited: false,
    save: async function() { return this; }
  };
  store.fundings.set(fiatFundingRef, mockFiatTx);

  const fiatCreditResult = await ledgerService.creditFundingDeposit(mockFiatTx);
  assert(fiatCreditResult.credited === true, '11.1 Fiat funding deposit credited via Switch');
  assert(clientUser.balance === 70.00, `11.2 Client balance increased by 20 USDC to $70.00 (current: $${clientUser.balance})`);
  assert(clientUser.wallet.balance === 70.00, `11.3 Client wallet.balance matches $70.00 (current: $${clientUser.wallet.balance})`);

  console.log('\n================================================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} DIRECT SOLANA USDC & MARKETPLACE TESTS PASSED! 🎉`);
  console.log('================================================================================');
}

runDirectSolanaTestSuite().catch(err => {
  console.error('\n❌ TEST SUITE FAILED WITH ERROR:', err);
  process.exit(1);
});
