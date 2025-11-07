/**
 * Comprehensive Stablecoin Integration Test
 * Tests all critical endpoints to ensure no fiat fallbacks
 */

const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
let authToken = '';
let userId = '';
let creatorToken = '';
let creatorId = '';

// Test data
const testClient = {
  name: 'Test Client',
  email: `client_${Date.now()}@test.com`,
  password: 'TestPass123!',
  role: 'client'
};

const testCreator = {
  name: 'Test Creator',
  email: `creator_${Date.now()}@test.com`,
  password: 'TestPass123!',
  role: 'creator',
  category: 'photographer'
};

// Color codes for console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function logTest(message) {
  log(`\n🧪 ${message}`, 'yellow');
}

async function runTest(name, testFn) {
  logTest(name);
  try {
    await testFn();
    logSuccess(`${name} - PASSED`);
    return true;
  } catch (error) {
    logError(`${name} - FAILED`);
    console.error(error.response?.data || error.message);
    return false;
  }
}

async function testHealthCheck() {
  const response = await axios.get('http://localhost:5000/health');
  if (response.data.success) {
    logInfo('Server is healthy');
  }
}

async function testClientRegistration() {
  const response = await axios.post(`${API_URL}/auth/register`, testClient);

  if (!response.data.success) {
    throw new Error('Registration failed');
  }

  authToken = response.data.data.token;
  userId = response.data.data.user._id;

  // Check wallet fields - must be Solana stablecoin
  const wallet = response.data.data.user.wallet;

  if (!wallet.address) throw new Error('No wallet address');
  if (!wallet.network || wallet.network !== 'Solana') {
    throw new Error(`Wrong network: ${wallet.network}. Expected Solana`);
  }
  if (!wallet.currency || !['USDT', 'USDC', 'DAI'].includes(wallet.currency)) {
    throw new Error(`Wrong currency: ${wallet.currency}`);
  }

  // Check for fiat fields - these should NOT exist
  if (wallet.accountNumber) throw new Error('Found fiat field: accountNumber');
  if (wallet.accountName) throw new Error('Found fiat field: accountName');
  if (wallet.bankCode) throw new Error('Found fiat field: bankCode');

  logInfo(`Client wallet: ${wallet.address.substring(0, 10)}...`);
  logInfo(`Network: ${wallet.network}, Currency: ${wallet.currency}`);
}

async function testCreatorRegistration() {
  const response = await axios.post(`${API_URL}/auth/register`, testCreator);

  if (!response.data.success) {
    throw new Error('Registration failed');
  }

  creatorToken = response.data.data.token;
  creatorId = response.data.data.user._id;

  // Check wallet fields - must be Solana stablecoin
  const wallet = response.data.data.user.wallet;

  if (!wallet.address) throw new Error('No wallet address');
  if (wallet.network !== 'Solana') {
    throw new Error(`Wrong network: ${wallet.network}`);
  }

  logInfo(`Creator wallet: ${wallet.address.substring(0, 10)}...`);
}

async function testGetProfile() {
  const response = await axios.get(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  const wallet = response.data.data.user.wallet;

  if (wallet.accountNumber) throw new Error('Found fiat field in profile');
  if (!wallet.network) throw new Error('Missing network field');

  logInfo(`Profile wallet verified - Solana network`);
}

async function testGetWallet() {
  const response = await axios.get(`${API_URL}/wallet`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  const wallet = response.data.data.wallet;

  if (!wallet.address) throw new Error('No wallet address');
  if (wallet.accountNumber) throw new Error('Found fiat field: accountNumber');

  logInfo(`Wallet balance: ${wallet.balance} ${wallet.currency}`);
}

async function testCreateBooking() {
  const bookingData = {
    creatorId: creatorId,
    serviceTitle: 'Test Photography Service',
    serviceDescription: 'Professional photo shoot',
    category: 'photographer',
    amount: 100,
    currency: 'USDT',
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  };

  const response = await axios.post(`${API_URL}/bookings`, bookingData, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  const booking = response.data.data.booking;

  // Check escrow wallet
  if (!booking.escrowWallet.address) {
    throw new Error('No escrow address');
  }

  if (!booking.escrowWallet.escrowId) {
    logInfo('⚠️  Warning: No escrowId (may be set by Tsara)');
  }

  if (booking.escrowWallet.accountNumber) {
    throw new Error('Found fiat field in escrow');
  }

  if (booking.currency !== 'USDT') {
    throw new Error(`Wrong currency: ${booking.currency}`);
  }

  logInfo(`Escrow address: ${booking.escrowWallet.address.substring(0, 10)}...`);
  logInfo(`Amount: ${booking.amount} ${booking.currency}`);
  logInfo(`Creator gets: ${booking.creatorAmount} ${booking.currency}`);
  logInfo(`Platform fee: ${booking.platformFee} ${booking.currency}`);
}

async function testGetCreators() {
  const response = await axios.get(`${API_URL}/creators`);

  if (!response.data.success) {
    throw new Error('Failed to get creators');
  }

  logInfo(`Found ${response.data.data.creators.length} creators`);

  // Check each creator wallet
  for (const creator of response.data.data.creators) {
    if (creator.wallet?.accountNumber) {
      throw new Error(`Creator ${creator.name} has fiat wallet`);
    }
  }
}

async function searchForFiatReferences() {
  logTest('Searching for fiat code references in responses...');

  const fiatKeywords = ['accountNumber', 'accountName', 'bankCode', 'NGN', 'SafeHaven', 'bank transfer'];

  // Test all endpoints and check responses
  const endpoints = [
    { method: 'get', url: `${API_URL}/auth/me`, headers: { Authorization: `Bearer ${authToken}` } },
    { method: 'get', url: `${API_URL}/wallet`, headers: { Authorization: `Bearer ${authToken}` } },
    { method: 'get', url: `${API_URL}/creators` }
  ];

  for (const endpoint of endpoints) {
    const response = await axios[endpoint.method](endpoint.url, endpoint.headers ? { headers: endpoint.headers } : {});
    const responseStr = JSON.stringify(response.data);

    for (const keyword of fiatKeywords) {
      if (responseStr.includes(keyword)) {
        throw new Error(`Found fiat reference "${keyword}" in ${endpoint.url}`);
      }
    }
  }

  logSuccess('No fiat references found in API responses');
}

async function runAllTests() {
  log('\n╔════════════════════════════════════════════════════════╗', 'cyan');
  log('║     MyArteLab Stablecoin Integration Test Suite     ║', 'cyan');
  log('╚════════════════════════════════════════════════════════╝\n', 'cyan');

  const tests = [
    ['Health Check', testHealthCheck],
    ['Client Registration (Solana Wallet)', testClientRegistration],
    ['Creator Registration (Solana Wallet)', testCreatorRegistration],
    ['Get Profile (No Fiat Fields)', testGetProfile],
    ['Get Wallet (Stablecoin Only)', testGetWallet],
    ['Create Booking (Solana Escrow)', testCreateBooking],
    ['Get Creators (No Fiat Wallets)', testGetCreators],
    ['Search for Fiat References', searchForFiatReferences]
  ];

  let passed = 0;
  let failed = 0;

  for (const [name, testFn] of tests) {
    const result = await runTest(name, testFn);
    if (result) passed++;
    else failed++;
  }

  log('\n╔════════════════════════════════════════════════════════╗', 'cyan');
  log(`║                   Test Results                         ║`, 'cyan');
  log('╠════════════════════════════════════════════════════════╣', 'cyan');
  log(`║  Total Tests: ${tests.length}`, 'cyan');
  log(`║  ${colors.green}✅ Passed: ${passed}${colors.cyan}`, 'cyan');
  log(`║  ${colors.red}❌ Failed: ${failed}${colors.cyan}`, 'cyan');
  log('╚════════════════════════════════════════════════════════╝\n', 'cyan');

  if (failed === 0) {
    logSuccess('🎉 All tests passed! Stablecoin integration is working correctly.');
    logSuccess('✨ No fiat fallbacks detected!');
    process.exit(0);
  } else {
    logError(`⚠️  ${failed} test(s) failed. Please review the errors above.`);
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  logError('Test suite crashed:');
  console.error(error);
  process.exit(1);
});
