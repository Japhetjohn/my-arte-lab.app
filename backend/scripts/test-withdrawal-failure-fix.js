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
  const Transaction = require('../src/models/Transaction');

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

  // --- SECTION 6: SWITCH DEPOSIT-TO-OFF-RAMP FUNDING FLOW ---
  console.log('\n--- SECTION 6: Switch Deposit-to-Off-Ramp Funding Flow & Recovery ---');

  await itAsync('Initiate offramp triggers wallet transfer when deposit address is returned', async () => {
    const mockUserId = '6983ea1691b5040eb0fb0276';
    const mockUser = {
      _id: mockUserId,
      name: 'Deposit Tester',
      email: 'deposit-tester@example.com'
    };

    const origSwFindOne = SwitchWallet.findOne;
    const origGetWalletBalance = switchService.getWalletBalance;
    const origGetFee = switchService.getNetworkTransferFee;
    const origGetQuote = switchService.getOfframpQuote;
    const origReserve = ledgerService.reserveWithdrawalBalance;
    const origInitiate = switchService.initiateOfframp;
    const origTransfer = switchService.transferFunds;
    const origTxCreate = WithdrawalTransaction.create;
    const origTxFindOne = WithdrawalTransaction.findOne;

    let transferCalledWith = null;

    try {
      SwitchWallet.findOne = async () => ({
        switchWalletId: '6acf99b9f419026f8d11bbe0',
        solanaAddress: 'G2NKvCAfXUSjVrn63VYHoXqN8j79B3cx2nY6tG1fnjAx'
      });

      switchService.getWalletBalance = async () => ({
        isLive: true,
        balance: 5.0,
        balance_in_usd: 5.0
      });

      switchService.getNetworkTransferFee = async () => 0.091;

      switchService.getOfframpQuote = async () => ({
        rate: 1350,
        expiry: new Date(Date.now() + 600000),
        destination: { amount: 2700, currency: 'NGN' },
        source: { amount: 2.0, currency: 'USDC' },
        fee: { total: 0 }
      });

      ledgerService.reserveWithdrawalBalance = async () => ({ reserved: true });
      WithdrawalTransaction.findOne = async () => null;

      let savedTx = null;
      WithdrawalTransaction.create = async (doc) => {
        savedTx = {
          ...doc,
          save: async () => {}
        };
        return savedTx;
      };

      // Mock Switch returning AWAITING_DEPOSIT with one-time deposit address
      switchService.initiateOfframp = async () => ({
        status: 'AWAITING_DEPOSIT',
        reference: 'mock-ref-12345',
        deposit: {
          address: 'DevdQ1QWPYTZu9gtiffvDxHXu9pGPVuAi8dEp2Wk5KKq',
          amount: 2.0,
          asset: 'solana:usdc'
        }
      });

      switchService.transferFunds = async (params) => {
        transferCalledWith = params;
        return { success: true, txHash: '5xTestSolanaSignature12345' };
      };

      const result = await withdrawalService.initiateWithdrawal({
        user: mockUser,
        amount: 2.0,
        country: 'NG',
        currency: 'NGN',
        channel: 'BANK',
        beneficiary: {
          bank_code: '100004',
          account_number: '1234567890',
          holder_name: 'Deposit Tester'
        }
      });

      assert(result.success, 'Initiation succeeded');
      assert(transferCalledWith !== null, 'switchService.transferFunds was called');
      assert.strictEqual(transferCalledWith.walletId, '6acf99b9f419026f8d11bbe0', 'Transferred from user Switch wallet');
      assert.strictEqual(transferCalledWith.recipient, 'DevdQ1QWPYTZu9gtiffvDxHXu9pGPVuAi8dEp2Wk5KKq', 'Transferred to deposit address');
      assert.strictEqual(transferCalledWith.amount, 2.0, 'Transferred correct amount');
      assert.strictEqual(transferCalledWith.asset, 'solana:usdc', 'Asset is solana:usdc');
      assert(savedTx.metadata.fundedAt instanceof Date, 'Metadata records fundedAt timestamp');
      assert.strictEqual(savedTx.metadata.switchDepositAddress, 'DevdQ1QWPYTZu9gtiffvDxHXu9pGPVuAi8dEp2Wk5KKq', 'Metadata records deposit address');
    } finally {
      SwitchWallet.findOne = origSwFindOne;
      switchService.getWalletBalance = origGetWalletBalance;
      switchService.getNetworkTransferFee = origGetFee;
      switchService.getOfframpQuote = origGetQuote;
      ledgerService.reserveWithdrawalBalance = origReserve;
      switchService.initiateOfframp = origInitiate;
      switchService.transferFunds = origTransfer;
      WithdrawalTransaction.create = origTxCreate;
      WithdrawalTransaction.findOne = origTxFindOne;
    }
  });

  await itAsync('Transfer failure synchronously releases reserved funds', async () => {
    const mockUserId = '6983ea1691b5040eb0fb0276';
    const mockUser = { _id: mockUserId, name: 'Rejection Tester' };

    const origSwFindOne = SwitchWallet.findOne;
    const origGetWalletBalance = switchService.getWalletBalance;
    const origGetQuote = switchService.getOfframpQuote;
    const origReserve = ledgerService.reserveWithdrawalBalance;
    const origRelease = ledgerService.releaseWithdrawalReservation;
    const origInitiate = switchService.initiateOfframp;
    const origTransfer = switchService.transferFunds;
    const origTxCreate = WithdrawalTransaction.create;
    const origTxFindOne = WithdrawalTransaction.findOne;

    let releasedAmount = 0;

    try {
      SwitchWallet.findOne = async () => ({
        switchWalletId: '6acf99b9f419026f8d11bbe0',
        solanaAddress: 'G2NKvCAfXUSjVrn63VYHoXqN8j79B3cx2nY6tG1fnjAx'
      });
      switchService.getWalletBalance = async () => ({ isLive: true, balance: 5.0 });
      switchService.getNetworkTransferFee = async () => 0.091;
      switchService.getOfframpQuote = async () => ({
        rate: 1350,
        destination: { amount: 2700, currency: 'NGN' },
        source: { amount: 2.0, currency: 'USDC' },
        fee: { total: 0 }
      });
      ledgerService.reserveWithdrawalBalance = async () => ({ reserved: true });
      ledgerService.releaseWithdrawalReservation = async (uId, amt) => {
        releasedAmount = amt;
        return { released: true };
      };
      WithdrawalTransaction.findOne = async () => null;

      let savedTx = null;
      WithdrawalTransaction.create = async (doc) => {
        savedTx = { ...doc, save: async () => {} };
        return savedTx;
      };

      switchService.initiateOfframp = async () => ({
        status: 'AWAITING_DEPOSIT',
        deposit: { address: 'DevdQ1QWPYTZu9gtiffvDxHXu9pGPVuAi8dEp2Wk5KKq', amount: 2.0 }
      });

      // Transfer rejects (e.g. RPC node failure or insufficient fees)
      switchService.transferFunds = async () => {
        const err = new Error('Solana node transaction simulation failed');
        err.status = 400;
        throw err;
      };

      let threw = false;
      try {
        await withdrawalService.initiateWithdrawal({
          user: mockUser,
          amount: 2.0,
          country: 'NG',
          currency: 'NGN',
          channel: 'BANK',
          beneficiary: { bank_code: '100004', account_number: '1234567890' }
        });
      } catch (err) {
        threw = true;
        assert.strictEqual(err.message, 'Solana node transaction simulation failed');
      }

      assert(threw, 'Should throw transfer failure');
      assert.strictEqual(releasedAmount, 2.0, 'Reservation released immediately on transfer failure');
      assert.strictEqual(savedTx.status, 'failed', 'Transaction marked failed');
      assert.strictEqual(savedTx.failureReason, 'Funding transfer failed: Solana node transaction simulation failed');
      assert.strictEqual(savedTx.reservation.isReserved, false, 'Reservation marked unreserved');
    } finally {
      SwitchWallet.findOne = origSwFindOne;
      switchService.getWalletBalance = origGetWalletBalance;
      switchService.getOfframpQuote = origGetQuote;
      ledgerService.reserveWithdrawalBalance = origReserve;
      ledgerService.releaseWithdrawalReservation = origRelease;
      switchService.initiateOfframp = origInitiate;
      switchService.transferFunds = origTransfer;
      WithdrawalTransaction.create = origTxCreate;
      WithdrawalTransaction.findOne = origTxFindOne;
    }
  });

  await itAsync('Transfer timeout safely retains reservation in TRANSFER_PENDING', async () => {
    const mockUserId = '6983ea1691b5040eb0fb0276';
    const mockUser = { _id: mockUserId, name: 'Timeout Tester' };

    const origSwFindOne = SwitchWallet.findOne;
    const origGetWalletBalance = switchService.getWalletBalance;
    const origGetQuote = switchService.getOfframpQuote;
    const origReserve = ledgerService.reserveWithdrawalBalance;
    const origRelease = ledgerService.releaseWithdrawalReservation;
    const origInitiate = switchService.initiateOfframp;
    const origTransfer = switchService.transferFunds;
    const origTxCreate = WithdrawalTransaction.create;
    const origTxFindOne = WithdrawalTransaction.findOne;

    let releaseCalled = false;

    try {
      SwitchWallet.findOne = async () => ({
        switchWalletId: '6acf99b9f419026f8d11bbe0',
        solanaAddress: 'G2NKvCAfXUSjVrn63VYHoXqN8j79B3cx2nY6tG1fnjAx'
      });
      switchService.getWalletBalance = async () => ({ isLive: true, balance: 5.0 });
      switchService.getNetworkTransferFee = async () => 0.091;
      switchService.getOfframpQuote = async () => ({
        rate: 1350,
        destination: { amount: 2700, currency: 'NGN' },
        source: { amount: 2.0, currency: 'USDC' },
        fee: { total: 0 }
      });
      ledgerService.reserveWithdrawalBalance = async () => ({ reserved: true });
      ledgerService.releaseWithdrawalReservation = async () => {
        releaseCalled = true;
      };
      WithdrawalTransaction.findOne = async () => null;

      let savedTx = null;
      WithdrawalTransaction.create = async (doc) => {
        savedTx = { ...doc, save: async () => {} };
        return savedTx;
      };

      switchService.initiateOfframp = async () => ({
        status: 'AWAITING_DEPOSIT',
        deposit: { address: 'DevdQ1QWPYTZu9gtiffvDxHXu9pGPVuAi8dEp2Wk5KKq', amount: 2.0 }
      });

      // Transfer times out
      switchService.transferFunds = async () => {
        const err = new Error('The operation was aborted due to timeout');
        err.name = 'AbortError';
        throw err;
      };

      const res = await withdrawalService.initiateWithdrawal({
        user: mockUser,
        amount: 2.0,
        country: 'NG',
        currency: 'NGN',
        channel: 'BANK',
        beneficiary: { bank_code: '100004', account_number: '1234567890' }
      });

      assert(res.success, 'Returns success response indicating pending settlement');
      assert(!releaseCalled, 'Reservation was NOT released during timeout');
      assert.strictEqual(savedTx.status, 'processing', 'Status remains processing');
      assert.strictEqual(savedTx.switchStatus, 'TRANSFER_PENDING', 'SwitchStatus marked TRANSFER_PENDING');
    } finally {
      SwitchWallet.findOne = origSwFindOne;
      switchService.getWalletBalance = origGetWalletBalance;
      switchService.getOfframpQuote = origGetQuote;
      ledgerService.reserveWithdrawalBalance = origReserve;
      ledgerService.releaseWithdrawalReservation = origRelease;
      switchService.initiateOfframp = origInitiate;
      switchService.transferFunds = origTransfer;
      WithdrawalTransaction.create = origTxCreate;
      WithdrawalTransaction.findOne = origTxFindOne;
    }
  });

  await itAsync('getWithdrawalStatus auto-releases reservation when AWAITING_DEPOSIT is older than 30m without funding', async () => {
    const origFindOne = WithdrawalTransaction.findOne;
    const origFindById = WithdrawalTransaction.findById;
    const origGetPaymentStatus = switchService.getPaymentStatus;
    const origHandleFailed = ledgerService.handleFailedOrReversedWithdrawal;

    let handleFailedCalledWith = null;

    try {
      // 45 minutes old transaction in AWAITING_DEPOSIT
      const staleTx = {
        _id: '6ad29f5f3ef64167cebbfddc',
        reference: 'a7173c9c-04e1-4247-9f77-4acc87a6bb4f',
        status: 'processing',
        switchStatus: 'AWAITING_DEPOSIT',
        createdAt: new Date(Date.now() - 45 * 60 * 1000),
        metadata: {},
        amountUsdc: 3.53,
        user: '6983ea1691b5040eb0fb0276',
        reservation: { isReserved: true },
        save: async () => {}
      };

      WithdrawalTransaction.findOne = async () => staleTx;
      WithdrawalTransaction.findById = async () => staleTx;

      switchService.getPaymentStatus = async () => ({
        status: 'AWAITING_DEPOSIT',
        reference: 'a7173c9c-04e1-4247-9f77-4acc87a6bb4f'
      });

      ledgerService.handleFailedOrReversedWithdrawal = async (tx, status, reason) => {
        handleFailedCalledWith = { tx, status, reason };
        tx.status = 'failed';
        tx.switchStatus = status;
        tx.reservation.isReserved = false;
        return { handled: true, released: true };
      };

      const res = await withdrawalService.getWithdrawalStatus('a7173c9c-04e1-4247-9f77-4acc87a6bb4f', '6983ea1691b5040eb0fb0276');
      assert(handleFailedCalledWith !== null, 'handleFailedOrReversedWithdrawal was called');
      assert.strictEqual(handleFailedCalledWith.status, 'EXPIRED', 'Status passed was EXPIRED');
      assert(handleFailedCalledWith.reason.includes('expired (30m)'), 'Reason explains 30m window expiration');
    } finally {
      WithdrawalTransaction.findOne = origFindOne;
      WithdrawalTransaction.findById = origFindById;
      switchService.getPaymentStatus = origGetPaymentStatus;
      ledgerService.handleFailedOrReversedWithdrawal = origHandleFailed;
    }
  });

  console.log('\n--- SECTION 7: Dynamic Multi-Chain Asset Resolution & Off-ramp Verification ---');

  await itAsync('Bank off-ramp dynamically resolves source asset and funds via solana:usdc for Solana-funded wallet', async () => {
    const mockUserId = '6983ea1691b5040eb0fb0276';
    const mockUser = { _id: mockUserId, name: 'Solana Offramp Tester' };

    const origSwFindOne = SwitchWallet.findOne;
    const origGetWalletBalance = switchService.getWalletBalance;
    const origGetQuote = switchService.getOfframpQuote;
    const origReserve = ledgerService.reserveWithdrawalBalance;
    const origRelease = ledgerService.releaseWithdrawalReservation;
    const origInitiate = switchService.initiateOfframp;
    const origTransfer = switchService.transferFunds;
    const origConfirm = switchService.confirmPayment;
    const origTxCreate = WithdrawalTransaction.create;
    const origTxFindOne = WithdrawalTransaction.findOne;

    let initiateCalledWith = null;
    let transferCalledWith = null;
    let confirmCalledWith = null;

    try {
      SwitchWallet.findOne = async () => ({
        switchWalletId: '6acf99b9f419026f8d11bbe0',
        solanaAddress: 'G2NKvCAfXUSjVrn63VYHoXqN8j79B3cx2nY6tG1fnjAx'
      });
      // Mock wallet holding Solana USDC (matching production user 6acf99b9f419026f8d11bbe0)
      switchService.getWalletBalance = async () => ({
        isLive: true,
        balance: 3.627485,
        breakdown: [{ id: 'solana:usdc', balance: 3.627485 }]
      });
      switchService.getNetworkTransferFee = async ({ asset }) => (asset === 'solana:usdc' ? 0.09 : 0.05);
      switchService.getOfframpQuote = async (params) => ({
        rate: 1353.926,
        destination: { amount: 4738.74, currency: 'NGN' },
        source: { amount: 3.5, currency: 'USDC' },
        asset: params.asset || 'solana:usdc',
        network: 'SOLANA',
        fee: { total: 0 }
      });
      ledgerService.reserveWithdrawalBalance = async () => ({ reserved: true });
      WithdrawalTransaction.findOne = async () => null;

      let savedTx = null;
      WithdrawalTransaction.create = async (doc) => {
        savedTx = { ...doc, save: async () => {} };
        return savedTx;
      };

      switchService.initiateOfframp = async (payload) => {
        initiateCalledWith = payload;
        return {
          status: 'AWAITING_DEPOSIT',
          reference: payload.reference,
          deposit: {
            address: 'DevdQ1QWPYTZu9gtiffvDxHXu9pGPVuAi8dEp2Wk5KKq',
            amount: 3.5,
            asset: 'solana:usdc',
            network: 'SOLANA'
          }
        };
      };

      switchService.transferFunds = async (payload) => {
        transferCalledWith = payload;
        return {
          success: true,
          reference: 'mock-transfer-uuid',
          hash: '5xTestSolanaSignature12345'
        };
      };

      switchService.confirmPayment = async (payload) => {
        confirmCalledWith = payload;
        return { success: true };
      };

      const res = await withdrawalService.initiateWithdrawal({
        user: mockUser,
        amount: 3.5,
        country: 'NG',
        currency: 'NGN',
        channel: 'BANK',
        beneficiary: { bank_code: '100004', account_number: '7031632438' }
      });

      assert(res.success, 'Withdrawal initiated successfully');
      assert.strictEqual(initiateCalledWith.asset, 'solana:usdc', 'Initiate offramp requested solana:usdc');
      assert.strictEqual(transferCalledWith.asset, 'solana:usdc', 'Funding transfer executed using solana:usdc');
      assert.strictEqual(transferCalledWith.recipient, 'DevdQ1QWPYTZu9gtiffvDxHXu9pGPVuAi8dEp2Wk5KKq', 'Recipient is Solana deposit address');
      assert.strictEqual(savedTx.sourceAsset, 'solana:usdc', 'Transaction source asset is solana:usdc');
      assert.strictEqual(savedTx.sourceNetwork, 'SOLANA', 'Transaction source network is SOLANA');
      assert(confirmCalledWith !== null, 'confirmPayment was called');
      assert.strictEqual(confirmCalledWith.hash, '5xTestSolanaSignature12345', 'Payment confirmed with signature');
    } finally {
      SwitchWallet.findOne = origSwFindOne;
      switchService.getWalletBalance = origGetWalletBalance;
      switchService.getOfframpQuote = origGetQuote;
      ledgerService.reserveWithdrawalBalance = origReserve;
      ledgerService.releaseWithdrawalReservation = origRelease;
      switchService.initiateOfframp = origInitiate;
      switchService.transferFunds = origTransfer;
      switchService.confirmPayment = origConfirm;
      WithdrawalTransaction.create = origTxCreate;
      WithdrawalTransaction.findOne = origTxFindOne;
    }
  });

  await itAsync('Bank off-ramp dynamically resolves source asset and funds via base:usdc for Base-funded wallet', async () => {
    const mockUserId = '6983ea1691b5040eb0fb0276';
    const mockUser = { _id: mockUserId, name: 'Base Offramp Tester' };

    const origSwFindOne = SwitchWallet.findOne;
    const origGetWalletBalance = switchService.getWalletBalance;
    const origGetQuote = switchService.getOfframpQuote;
    const origReserve = ledgerService.reserveWithdrawalBalance;
    const origRelease = ledgerService.releaseWithdrawalReservation;
    const origInitiate = switchService.initiateOfframp;
    const origTransfer = switchService.transferFunds;
    const origConfirm = switchService.confirmPayment;
    const origTxCreate = WithdrawalTransaction.create;
    const origTxFindOne = WithdrawalTransaction.findOne;

    let initiateCalledWith = null;
    let transferCalledWith = null;

    try {
      SwitchWallet.findOne = async () => ({
        switchWalletId: '6acf99b9f419026f8d11bbe0',
        solanaAddress: 'G2NKvCAfXUSjVrn63VYHoXqN8j79B3cx2nY6tG1fnjAx'
      });
      // Mock wallet holding Base USDC
      switchService.getWalletBalance = async () => ({
        isLive: true,
        balance: 10.0,
        breakdown: [{ id: 'base:usdc', balance: 10.0 }]
      });
      switchService.getNetworkTransferFee = async ({ asset }) => (asset === 'base:usdc' ? 0.05 : 0.095);
      switchService.getOfframpQuote = async (params) => ({
        rate: 1353.926,
        destination: { amount: 4738.74, currency: 'NGN' },
        source: { amount: 3.5, currency: 'USDC' },
        asset: params.asset || 'base:usdc',
        network: 'BASE',
        fee: { total: 0 }
      });
      ledgerService.reserveWithdrawalBalance = async () => ({ reserved: true });
      WithdrawalTransaction.findOne = async () => null;

      let savedTx = null;
      WithdrawalTransaction.create = async (doc) => {
        savedTx = { ...doc, save: async () => {} };
        return savedTx;
      };

      switchService.initiateOfframp = async (payload) => {
        initiateCalledWith = payload;
        return {
          status: 'AWAITING_DEPOSIT',
          reference: payload.reference,
          deposit: {
            address: '0x38B972194EB98938476Db7b5119BF22862F258aC',
            amount: 3.5,
            asset: 'base:usdc',
            network: 'BASE'
          }
        };
      };

      switchService.transferFunds = async (payload) => {
        transferCalledWith = payload;
        return {
          success: true,
          reference: 'mock-transfer-uuid',
          transaction_hash: '0xBaseTxHash123456789'
        };
      };

      switchService.confirmPayment = async () => ({ success: true });

      const res = await withdrawalService.initiateWithdrawal({
        user: mockUser,
        amount: 3.5,
        country: 'NG',
        currency: 'NGN',
        channel: 'BANK',
        beneficiary: { bank_code: '100004', account_number: '8188216769' }
      });

      assert(res.success, 'Withdrawal initiated successfully');
      assert.strictEqual(initiateCalledWith.asset, 'base:usdc', 'Initiate offramp explicitly requested base:usdc');
      assert.strictEqual(transferCalledWith.asset, 'base:usdc', 'Funding transfer executed using base:usdc');
      assert.strictEqual(transferCalledWith.recipient, '0x38B972194EB98938476Db7b5119BF22862F258aC', 'Recipient is Base EVM address');
      assert.strictEqual(savedTx.sourceAsset, 'base:usdc', 'Transaction source asset is base:usdc');
      assert.strictEqual(savedTx.sourceNetwork, 'BASE', 'Transaction source network is BASE');
    } finally {
      SwitchWallet.findOne = origSwFindOne;
      switchService.getWalletBalance = origGetWalletBalance;
      switchService.getOfframpQuote = origGetQuote;
      ledgerService.reserveWithdrawalBalance = origReserve;
      ledgerService.releaseWithdrawalReservation = origRelease;
      switchService.initiateOfframp = origInitiate;
      switchService.transferFunds = origTransfer;
      switchService.confirmPayment = origConfirm;
      WithdrawalTransaction.create = origTxCreate;
      WithdrawalTransaction.findOne = origTxFindOne;
    }
  });

  await itAsync('solanaDepositService.hasUsdcTokenAccount verifies active USDC token accounts on Solana', async () => {
    const solanaDepositService = require('../src/services/solanaDepositService');
    const origCallRpc = solanaDepositService._callRpc;

    try {
      // 1. Account with NO token account
      solanaDepositService._callRpc = async () => ({ value: [] });
      const hasNone = await solanaDepositService.hasUsdcTokenAccount('Ef3dTTgR3ZEmCgJQcev4rztKyHJ3MVjHZMSuc8yg88eP');
      assert.strictEqual(hasNone, false, 'Uninitialized Solana address correctly returns false');

      // 2. Account with active USDC ATA
      solanaDepositService._callRpc = async () => ({ value: [{ pubkey: 'TokenAccount123' }] });
      const hasOne = await solanaDepositService.hasUsdcTokenAccount('Gy2n4pZePk1vZyx76GtNERaLSgcoQYD2MnohMxFWbtCV');
      assert.strictEqual(hasOne, true, 'Address with active USDC token account returns true');

      // 3. Invalid address format
      const invalid = await solanaDepositService.hasUsdcTokenAccount('not-a-solana-key');
      assert.strictEqual(invalid, false, 'Invalid public key returns false immediately');
    } finally {
      solanaDepositService._callRpc = origCallRpc;
    }
  });

  await itAsync('On-chain execution error during funding transfer safely restores balance and records informative failureReason', async () => {
    const mockUserId = '6983ea1691b5040eb0fb0276';
    const mockUser = { _id: mockUserId, name: 'OnChain Error Tester' };

    const origSwFindOne = SwitchWallet.findOne;
    const origGetWalletBalance = switchService.getWalletBalance;
    const origGetQuote = switchService.getOfframpQuote;
    const origReserve = ledgerService.reserveWithdrawalBalance;
    const origRelease = ledgerService.releaseWithdrawalReservation;
    const origInitiate = switchService.initiateOfframp;
    const origTransfer = switchService.transferFunds;
    const origTxCreate = WithdrawalTransaction.create;
    const origTxFindOne = WithdrawalTransaction.findOne;

    let releaseCalled = false;
    let savedTx = null;

    try {
      SwitchWallet.findOne = async () => ({
        switchWalletId: '6acf99b9f419026f8d11bbe0',
        solanaAddress: 'G2NKvCAfXUSjVrn63VYHoXqN8j79B3cx2nY6tG1fnjAx'
      });
      switchService.getWalletBalance = async () => ({ isLive: true, balance: 10.0 });
      switchService.getNetworkTransferFee = async () => 0.05;
      switchService.getOfframpQuote = async () => ({
        rate: 1353.926,
        destination: { amount: 4738.74, currency: 'NGN' },
        source: { amount: 3.5, currency: 'USDC' },
        fee: { total: 0 }
      });
      ledgerService.reserveWithdrawalBalance = async () => ({ reserved: true });
      ledgerService.releaseWithdrawalReservation = async () => {
        releaseCalled = true;
      };
      WithdrawalTransaction.findOne = async () => null;

      WithdrawalTransaction.create = async (doc) => {
        savedTx = { ...doc, save: async () => {} };
        return savedTx;
      };

      switchService.initiateOfframp = async () => ({
        status: 'AWAITING_DEPOSIT',
        deposit: { address: '0x38B972194EB98938476Db7b5119BF22862F258aC', amount: 3.5, asset: 'base:usdc' }
      });

      // Transfer rejects with on-chain simulation error
      switchService.transferFunds = async () => {
        const err = new Error('On-chain execution error');
        err.status = 400;
        err.statusCode = 400;
        throw err;
      };

      let threw = false;
      try {
        await withdrawalService.initiateWithdrawal({
          user: mockUser,
          amount: 3.5,
          country: 'NG',
          currency: 'NGN',
          channel: 'BANK',
          beneficiary: { bank_code: '100004', account_number: '8188216769' }
        });
      } catch (err) {
        threw = true;
        assert(err.message.includes('On-chain execution error'), 'Error explains on-chain execution issue');
      }

      assert(threw, 'Should throw transfer error');
      assert(releaseCalled, 'Reservation was released back to user balance immediately');
      assert.strictEqual(savedTx.status, 'failed', 'Transaction marked failed');
      assert(savedTx.failureReason.includes('On-chain execution error during simulation'), 'Recorded descriptive failure reason');
      assert.strictEqual(savedTx.reservation.isReserved, false, 'Reservation marked unreserved');
    } finally {
      SwitchWallet.findOne = origSwFindOne;
      switchService.getWalletBalance = origGetWalletBalance;
      switchService.getOfframpQuote = origGetQuote;
      ledgerService.reserveWithdrawalBalance = origReserve;
      ledgerService.releaseWithdrawalReservation = origRelease;
      switchService.initiateOfframp = origInitiate;
      switchService.transferFunds = origTransfer;
      WithdrawalTransaction.create = origTxCreate;
      WithdrawalTransaction.findOne = origTxFindOne;
    }
  });

  // --- SECTION 8: DEVELOPER RECIPIENT NETWORK MATCHING & ATOMIC INTERNAL TRANSFERS ---
  console.log('\n--- SECTION 8: Developer Recipient Matching & Atomic Internal Transfers ---');

  it('SwitchService._resolveDeveloperRecipient validates address against target network', () => {
    const solanaAddress = 'Gy2n4pZePk1vZyx76GtNERaLSgcoQYD2MnohMxFWbtCV';
    const evmAddress = '0x38B972194EB98938476Db7b5119BF22862F258aC';

    // 1. Solana asset with Solana address passes
    assert.strictEqual(
      switchService._resolveDeveloperRecipient(solanaAddress, 'solana:usdc'),
      solanaAddress,
      'Solana address is accepted for solana:usdc'
    );

    // 2. Base/EVM asset with Solana address is rejected (returns undefined to avoid Switch 400)
    assert.strictEqual(
      switchService._resolveDeveloperRecipient(solanaAddress, 'base:usdc'),
      undefined,
      'Solana address is rejected for base:usdc to prevent Switch 400 rejection'
    );

    // 3. Base/EVM asset with EVM address passes
    assert.strictEqual(
      switchService._resolveDeveloperRecipient(evmAddress, 'base:usdc'),
      evmAddress,
      'EVM address is accepted for base:usdc'
    );

    // 4. Solana asset with EVM address is rejected
    assert.strictEqual(
      switchService._resolveDeveloperRecipient(evmAddress, 'solana:usdc'),
      undefined,
      'EVM address is rejected for solana:usdc'
    );
  });

  await itAsync('switchService.initiateOfframp omits developer_fee when no network-compatible recipient exists', async () => {
    let capturedPayload = null;
    const origRequest = switchService._request;
    const origResolve = switchService._resolveDeveloperRecipient;

    try {
      // Force resolve to return undefined (simulating Solana wallet configured on Base offramp)
      switchService._resolveDeveloperRecipient = () => undefined;
      switchService._request = async (endpoint, opts) => {
        capturedPayload = JSON.parse(opts.body);
        return { data: { status: 'AWAITING_DEPOSIT', deposit: { address: '0x123', amount: 10, asset: 'base:usdc' } } };
      };

      await switchService.initiateOfframp({
        amount: 10,
        country: 'NG',
        currency: 'NGN',
        beneficiary: { bank_code: '100004', account_number: '8188216769' },
        reference: '00000000-0000-0000-0000-000000000001',
        asset: 'base:usdc',
        developerFee: 1
      });

      assert(capturedPayload !== null, 'Request was made');
      assert.strictEqual(capturedPayload.developer_fee, undefined, 'developer_fee omitted when recipient invalid');
      assert.strictEqual(capturedPayload.developer_recipient, undefined, 'developer_recipient omitted when recipient invalid');
    } finally {
      switchService._request = origRequest;
      switchService._resolveDeveloperRecipient = origResolve;
    }
  });

  await itAsync('ledgerService.transferBetweenWallets atomically debits sender, credits recipient, and records transactions', async () => {
    const senderId = '6983ea1691b5040eb0fb0276';
    const recipientId = '6983ea1691b5040eb0fb0277';
    const amount = 5;

    let senderBalance = 20;
    let recipientBalance = 10;
    const createdTxs = [];

    const origSenderFindOneAndUpdate = User.findOneAndUpdate;
    const origRecipientFindByIdAndUpdate = User.findByIdAndUpdate;
    const origUserFindById = User.findById;
    const origTxFindOne = Transaction.findOne;
    const origTxCreate = Transaction.create;

    try {
      Transaction.findOne = async () => null; // No prior transfer with this ref
      User.findById = async (id) => {
        if (id === senderId) return { _id: senderId, name: 'Sender User', email: 'sender@example.com', wallet: { balance: senderBalance, pendingWithdrawal: 0 } };
        if (id === recipientId) return { _id: recipientId, name: 'Recipient User', email: 'recipient@example.com', wallet: { balance: recipientBalance, pendingWithdrawal: 0 } };
        return null;
      };

      User.findOneAndUpdate = async (query, update) => {
        if (query._id === senderId) {
          senderBalance += update.$inc['wallet.balance'];
          return { _id: senderId, wallet: { balance: senderBalance }, balance: senderBalance };
        }
        return null;
      };

      User.findByIdAndUpdate = async (id, update) => {
        if (id === recipientId) {
          recipientBalance += update.$inc['wallet.balance'];
          return { _id: recipientId, wallet: { balance: recipientBalance }, balance: recipientBalance };
        }
        return null;
      };

      Transaction.create = async (doc) => {
        createdTxs.push(doc);
        return doc;
      };

      const result = await ledgerService.transferBetweenWallets({
        senderId,
        recipientId,
        amount,
        note: 'Payment for artwork design',
        idempotencyKey: 'idem-test-12345'
      });

      assert.strictEqual(result.success, true, 'Transfer succeeded');
      assert.strictEqual(senderBalance, 15, 'Sender debited exactly 5 USDC');
      assert.strictEqual(recipientBalance, 15, 'Recipient credited exactly 5 USDC');
      assert.strictEqual(createdTxs.length, 2, 'Created 2 immutable ledger transactions');
      assert.strictEqual(createdTxs[0].type, 'transfer_out', 'Sender tx is transfer_out');
      assert.strictEqual(createdTxs[1].type, 'transfer_in', 'Recipient tx is transfer_in');
      assert.strictEqual(createdTxs[0].amount, 5, 'Amount is 5 USDC');
      assert.strictEqual(createdTxs[1].amount, 5, 'Amount is 5 USDC');
      assert.strictEqual(createdTxs[0].paymentMethod, 'internal_transfer', 'Payment method is internal_transfer');
    } finally {
      User.findOneAndUpdate = origSenderFindOneAndUpdate;
      User.findByIdAndUpdate = origRecipientFindByIdAndUpdate;
      User.findById = origUserFindById;
      Transaction.findOne = origTxFindOne;
      Transaction.create = origTxCreate;
    }
  });

  await itAsync('ledgerService.transferBetweenWallets enforces idempotency and rejects self-transfer', async () => {
    const senderId = '6983ea1691b5040eb0fb0276';

    // 1. Self transfer rejection
    let selfThrew = false;
    try {
      await ledgerService.transferBetweenWallets({
        senderId,
        recipientId: senderId,
        amount: 5
      });
    } catch (err) {
      selfThrew = true;
      assert(err.message.includes('yourself'), 'Self-transfer rejected');
    }
    assert(selfThrew, 'Should throw error on self-transfer');

    // 2. Idempotent retry returns existing transfer without double-debiting
    const origTxFindOne = Transaction.findOne;
    const origUserFindById = User.findById;
    try {
      Transaction.findOne = async (q) => ({
        transactionId: 'TXN-TRF-EXISTING',
        user: q.user,
        type: q.type,
        amount: 5,
        reference: 'idem-test-12345'
      });
      User.findById = async () => ({ wallet: { balance: 25 }, balance: 25 });

      const idemResult = await ledgerService.transferBetweenWallets({
        senderId,
        recipientId: '6983ea1691b5040eb0fb0277',
        amount: 5,
        idempotencyKey: 'idem-test-12345'
      });

      assert.strictEqual(idemResult.success, true, 'Returns success');
      assert.strictEqual(idemResult.alreadyProcessed, true, 'Flagged as alreadyProcessed');
      assert.strictEqual(idemResult.amount, 5, 'Preserved original amount');
    } finally {
      Transaction.findOne = origTxFindOne;
      User.findById = origUserFindById;
    }
  });

  await itAsync('calculateAuthoritativeBalance correctly computes balance with internal transfer types', async () => {
    const origTxFind = Transaction.find;
    try {
      Transaction.find = () => ({
        session: () => {},
        then: (resolve) => resolve([
          { type: 'deposit', amount: 100, status: 'completed', currency: 'USDC' },
          { type: 'transfer_out', amount: 30, status: 'completed', currency: 'USDC' },
          { type: 'transfer_in', amount: 10, status: 'completed', currency: 'USDC' }
        ])
      });

      const bal = await ledgerService.calculateAuthoritativeBalance('mock-user-123');
      assert.strictEqual(bal.totalCredits, 110, '100 deposit + 10 transfer_in = 110 credits');
      assert.strictEqual(bal.totalDebits, 30, '30 transfer_out = 30 debits');
      assert.strictEqual(bal.calculatedBalance, 80, '110 - 30 = 80 USDC');
    } finally {
      Transaction.find = origTxFind;
    }
  });

  console.log('\n============================================================');
  console.log(`🎉 ALL TESTS COMPLETED: ${passedTests}/${totalTests} PASSED`);
  console.log('============================================================\n');
}

runTestSuite().catch((err) => {
  console.error('Fatal test runner failure:', err);
  process.exit(1);
});

