/**
 * HostFi Integration Test Suite
 * Tests all ON-RAMP and OFF-RAMP functionality
 */

require('dotenv').config();
const mongoose = require('mongoose');
const hostfiService = require('./src/services/hostfiService');
const hostfiWalletService = require('./src/services/hostfiWalletService');
const User = require('./src/models/User');
const Transaction = require('./src/models/Transaction');

const MONGODB_URI = process.env.MONGODB_URI;

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function log(message, type = 'info') {
  const colors = {
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
    info: '\x1b[36m',
    reset: '\x1b[0m'
  };

  const prefix = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
  console.log(`${colors[type]}${prefix} ${message}${colors.reset}`);
}

function testResult(testName, passed, error = null) {
  results.tests.push({ testName, passed, error });
  if (passed) {
    results.passed++;
    log(`PASS: ${testName}`, 'success');
  } else {
    results.failed++;
    log(`FAIL: ${testName} - ${error}`, 'error');
  }
}

async function runTests() {
  try {
    console.log('\n' + '='.repeat(60));
    log('HOSTFI INTEGRATION TEST SUITE', 'info');
    console.log('='.repeat(60) + '\n');

    // Connect to database
    log('Connecting to database...', 'info');
    await mongoose.connect(MONGODB_URI);
    log('Database connected', 'success');

    // TEST 1: Environment Configuration
    log('\n[TEST 1] Environment Configuration', 'info');
    try {
      if (!process.env.HOSTFI_CLIENT_ID) throw new Error('HOSTFI_CLIENT_ID not set');
      if (!process.env.HOSTFI_SECRET_KEY) throw new Error('HOSTFI_SECRET_KEY not set');
      if (!process.env.HOSTFI_API_URL) throw new Error('HOSTFI_API_URL not set');

      log(`Client ID: ${process.env.HOSTFI_CLIENT_ID.substring(0, 5)}...`, 'info');
      log(`API URL: ${process.env.HOSTFI_API_URL}`, 'info');
      testResult('Environment variables configured', true);
    } catch (error) {
      testResult('Environment variables configured', false, error.message);
    }

    // TEST 2: HostFi Authentication
    log('\n[TEST 2] HostFi Authentication', 'info');
    try {
      const token = await hostfiService.getAccessToken();
      if (!token) throw new Error('No token received');
      log(`Token obtained (length: ${token.length})`, 'info');
      testResult('HostFi authentication', true);
    } catch (error) {
      testResult('HostFi authentication', false, error.message);
      log('⚠️  Cannot proceed with API tests without valid credentials', 'warning');
      log('⚠️  Please update HOSTFI_CLIENT_ID and HOSTFI_SECRET_KEY in .env', 'warning');
    }

    // TEST 3: Wallet Initialization
    log('\n[TEST 3] Wallet Initialization', 'info');
    try {
      // Find or create a test user
      let testUser = await User.findOne({ email: 'test@hostfi.com' });

      if (!testUser) {
        log('Creating test user...', 'info');
        testUser = await User.create({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@hostfi.com',
          password: 'Test123!@#',
          role: 'client',
          wallet: {
            hostfiWalletAssets: [],
            currency: 'NGN',
            balance: 0,
            pendingBalance: 0,
            totalEarnings: 0,
            network: 'HostFi',
            address: `TEST-ADDR-${Date.now()}` // Avoid unique index collision
          }
        });
        log('Test user created', 'success');
      }

      // Test wallet initialization
      if (results.tests.find(t => t.testName === 'HostFi authentication' && t.passed)) {
        log('Initializing HostFi wallets...', 'info');
        const user = await hostfiWalletService.initializeUserWallets(testUser._id);

        if (!user.wallet.hostfiWalletAssets || user.wallet.hostfiWalletAssets.length === 0) {
          throw new Error('No wallet assets initialized');
        }

        log(`Wallets initialized: ${user.wallet.hostfiWalletAssets.length} assets`, 'info');
        user.wallet.hostfiWalletAssets.forEach(asset => {
          log(`  - ${asset.currency} (${asset.assetType}): Balance ${asset.balance}`, 'info');
        });
        testResult('Wallet initialization', true);
      } else {
        testResult('Wallet initialization', false, 'Skipped - authentication failed');
      }
    } catch (error) {
      testResult('Wallet initialization', false, error.message);
    }

    // TEST 4: Get Banks List (OFF-RAMP)
    log('\n[TEST 4] Get Banks List (OFF-RAMP)', 'info');
    try {
      if (results.tests.find(t => t.testName === 'HostFi authentication' && t.passed)) {
        const banks = await hostfiService.getBanksList('NG');
        if (!Array.isArray(banks)) throw new Error('Banks list is not an array');
        log(`Retrieved ${banks.length} banks for Nigeria`, 'info');
        if (banks.length > 0) {
          log(`  Sample: ${banks[0].name} (${banks[0].id})`, 'info');
        }
        testResult('Get banks list', true);
      } else {
        testResult('Get banks list', false, 'Skipped - authentication failed');
      }
    } catch (error) {
      testResult('Get banks list', false, error.message);
    }

    // TEST 5: Bank Account Verification (OFF-RAMP)
    log('\n[TEST 5] Bank Account Verification (OFF-RAMP)', 'info');
    try {
      if (results.tests.find(t => t.testName === 'HostFi authentication' && t.passed)) {
        // This will likely fail without a real bank account, but tests the endpoint
        try {
          await hostfiService.lookupBankAccount({
            country: 'NG',
            bankId: 'test-bank-id',
            accountNumber: '0123456789'
          });
          testResult('Bank account verification', true);
        } catch (error) {
          // Expected to fail with test data
          if (error.message.includes('Invalid') || error.message.includes('not found')) {
            log('Bank verification endpoint working (returned expected error for test data)', 'info');
            testResult('Bank account verification endpoint', true);
          } else {
            throw error;
          }
        }
      } else {
        testResult('Bank account verification', false, 'Skipped - authentication failed');
      }
    } catch (error) {
      testResult('Bank account verification', false, error.message);
    }

    // TEST 6: Create Deposit Channel (ON-RAMP)
    log('\n[TEST 6] Create Deposit Channel (ON-RAMP)', 'info');
    try {
      if (results.tests.find(t => t.testName === 'Wallet initialization' && t.passed)) {
        const testUser = await User.findOne({ email: 'test@hostfi.com' });
        const ngnAsset = testUser.wallet.hostfiWalletAssets.find(a => a.currency === 'NGN');

        if (!ngnAsset) throw new Error('NGN wallet asset not found');

        const channel = await hostfiService.createFiatCollectionChannel({
          assetId: ngnAsset.assetId,
          currency: 'NGN',
          customId: testUser._id.toString(),
          type: 'COLLECTION',
          method: 'BANK_TRANSFER',
          countryCode: 'NG'
        });

        if (!channel.accountNumber) throw new Error('No account number in response');

        log(`Deposit channel created:`, 'info');
        log(`  Bank: ${channel.bankName}`, 'info');
        log(`  Account Number: ${channel.accountNumber}`, 'info');
        log(`  Account Name: ${channel.accountName}`, 'info');

        testResult('Create deposit channel', true);
      } else {
        testResult('Create deposit channel', false, 'Skipped - wallet initialization failed');
      }

    } catch (error) {
      if (error.hostfiError) {
        log(`HostFi Error Details: ${JSON.stringify(error.hostfiError)}`, 'error');
      }
      testResult('Create deposit channel', false, error.message);
    }

    // TEST 7: Get Withdrawal Methods (OFF-RAMP)
    log('\n[TEST 7] Get Withdrawal Methods (OFF-RAMP)', 'info');
    try {
      if (results.tests.find(t => t.testName === 'HostFi authentication' && t.passed)) {
        const methods = await hostfiService.getWithdrawalMethods('NGN', 'NGN');
        if (!Array.isArray(methods)) throw new Error('Methods is not an array');
        log(`Retrieved ${methods.length} withdrawal methods`, 'info');
        testResult('Get withdrawal methods', true);
      } else {
        testResult('Get withdrawal methods', false, 'Skipped - authentication failed');
      }
    } catch (error) {
      testResult('Get withdrawal methods', false, error.message);
    }

    // TEST 8: Database Schema Check
    log('\n[TEST 8] Database Schema Validation', 'info');
    try {
      const testUser = await User.findOne({ email: 'test@hostfi.com' });

      // Check User model has HostFi fields
      if (!testUser.wallet.hasOwnProperty('hostfiWalletAssets')) {
        throw new Error('User wallet missing hostfiWalletAssets field');
      }

      // Check old Solana fields are optional
      const userWithoutWallet = new User({
        firstName: 'Schema',
        lastName: 'Test',
        email: 'schema@test.com',
        password: 'Test123!@#',
        wallet: {
          hostfiWalletAssets: [],
          currency: 'NGN',
          balance: 0,
          network: 'HostFi'
        }
      });

      await userWithoutWallet.validate();
      log('User schema supports HostFi wallets', 'info');

      // Clean up
      await User.deleteOne({ email: 'schema@test.com' });

      testResult('Database schema validation', true);
    } catch (error) {
      testResult('Database schema validation', false, error.message);
    }

    // TEST 9: Transaction Model Check
    log('\n[TEST 9] Transaction Model Check', 'info');
    try {
      // Create test transaction
      const testUser = await User.findOne({ email: 'test@hostfi.com' });
      const testTxn = await Transaction.create({
        transactionId: `TEST-${Date.now()}`,
        user: testUser._id,
        type: 'deposit',
        amount: 1000,
        currency: 'NGN',
        status: 'pending',
        paymentMethod: 'bank_transfer',
        reference: `REF-${Date.now()}`,
        metadata: {
          provider: 'hostfi',
          notes: 'Test transaction'
        }
      });

      log(`Test transaction created: ${testTxn.transactionId}`, 'info');

      // Clean up
      await Transaction.deleteOne({ _id: testTxn._id });

      testResult('Transaction model working', true);
    } catch (error) {
      testResult('Transaction model working', false, error.message);
    }

    // TEST 10: Routes Registration Check
    log('\n[TEST 10] Routes Registration', 'info');
    try {
      const serverFile = require('fs').readFileSync('./src/server.js', 'utf8');

      if (!serverFile.includes('hostfiWalletRoutes')) {
        throw new Error('hostfiWalletRoutes not imported in server.js');
      }

      if (!serverFile.includes("app.use('/api/hostfi'")) {
        throw new Error("HostFi routes not registered in server.js");
      }

      log('Routes properly registered in server.js', 'info');
      testResult('Routes registration', true);
    } catch (error) {
      testResult('Routes registration', false, error.message);
    }

    // Print Summary
    console.log('\n' + '='.repeat(60));
    log('TEST SUMMARY', 'info');
    console.log('='.repeat(60));
    log(`Total Tests: ${results.tests.length}`, 'info');
    log(`Passed: ${results.passed}`, 'success');
    log(`Failed: ${results.failed}`, results.failed > 0 ? 'error' : 'success');
    console.log('='.repeat(60) + '\n');

    if (results.failed > 0) {
      log('Failed Tests:', 'error');
      results.tests.filter(t => !t.passed).forEach(t => {
        log(`  - ${t.testName}: ${t.error}`, 'error');
      });
      console.log('');
    }

    // Clean up test user
    log('Cleaning up test data...', 'info');
    await User.deleteOne({ email: 'test@hostfi.com' });

  } catch (error) {
    log(`Fatal error: ${error.message}`, 'error');
    console.error(error);
  } finally {
    await mongoose.disconnect();
    log('Database disconnected', 'info');
    process.exit(results.failed > 0 ? 1 : 0);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
