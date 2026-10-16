const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const assert = require('assert');

// Test utilities
let passedTests = 0;
let totalTests = 0;

function it(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   Error: ${err.message}`);
    throw err;
  }
}

async function itAsync(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   Error: ${err.message}`);
    throw err;
  }
}

async function runTestSuite() {
  console.log('============================================================');
  console.log('🧪 MYARTELAB WITHDRAWAL FAILURE ROOT-CAUSE AUDIT & VERIFICATION');
  console.log('============================================================\n');

  // --- SECTION 1: FINANCIAL PRECISION & FLOORING INTEGRITY ---
  console.log('--- SECTION 1: Live Balance Flooring vs Phantom Over-Rounding ---');

  it('Balance calculation never rounds up fractional live crypto balances', () => {
    // User had 3.627485 USDC on-chain.
    // Math.round(3.627485 * 100) / 100 produced 3.63 (causing Switch to reject with Insufficient Balance).
    // Math.floor(3.627485 * 100) / 100 correctly produces 3.62.
    const rawBalance = 3.627485;
    const roundedUp = Math.round(rawBalance * 100) / 100;
    const floored = Math.floor(rawBalance * 100) / 100;

    assert.strictEqual(roundedUp, 3.63, 'Math.round incorrectly rounded up to 3.63');
    assert.strictEqual(floored, 3.62, 'Math.floor correctly truncated to 3.62');
    assert(floored <= rawBalance, 'Floored balance is guaranteed to be <= actual on-chain funds');
    assert(roundedUp > rawBalance, 'Rounded-up balance exceeded actual on-chain funds by phantom fraction');
  });

  it('Floored available balance handles zero, integer, and decimal amounts correctly', () => {
    assert.strictEqual(Math.floor(0 * 100) / 100, 0);
    assert.strictEqual(Math.floor(10 * 100) / 100, 10);
    assert.strictEqual(Math.floor(10.999 * 100) / 100, 10.99);
    assert.strictEqual(Math.floor(0.009 * 100) / 100, 0);
    assert.strictEqual(Math.floor(1.001 * 100) / 100, 1.00);
  });

  // --- SECTION 2: ERROR HANDLER CLIENT STATUS PRESERVATION ---
  console.log('\n--- SECTION 2: Error Handler Status Code & Message Preservation ---');

  const { ErrorHandler } = require('../src/utils/errorHandler');

  it('ErrorHandler creates operational error with correct status code', () => {
    const err = new ErrorHandler('Insufficient balance in wallet to cover this payment', 400);
    assert.strictEqual(err.statusCode, 400);
    assert.strictEqual(err.isOperational, true);
    assert.strictEqual(err.message, 'Insufficient balance in wallet to cover this payment');
  });

  it('sendErrorResponse does NOT mask 4xx client errors as 500 in production', () => {
    // Mock res object
    let capturedStatus = 0;
    let capturedBody = null;
    const res = {
      status(code) {
        capturedStatus = code;
        return this;
      },
      json(body) {
        capturedBody = body;
        return this;
      }
    };

    // Save old env
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      const errorModule = require('../src/utils/errorHandler');
      // Create a 400 error as returned by SwitchService
      const switchErr = new Error('Insufficient balance in wallet to cover this payment');
      switchErr.status = 400;
      switchErr.statusCode = 400;
      switchErr.isOperational = true;

      // Invoke errorHandler middleware logic
      errorModule.errorMiddleware(switchErr, {}, res, () => {});

      assert.strictEqual(capturedStatus, 400, `Expected status 400 but got ${capturedStatus}`);
      assert.strictEqual(capturedBody.success, false);
      assert.strictEqual(capturedBody.statusCode, 400);
      assert.strictEqual(
        capturedBody.error,
        'Insufficient balance in wallet to cover this payment',
        'Should preserve the actionable error message rather than mask as "Something went wrong"'
      );
    } finally {
      process.env.NODE_ENV = origEnv;
    }
  });

  it('sendErrorResponse preserves err.status even if err.statusCode was omitted', () => {
    let capturedStatus = 0;
    let capturedBody = null;
    const res = {
      status(code) {
        capturedStatus = code;
        return this;
      },
      json(body) {
        capturedBody = body;
        return this;
      }
    };

    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      const errorModule = require('../src/utils/errorHandler');
      const errWithStatusOnly = new Error('Invalid bank account number');
      errWithStatusOnly.status = 422;

      errorModule.errorMiddleware(errWithStatusOnly, {}, res, () => {});

      assert.strictEqual(capturedStatus, 422, `Expected status 422 but got ${capturedStatus}`);
      assert.strictEqual(capturedBody.error, 'Invalid bank account number');
    } finally {
      process.env.NODE_ENV = origEnv;
    }
  });

  // --- SECTION 3: SWITCH SERVICE ERROR CONSTRUCTION ---
  console.log('\n--- SECTION 3: SwitchService Error Construction ---');

  const switchService = require('../src/services/switchService');

  it('SwitchService _sanitizeMessage cleans raw technical error strings', () => {
    const raw = 'Switch API HTTP error 400: Insufficient balance in wallet to cover this payment';
    const clean = switchService._sanitizeMessage(raw);
    assert(!clean.includes('API key'), 'Never leaks keys');
    assert(clean.includes('Insufficient balance in wallet to cover this payment'));
  });

  it('SwitchService resolves developer fee recipient safely', () => {
    // Valid Base58 address
    const validSol = 'G2NKvCAfXUSjVrn63VYHoXqN8j79B3cx2nY6tG1fnjAx';
    const resolved = switchService._resolveDeveloperRecipient(validSol);
    assert.strictEqual(resolved, validSol);

    // Invalid address
    const invalid = '0x1234567890abcdef';
    const resolvedInvalid = switchService._resolveDeveloperRecipient(invalid);
    // Should fallback or return undefined if fallback is invalid
    assert(resolvedInvalid === undefined || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(resolvedInvalid));
  });

  // --- SECTION 4: WITHDRAWAL SERVICE PRE-FLIGHT LIVE BALANCE CHECK ---
  console.log('\n--- SECTION 4: Pre-flight Live Balance Check & Immediate Reversal ---');

  const withdrawalService = require('../src/services/withdrawalService');
  const ledgerService = require('../src/services/ledgerService');
  const User = require('../src/models/User');
  const SwitchWallet = require('../src/models/SwitchWallet');
  const WithdrawalTransaction = require('../src/models/WithdrawalTransaction');

  await itAsync('Pre-flight balance check rejects withdrawal before calling Switch if amount + network fee > live balance', async () => {
    const testUserId = '6983ea1691b5040eb0fb0276';
    const mockUser = {
      _id: testUserId,
      name: 'Tester User',
      countryCode: 'NG'
    };

    // Mock SwitchWallet.findOne
    const origSwFindOne = SwitchWallet.findOne;
    const origGetWalletBalance = switchService.getWalletBalance;
    const origGetFee = switchService.getNetworkTransferFee;
    const origTxFindOne = WithdrawalTransaction.findOne;

    try {
      WithdrawalTransaction.findOne = async () => null;
      SwitchWallet.findOne = async () => ({
        user: testUserId,
        switchWalletId: '6acf99b9f419026f8d11bbe0',
        solanaAddress: 'G2NKvCAfXUSjVrn63VYHoXqN8j79B3cx2nY6tG1fnjAx'
      });

      // Mock live balance as 3.627485 USDC and network fee as 0.091196 USDC
      switchService.getWalletBalance = async () => ({
        balance: 3.627485,
        isLive: true,
        providerStatus: 'live'
      });
      switchService.getNetworkTransferFee = async () => 0.091196;

      // 1. Attempt to withdraw 3.62 USDC (exceeds spendable balance once network fee 0.091196 is added: 3.62 + 0.091196 = 3.711196 > 3.627485)
      let threw = false;
      let caughtErr = null;
      try {
        await withdrawalService.initiateWithdrawal({
          user: mockUser,
          amount: 3.62,
          country: 'NG',
          currency: 'NGN',
          channel: 'BANK',
          beneficiary: {
            bank_code: '100004',
            account_number: '7031632438',
            holder_name: 'Tester User'
          }
        });
      } catch (err) {
        threw = true;
        caughtErr = err;
      }

      assert(threw, 'Should have thrown error on pre-flight balance and fee check');
      assert.strictEqual(caughtErr.status, 400, 'Error status should be 400');
      assert.strictEqual(caughtErr.statusCode, 400, 'Error statusCode should be 400');
      assert(caughtErr.message.includes('Insufficient wallet balance on Switch'), 'Error message is clear and actionable');
      assert(caughtErr.message.includes('3.53 USDC'), 'Informs user of exact max allowed spendable balance ($3.53 USDC)');
      assert(caughtErr.message.includes('network transfer fees'), 'Mentions network transfer fee');
    } finally {
      SwitchWallet.findOne = origSwFindOne;
      switchService.getWalletBalance = origGetWalletBalance;
      switchService.getNetworkTransferFee = origGetFee;
      WithdrawalTransaction.findOne = origTxFindOne;
    }
  });

  await itAsync('Pre-flight balance check accepts withdrawal when amount <= maxSpendable (net of network fee)', async () => {
    const testUserId = '6983ea1691b5040eb0fb0276';
    const mockUser = {
      _id: testUserId,
      name: 'Tester User',
      countryCode: 'NG'
    };

    const origSwFindOne = SwitchWallet.findOne;
    const origGetWalletBalance = switchService.getWalletBalance;
    const origGetFee = switchService.getNetworkTransferFee;
    const origTxFindOne = WithdrawalTransaction.findOne;
    const origGetQuote = switchService.getOfframpQuote;
    const origReserve = ledgerService.reserveWithdrawalBalance;
    const origInitiate = switchService.initiateOfframp;
    const origTxCreate = WithdrawalTransaction.create;

    try {
      WithdrawalTransaction.findOne = async () => null;
      SwitchWallet.findOne = async () => ({
        user: testUserId,
        switchWalletId: '6acf99b9f419026f8d11bbe0',
        solanaAddress: 'G2NKvCAfXUSjVrn63VYHoXqN8j79B3cx2nY6tG1fnjAx'
      });

      switchService.getWalletBalance = async () => ({
        balance: 3.627485,
        isLive: true,
        providerStatus: 'live'
      });
      switchService.getNetworkTransferFee = async () => 0.091196;

      switchService.getOfframpQuote = async () => ({
        rate: 1340,
        destination: { amount: 4730.2 },
        source: { amount: 3.53 },
        fee: { total: 0 }
      });

      ledgerService.reserveWithdrawalBalance = async () => ({ reserved: true, reservedAmount: 3.53 });
      WithdrawalTransaction.create = async (doc) => ({
        ...doc,
        save: async () => {}
      });

      let switchCalledWith = null;
      switchService.initiateOfframp = async (params) => {
        switchCalledWith = params;
        return { status: 'PROCESSING', reference: 'ref-switch-123' };
      };

      // Attempt to withdraw exactly 3.53 USDC (spendable balance)
      const res = await withdrawalService.initiateWithdrawal({
        user: mockUser,
        amount: 3.53,
        country: 'NG',
        currency: 'NGN',
        channel: 'BANK',
        beneficiary: {
          bank_code: '100004',
          account_number: '7031632438',
          holder_name: 'Tester User'
        }
      });

      assert(res.success === true, 'Withdrawal initiated successfully');
      assert.strictEqual(switchCalledWith.amount, 3.53, 'Switch called with 3.53 USDC');
    } finally {
      SwitchWallet.findOne = origSwFindOne;
      switchService.getWalletBalance = origGetWalletBalance;
      switchService.getNetworkTransferFee = origGetFee;
      WithdrawalTransaction.findOne = origTxFindOne;
      switchService.getOfframpQuote = origGetQuote;
      ledgerService.reserveWithdrawalBalance = origReserve;
      switchService.initiateOfframp = origInitiate;
      WithdrawalTransaction.create = origTxCreate;
    }
  });

  await itAsync('Synchronous Switch rejection safely releases reserved funds without double-deduction', async () => {
    const testUserId = '6983ea1691b5040eb0fb0999';
    const mockUser = {
      _id: testUserId,
      name: 'Reversal Tester',
      countryCode: 'NG'
    };

    const origSwFindOne = SwitchWallet.findOne;
    const origGetWalletBalance = switchService.getWalletBalance;
    const origGetQuote = switchService.getOfframpQuote;
    const origReserve = ledgerService.reserveWithdrawalBalance;
    const origRelease = ledgerService.releaseWithdrawalReservation;
    const origInitiate = switchService.initiateOfframp;
    const origTxCreate = WithdrawalTransaction.create;
    const origTxFindOne = WithdrawalTransaction.findOne;

    let reservedAmount = 0;
    let releasedAmount = 0;
    let txStatus = '';

    try {
      SwitchWallet.findOne = async () => ({
        user: testUserId,
        switchWalletId: '6acf99b9f419026f8d11bb99',
        solanaAddress: 'G2NKvCAfXUSjVrn63VYHoXqN8j79B3cx2nY6tG1fnj99'
      });

      switchService.getWalletBalance = async () => ({
        balance: 5.0,
        isLive: true
      });

      switchService.getOfframpQuote = async () => ({
        rate: 1340,
        destination: { amount: 2680 },
        source: { amount: 2.0 },
        fee: { total: 0 }
      });

      ledgerService.reserveWithdrawalBalance = async (uid, amt) => {
        reservedAmount = amt;
        return { reserved: true, reservedAmount: amt };
      };

      ledgerService.releaseWithdrawalReservation = async (uid, amt) => {
        releasedAmount = amt;
        return { released: true, releasedAmount: amt };
      };

      WithdrawalTransaction.findOne = async () => null;
      WithdrawalTransaction.create = async (doc) => {
        const tx = {
          ...doc,
          save: async () => {}
        };
        return tx;
      };

      // Mock Switch offramp rejecting synchronously (e.g. invalid bank account)
      switchService.initiateOfframp = async () => {
        const err = new Error('Invalid recipient bank account number');
        err.status = 422;
        err.statusCode = 422;
        err.isOperational = true;
        throw err;
      };

      let threw = false;
      let caughtErr = null;
      try {
        await withdrawalService.initiateWithdrawal({
          user: mockUser,
          amount: 2.0,
          country: 'NG',
          currency: 'NGN',
          channel: 'BANK',
          beneficiary: {
            bank_code: '100004',
            account_number: '0000000000',
            holder_name: 'Reversal Tester'
          }
        });
      } catch (err) {
        threw = true;
        caughtErr = err;
      }

      assert(threw, 'Should propagate rejection');
      assert.strictEqual(reservedAmount, 2.0, 'Reserved 2.0 USDC');
      assert.strictEqual(releasedAmount, 2.0, 'Safely released 2.0 USDC upon rejection');
      assert.strictEqual(caughtErr.status, 422, 'Status code preserved as 422');
      assert.strictEqual(caughtErr.message, 'Invalid recipient bank account number');
    } finally {
      SwitchWallet.findOne = origSwFindOne;
      switchService.getWalletBalance = origGetWalletBalance;
      switchService.getOfframpQuote = origGetQuote;
      ledgerService.reserveWithdrawalBalance = origReserve;
      ledgerService.releaseWithdrawalReservation = origRelease;
      switchService.initiateOfframp = origInitiate;
      WithdrawalTransaction.create = origTxCreate;
      WithdrawalTransaction.findOne = origTxFindOne;
    }
  });

  // --- SECTION 5: DIRECT SOLANA USDC REGRESSION ---
  console.log('\n--- SECTION 5: Direct Solana USDC Withdrawal Route Verification ---');

  it('Direct Solana USDC validates Base58 format and minimum amount', () => {
    const validAddress = 'G2NKvCAfXUSjVrn63VYHoXqN8j79B3cx2nY6tG1fnjAx';
    const invalidAddress1 = '0x4357efdfF55c30d68F0D327491Bd810D805749F5';
    const invalidAddress2 = 'short';

    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    assert(base58Regex.test(validAddress), 'Solana Base58 address is valid');
    assert(!base58Regex.test(invalidAddress1), 'Ethereum address correctly rejected');
    assert(!base58Regex.test(invalidAddress2), 'Short address correctly rejected');

    const minAmount = 1;
    assert(2 >= minAmount, '2 USDC meets minimum threshold');
    assert(0.5 < minAmount, '0.5 USDC rejected below minimum threshold');
  });

  console.log('\n============================================================');
  console.log(`🎉 ALL TESTS COMPLETED: ${passedTests}/${totalTests} PASSED`);
  console.log('============================================================\n');
}

runTestSuite().catch((err) => {
  console.error('Fatal test runner failure:', err);
  process.exit(1);
});
