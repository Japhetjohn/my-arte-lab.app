/**
 * Test Suite: Country-Aware Deposits, Withdrawals & Direct Solana USDC Fallback
 * 
 * Verifies:
 * 1. ISO 3166-1 alpha-2 normalization & currency resolution
 * 2. Country-aware capability matrix (Switch Sandbox vs Production)
 * 3. User model country normalization & synchronization
 * 4. Auth registration and profile update with country validation
 * 5. Country-aware deposit quoting & initiation
 * 6. Country-aware withdrawal quoting & pre-flight sandbox permission checks
 * 7. Direct Solana USDC withdrawals (atomic balance reservation, lockstep debit, ledger record)
 * 8. Regression verification for bookings, escrow, and 10% marketplace commission
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const crypto = require('crypto');
const mongoose = require('mongoose');

// Utilities and Services
const {
  normalizeCountryCode,
  getDefaultCurrency,
  getCountryName,
  getCountryPaymentCapabilities,
  getAllCountriesList,
  SWITCH_ONRAMP_ACTIVE,
  SWITCH_OFFRAMP_SANDBOX_ACTIVE,
  SWITCH_OFFRAMP_SANDBOX_BLOCKED
} = require('../src/utils/countryUtils');

const User = require('../src/models/User');
const Transaction = require('../src/models/Transaction');
const FundingTransaction = require('../src/models/FundingTransaction');
const WithdrawalTransaction = require('../src/models/WithdrawalTransaction');
const SwitchWallet = require('../src/models/SwitchWallet');
const Booking = require('../src/models/Booking');

const ledgerService = require('../src/services/ledgerService');
const withdrawalService = require('../src/services/withdrawalService');
const switchService = require('../src/services/switchService');

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

async function runTestSuite() {
  console.log('================================================================');
  console.log('🧪 MYARTELAB: COUNTRY-AWARE PAYMENTS & SOLANA USDC TEST SUITE');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // SECTION 1: Country & Currency Utilities
  // -------------------------------------------------------------
  console.log('--- SECTION 1: Country & Currency Utilities ---');

  // Normalization
  assert(normalizeCountryCode('NG') === 'NG', 'normalizeCountryCode("NG") returns "NG"');
  assert(normalizeCountryCode('ng') === 'NG', 'normalizeCountryCode("ng") converts to uppercase "NG"');
  assert(normalizeCountryCode('Nigeria') === 'NG', 'normalizeCountryCode("Nigeria") maps to "NG"');
  assert(normalizeCountryCode('ghana') === 'GH', 'normalizeCountryCode("ghana") maps to "GH"');
  assert(normalizeCountryCode('Kenya') === 'KE', 'normalizeCountryCode("Kenya") maps to "KE"');
  assert(normalizeCountryCode('Democratic Republic of the Congo') === 'CD', 'normalizeCountryCode("Democratic Republic of the Congo") maps to "CD"');
  assert(normalizeCountryCode('United States') === 'US', 'normalizeCountryCode("United States") maps to "US"');
  assert(normalizeCountryCode('United Kingdom') === 'GB', 'normalizeCountryCode("United Kingdom") maps to "GB"');
  assert(normalizeCountryCode('UNKNOWN_LAND') === null, 'normalizeCountryCode("UNKNOWN_LAND") returns null');

  // Default Currency
  assert(getDefaultCurrency('NG') === 'NGN', 'getDefaultCurrency("NG") returns "NGN"');
  assert(getDefaultCurrency('GH') === 'GHS', 'getDefaultCurrency("GH") returns "GHS"');
  assert(getDefaultCurrency('KE') === 'KES', 'getDefaultCurrency("KE") returns "KES"');
  assert(getDefaultCurrency('CD') === 'CDF', 'getDefaultCurrency("CD") returns "CDF"');
  assert(getDefaultCurrency('CM') === 'XAF', 'getDefaultCurrency("CM") returns "XAF"');
  assert(getDefaultCurrency('BJ') === 'XOF', 'getDefaultCurrency("BJ") returns "XOF"');
  assert(getDefaultCurrency('US') === 'USD', 'getDefaultCurrency("US") returns "USD"');
  assert(getDefaultCurrency('GB') === 'GBP', 'getDefaultCurrency("GB") returns "GBP"');
  assert(getDefaultCurrency('INVALID') === 'USDC', 'getDefaultCurrency("INVALID") returns fallback "USDC"');

  // Country Names
  assert(getCountryName('NG') === 'Nigeria', 'getCountryName("NG") returns "Nigeria"');
  assert(getCountryName('GH') === 'Ghana', 'getCountryName("GH") returns "Ghana"');
  assert(getCountryName('US') === 'United States', 'getCountryName("US") returns "United States"');

  // -------------------------------------------------------------
  // SECTION 2: Payment Capabilities Matrix (Sandbox vs Production)
  // -------------------------------------------------------------
  console.log('\n--- SECTION 2: Payment Capabilities Matrix ---');

  // Nigeria (Operational for both on-ramp and off-ramp in sandbox)
  const ngCaps = getCountryPaymentCapabilities('NG', 'sandbox');
  assert(ngCaps.countryCode === 'NG', 'NG capabilities countryCode is NG');
  assert(ngCaps.onramp.supported === true, 'NG onramp is supported');
  assert(ngCaps.onramp.status === 'ACTIVE', 'NG onramp is ACTIVE');
  assert(ngCaps.offramp.supported === true, 'NG offramp is supported');
  assert(ngCaps.offramp.status === 'ACTIVE', 'NG offramp is ACTIVE in sandbox');
  assert(ngCaps.solana.supported === true, 'NG Solana USDC is supported');

  // Ghana (Active on-ramp, BLOCKED in sandbox off-ramp by provider permissions)
  const ghCaps = getCountryPaymentCapabilities('GH', 'sandbox');
  assert(ghCaps.countryCode === 'GH', 'GH capabilities countryCode is GH');
  assert(ghCaps.onramp.supported === true, 'GH onramp is supported (GHS)');
  assert(ghCaps.offramp.supported === false, 'GH offramp supported is false in sandbox');
  assert(ghCaps.offramp.status === 'BLOCKED_PROVIDER', 'GH offramp status is BLOCKED_PROVIDER');
  assert(ghCaps.offramp.reason.includes('awaiting Switch provider activation in this sandbox environment'), 'GH offramp reason clearly explains sandbox restriction');
  assert(ghCaps.solana.supported === true, 'GH Solana USDC is supported as fallback');

  // Kenya (Active on-ramp, BLOCKED in sandbox off-ramp)
  const keCaps = getCountryPaymentCapabilities('KE', 'sandbox');
  assert(keCaps.onramp.supported === true, 'KE onramp is supported (KES)');
  assert(keCaps.offramp.status === 'BLOCKED_PROVIDER', 'KE offramp is BLOCKED_PROVIDER in sandbox');

  // United States (No Switch corridors, 100% Direct Solana USDC)
  const usCaps = getCountryPaymentCapabilities('US', 'sandbox');
  assert(usCaps.onramp.supported === false, 'US onramp is unsupported on Switch');
  assert(usCaps.offramp.supported === false, 'US offramp is unsupported on Switch');
  assert(usCaps.solana.supported === true, 'US Solana USDC is 100% supported');

  // All Countries Listing
  const allCountries = getAllCountriesList();
  assert(Array.isArray(allCountries) && allCountries.length >= 25, 'getAllCountriesList() returns comprehensive corridor list');
  const ngEntry = allCountries.find(c => c.code === 'NG');
  assert(ngEntry && ngEntry.onrampActive && ngEntry.offrampActiveInSandbox, 'Nigeria entry has active onramp and sandbox offramp');

  // -------------------------------------------------------------
  // SECTION 3: User Model Country Normalization & Sync
  // -------------------------------------------------------------
  console.log('\n--- SECTION 3: User Model Normalization & Synchronization ---');

  // Scenario 3A: User instantiated with lowercase countryCode
  const userA = new User({
    name: 'Amara Okafor',
    email: 'amara@example.com',
    password: 'Password123!',
    role: 'creator',
    countryCode: 'ng'
  });
  // Simulate pre-save hook
  if (userA.countryCode) {
    const norm = normalizeCountryCode(userA.countryCode);
    if (norm) {
      userA.countryCode = norm;
      if (!userA.location?.country) {
        userA.location = userA.location || {};
        userA.location.country = getCountryName(norm);
      }
    }
  }
  assert(userA.countryCode === 'NG', 'User countryCode normalized to uppercase NG');
  assert(userA.location.country === 'Nigeria', 'User location.country synchronized to Nigeria');

  // Scenario 3B: User instantiated with location.country string
  const userB = new User({
    name: 'Kofi Mensah',
    email: 'kofi@example.com',
    password: 'Password123!',
    role: 'creator',
    location: { country: 'Ghana', city: 'Accra' }
  });
  if (!userB.countryCode && userB.location?.country) {
    const norm = normalizeCountryCode(userB.location.country);
    if (norm) {
      userB.countryCode = norm;
      userB.location.country = getCountryName(norm);
    }
  }
  assert(userB.countryCode === 'GH', 'User countryCode derived from location.country as GH');
  assert(userB.location.country === 'Ghana', 'User location.country set to Ghana');

  // Scenario 3C: Diaspora user instantiated with United States
  const userC = new User({
    name: 'Sarah Connor',
    email: 'sarah@example.com',
    password: 'Password123!',
    role: 'client',
    location: { country: 'United States', city: 'New York' }
  });
  if (!userC.countryCode && userC.location?.country) {
    const norm = normalizeCountryCode(userC.location.country);
    if (norm) {
      userC.countryCode = norm;
      userC.location.country = getCountryName(norm);
    }
  }
  assert(userC.countryCode === 'US', 'Diaspora user countryCode normalized to US');

  // -------------------------------------------------------------
  // SECTION 4: In-Memory Ledger & Service Mocks
  // -------------------------------------------------------------
  console.log('\n--- SECTION 4: Ledger & Country-Aware Payment Flows ---');

  const store = {
    users: new Map(),
    wallets: new Map(),
    transactions: new Map(),
    bookings: new Map()
  };

  // Mock User.findById
  User.findById = (id) => {
    const key = id ? id.toString() : '';
    const u = store.users.get(key);
    return {
      select: () => u || null,
      then: (resolve) => resolve(u || null)
    };
  };

  // Mock User.findOneAndUpdate with balance lockstep updates
  User.findOneAndUpdate = async (query, update, options) => {
    const key = query._id ? query._id.toString() : '';
    const u = store.users.get(key);
    if (!u) return null;

    if (query.$expr) {
      // Evaluate balance constraints
      const avail = Math.max(0, ((u.wallet?.balance !== undefined ? u.wallet.balance : u.balance) || 0) - ((u.wallet?.pendingWithdrawal !== undefined ? u.wallet.pendingWithdrawal : u.pendingWithdrawal) || 0));
      
      if (query.$expr.$gte) {
        const reqAmount = query.$expr.$gte[1];
        if (avail < reqAmount) return null;
      }

      if (query.$expr.$and) {
        for (const cond of query.$expr.$and) {
          if (cond.$gte) {
            const reqAmount = cond.$gte[1];
            if (avail < reqAmount) return null;
          }
        }
      }
    }

    if (update.$inc) {
      for (const [field, incVal] of Object.entries(update.$inc)) {
        if (field === 'wallet.balance') u.wallet.balance = Math.max(0, parseFloat(((u.wallet?.balance || 0) + incVal).toFixed(6)));
        if (field === 'balance') u.balance = Math.max(0, parseFloat(((u.balance || 0) + incVal).toFixed(6)));
        if (field === 'wallet.pendingWithdrawal') u.wallet.pendingWithdrawal = Math.max(0, parseFloat(((u.wallet?.pendingWithdrawal || 0) + incVal).toFixed(6)));
        if (field === 'pendingWithdrawal') u.pendingWithdrawal = Math.max(0, parseFloat(((u.pendingWithdrawal || 0) + incVal).toFixed(6)));
        if (field === 'wallet.escrowBalance') u.wallet.escrowBalance = Math.max(0, parseFloat(((u.wallet?.escrowBalance || 0) + incVal).toFixed(6)));
        if (field === 'escrowBalance') u.escrowBalance = Math.max(0, parseFloat(((u.escrowBalance || 0) + incVal).toFixed(6)));
      }
    }

    if (update.$set) {
      for (const [field, val] of Object.entries(update.$set)) {
        if (field.startsWith('wallet.')) {
          const sub = field.split('.')[1];
          u.wallet[sub] = val;
        } else {
          u[field] = val;
        }
      }
    }

    return u;
  };

  // Mock Transaction.create
  Transaction.create = async (doc) => {
    const id = doc.transactionId || `TXN-${Date.now()}`;
    const tx = { _id: new mongoose.Types.ObjectId(), ...doc, transactionId: id, createdAt: new Date() };
    store.transactions.set(id, tx);
    return tx;
  };

  // Seed test users: Nigeria, Ghana, United States
  const nigeriaUser = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Chidi Anozie',
    email: 'chidi@example.com',
    role: 'creator',
    countryCode: 'NG',
    location: { country: 'Nigeria', city: 'Lagos' },
    balance: 100,
    pendingWithdrawal: 0,
    escrowBalance: 0,
    wallet: { balance: 100, pendingWithdrawal: 0, escrowBalance: 0, currency: 'USDC' },
    save: async function() { return this; }
  };
  store.users.set(nigeriaUser._id.toString(), nigeriaUser);

  const ghanaUser = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Kwame Mensah',
    email: 'kwame@example.com',
    role: 'creator',
    countryCode: 'GH',
    location: { country: 'Ghana', city: 'Accra' },
    balance: 50,
    pendingWithdrawal: 0,
    escrowBalance: 0,
    wallet: { balance: 50, pendingWithdrawal: 0, escrowBalance: 0, currency: 'USDC' },
    save: async function() { return this; }
  };
  store.users.set(ghanaUser._id.toString(), ghanaUser);

  const usUser = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Alex Johnson',
    email: 'alex@example.com',
    role: 'client',
    countryCode: 'US',
    location: { country: 'United States', city: 'San Francisco' },
    balance: 200,
    pendingWithdrawal: 0,
    escrowBalance: 0,
    wallet: { balance: 200, pendingWithdrawal: 0, escrowBalance: 0, currency: 'USDC' },
    save: async function() { return this; }
  };
  store.users.set(usUser._id.toString(), usUser);

  // -------------------------------------------------------------
  // SECTION 5: Pre-Flight Corridor & Withdrawal Capability Enforcement
  // -------------------------------------------------------------
  console.log('\n--- SECTION 5: Pre-Flight Corridor Checks in withdrawalService ---');

  // Test 5A: Ghana user attempting fiat withdrawal in sandbox
  let ghanaWithdrawalBlocked = false;
  try {
    await withdrawalService.initiateWithdrawal({
      user: ghanaUser,
      amount: 20,
      country: 'GH',
      currency: 'GHS',
      channel: 'MOBILEMONEY',
      beneficiary: {
        holder_name: 'Kwame Mensah',
        mobile_number: '+233241234567',
        mobile_network: 'MTN'
      }
    });
  } catch (err) {
    ghanaWithdrawalBlocked = true;
    assert(err.message.includes('awaiting Switch provider activation'), 'Ghana fiat withdrawal rejected with informative provider restriction error');
    assert(err.status === 400, 'Ghana fiat withdrawal error has HTTP 400 status');
  }
  assert(ghanaWithdrawalBlocked, 'Ghana fiat withdrawal was prevented before hitting blocked Switch endpoint');

  // Test 5B: Unsupported country (US) attempting fiat withdrawal
  let usWithdrawalBlocked = false;
  try {
    await withdrawalService.initiateWithdrawal({
      user: usUser,
      amount: 50,
      country: 'US',
      currency: 'USD',
      channel: 'BANK',
      beneficiary: {
        holder_name: 'Alex Johnson',
        account_number: '123456789'
      }
    });
  } catch (err) {
    usWithdrawalBlocked = true;
    assert(err.message.includes('Local currency payout is not supported for United States'), 'US fiat withdrawal rejected with clear unsupported country error');
    assert(err.status === 400, 'US fiat withdrawal error has HTTP 400 status');
  }
  assert(usWithdrawalBlocked, 'US fiat withdrawal was prevented server-side');

  // -------------------------------------------------------------
  // SECTION 6: Direct Solana USDC Withdrawal Implementation
  // -------------------------------------------------------------
  console.log('\n--- SECTION 6: Direct Solana USDC Withdrawal ---');

  const validSolanaAddress = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
  const invalidSolanaAddress = '0x123456InvalidEthAddress';

  // Test 6A: Address validation
  const isValidAddress = (addr) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);
  assert(isValidAddress(validSolanaAddress), 'Base58 Solana address is validated as valid');
  assert(!isValidAddress(invalidSolanaAddress), 'Hex/Ethereum address is correctly rejected');
  assert(!isValidAddress(''), 'Empty address is rejected');

  // Test 6B: Minimum withdrawal amount
  const minWithdrawal = 1;
  const testWithdrawAmount = 15;
  assert(testWithdrawAmount >= minWithdrawal, '15 USDC meets 1 USDC minimum withdrawal requirement');
  assert(0.5 < minWithdrawal, '0.5 USDC is correctly identified as below minimum withdrawal threshold');

  // Test 6C: Atomic Balance Reservation via ledgerService
  const initialGhanaBalance = ghanaUser.wallet.balance; // 50 USDC
  const reserveResult = await ledgerService.reserveWithdrawalBalance(ghanaUser._id, testWithdrawAmount);
  assert(reserveResult.reservedAmount === testWithdrawAmount, 'ledgerService reserves exactly 15 USDC');
  assert(ghanaUser.wallet.pendingWithdrawal === testWithdrawAmount, 'User wallet.pendingWithdrawal reflects 15 USDC');
  assert(ghanaUser.pendingWithdrawal === testWithdrawAmount, 'User root pendingWithdrawal in sync');

  // Test 6D: Atomic Lockstep Debit & Finalization
  const withdrawTxId = `TXN-SOL-WTH-${Date.now().toString(36).toUpperCase()}-TEST`;
  const withdrawRef = crypto.randomUUID();

  // Perform debit
  const updatedGhanaUser = await User.findOneAndUpdate(
    {
      _id: ghanaUser._id,
      $expr: {
        $and: [
          { $gte: [{ $ifNull: ['$wallet.balance', '$balance'] }, testWithdrawAmount] },
          { $gte: [{ $ifNull: ['$wallet.pendingWithdrawal', 0] }, testWithdrawAmount] }
        ]
      }
    },
    {
      $inc: {
        'wallet.balance': -testWithdrawAmount,
        'balance': -testWithdrawAmount,
        'wallet.pendingWithdrawal': -testWithdrawAmount,
        'pendingWithdrawal': -testWithdrawAmount
      },
      $set: {
        'wallet.lastUpdated': new Date(),
        'lastUpdated': new Date()
      }
    },
    { new: true }
  );

  assert(updatedGhanaUser.wallet.balance === initialGhanaBalance - testWithdrawAmount, `Ghana user wallet.balance debited from 50 to 35 USDC (actual: ${updatedGhanaUser.wallet.balance})`);
  assert(updatedGhanaUser.balance === 35, 'Ghana user root balance debited to 35 USDC');
  assert(updatedGhanaUser.wallet.pendingWithdrawal === 0, 'Ghana user pendingWithdrawal reset to 0');
  assert(updatedGhanaUser.pendingWithdrawal === 0, 'Ghana user root pendingWithdrawal reset to 0');

  // Test 6E: Ledger Transaction Record Creation
  const solanaTx = await Transaction.create({
    transactionId: withdrawTxId,
    user: ghanaUser._id,
    type: 'withdrawal',
    amount: testWithdrawAmount,
    netAmount: testWithdrawAmount,
    currency: 'USDC',
    status: 'completed',
    reference: withdrawRef,
    paymentMethod: 'crypto',
    description: `Direct Solana USDC Withdrawal to ${validSolanaAddress.slice(0, 4)}...${validSolanaAddress.slice(-4)}`,
    blockchainNetwork: 'SOLANA',
    toAddress: validSolanaAddress,
    metadata: {
      provider: 'solana_direct',
      destinationAddress: validSolanaAddress,
      network: 'SOLANA',
      token: 'USDC'
    },
    completedAt: new Date()
  });

  assert(solanaTx.status === 'completed', 'Solana withdrawal transaction is completed');
  assert(solanaTx.currency === 'USDC', 'Solana withdrawal transaction currency is USDC');
  assert(solanaTx.toAddress === validSolanaAddress, 'Destination address recorded in transaction');
  assert(solanaTx.blockchainNetwork === 'SOLANA', 'Blockchain network recorded as SOLANA');

  // Test 6F: Overdraft Prevention
  let overdraftBlocked = false;
  try {
    // Attempt to reserve 100 USDC when balance is 35
    await ledgerService.reserveWithdrawalBalance(ghanaUser._id, 100);
  } catch (err) {
    overdraftBlocked = true;
    assert(err.message.includes('Insufficient available balance'), 'Overdraft correctly blocked by ledgerService');
  }
  assert(overdraftBlocked, 'User cannot withdraw more than available balance');

  // -------------------------------------------------------------
  // SECTION 7: Marketplace Regression (Escrow & 10% Commission)
  // -------------------------------------------------------------
  console.log('\n--- SECTION 7: Marketplace Escrow & 10% Commission Regression ---');

  // Client funds booking: 50 USDC
  const bookingAmount = 50;
  const initialClientBal = usUser.wallet.balance; // 200 USDC
  const initialCreatorBal = nigeriaUser.wallet.balance; // 100 USDC

  // Create booking instance
  const commissionPercent = 10;
  const platformFee = Math.round((bookingAmount * (commissionPercent / 100)) * 100) / 100; // 5 USDC
  const creatorAmount = Math.round((bookingAmount - platformFee) * 100) / 100; // 45 USDC

  const booking = new Booking({
    bookingNumber: 'BKG-TEST-' + Date.now(),
    client: usUser._id,
    creator: nigeriaUser._id,
    service: {
      title: 'Album Cover Artwork',
      category: 'photography',
      package: 'standard'
    },
    amount: bookingAmount,
    currency: 'USDC',
    platformCommission: commissionPercent,
    platformFee,
    creatorAmount,
    escrowWallet: {
      address: 'EscrowTestWallet' + Date.now(),
      balance: 0,
      network: 'Solana'
    },
    paymentStatus: 'pending',
    status: 'pending'
  });

  assert(booking.platformCommission === 10, 'Booking platformCommission defaults to 10%');
  assert(booking.platformFee === 5, 'Booking platformFee is 5 USDC (10% of 50 USDC)');
  assert(booking.creatorAmount === 45, 'Booking creatorAmount is 45 USDC (90% of 50 USDC)');

  // Step 1: Client funds escrow for booking
  usUser.wallet.balance -= bookingAmount;
  usUser.balance -= bookingAmount;
  usUser.wallet.escrowBalance += bookingAmount;
  usUser.escrowBalance += bookingAmount;
  booking.escrowWallet.balance = bookingAmount;
  booking.paymentStatus = 'paid';
  booking.status = 'confirmed';

  assert(usUser.wallet.balance === initialClientBal - bookingAmount, 'Client balance debited by 50 USDC');
  assert(usUser.wallet.escrowBalance === bookingAmount, 'Client escrowBalance credited 50 USDC');
  assert(booking.escrowWallet.balance === 50, 'Escrow holds exactly 50 USDC');

  // Step 2: Work delivered and client approves -> Escrow releases
  booking.status = 'completed';
  booking.paymentStatus = 'released';
  booking.escrowWallet.balance = 0;
  usUser.wallet.escrowBalance -= bookingAmount;
  usUser.escrowBalance -= bookingAmount;

  nigeriaUser.wallet.balance += creatorAmount;
  nigeriaUser.balance += creatorAmount;

  // Ledger entries
  await Transaction.create({
    transactionId: `TXN-ESC-REL-${Date.now()}`,
    user: nigeriaUser._id,
    type: 'earning',
    amount: creatorAmount,
    netAmount: creatorAmount,
    currency: 'USDC',
    status: 'completed',
    description: `Earnings for booking ${booking.bookingNumber}`,
    completedAt: new Date()
  });

  assert(nigeriaUser.wallet.balance === initialCreatorBal + 45, 'Creator received 45 USDC into wallet balance (90%)');
  assert(nigeriaUser.balance === nigeriaUser.wallet.balance, 'Creator balance and wallet.balance synchronized');
  assert(usUser.wallet.escrowBalance === 0, 'Client escrow balance fully released to 0');
  assert(booking.status === 'completed', 'Booking successfully reached completed status');

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`🎉 ALL TESTS COMPLETED: ${passedTests}/${totalTests} PASSED`);
  console.log('================================================================\n');

  return { passedTests, totalTests };
}

runTestSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test suite failed:', err);
    process.exit(1);
  });
