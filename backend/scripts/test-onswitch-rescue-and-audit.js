const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const crypto = require('crypto');
const mongoose = require('mongoose');

// Services and Models
const switchService = require('../src/services/switchService');
const solanaDepositService = require('../src/services/solanaDepositService');
const RescueTransaction = require('../src/models/RescueTransaction');
const SwitchWallet = require('../src/models/SwitchWallet');
const Notification = require('../src/models/Notification');
const User = require('../src/models/User');

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
  console.log('\n============================================================');
  console.log('🧪 MYARTELAB ON-SWITCH DOCUMENTATION AUDIT & RESCUE TEST SUITE');
  console.log('============================================================\n');

  // TEST SUITE 1: Supported Rescue Blockchains Enum & Address Formats
  console.log('--- SUITE 1: Supported Blockchains & Address Formats ---');
  
  const expectedChains = [
    'BASE', 'ETHEREUM', 'SOLANA', 'POLYGON', 'BSC',
    'ARBITRUM', 'OPTIMISM', 'AVALANCHE', 'MONAD', 'GNOSIS', 'PLASMA'
  ];
  
  assert(
    Array.isArray(switchService.constructor.SUPPORTED_RESCUE_CHAINS),
    'SwitchService defines SUPPORTED_RESCUE_CHAINS static array'
  );
  
  assert(
    switchService.constructor.SUPPORTED_RESCUE_CHAINS.length === 11,
    'Exactly 11 official OnSwitch rescue blockchains supported'
  );
  
  for (const chain of expectedChains) {
    assert(
      switchService.constructor.SUPPORTED_RESCUE_CHAINS.includes(chain),
      `Chain '${chain}' is included in SUPPORTED_RESCUE_CHAINS`
    );
  }

  // TEST SUITE 2: Input Validation for rescueToken()
  console.log('\n--- SUITE 2: switchService.rescueToken Input Validations ---');

  // Invalid wallet ID
  try {
    await switchService.rescueToken({
      walletId: 'invalid-id',
      blockchain: 'SOLANA',
      tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      recipient: 'G2NKvCAfXUSjVrn63VYHoXqN8j79B3cx2nY6tG1fnjAx'
    });
    assert(false, 'Should have thrown error on invalid wallet ID');
  } catch (err) {
    assert(err.message.includes('wallet ID format'), 'Rejects non-hex/invalid wallet ID');
  }

  // Unsupported blockchain
  try {
    await switchService.rescueToken({
      walletId: '6acf99b9f419026f8d11bbe0',
      blockchain: 'BITCOIN',
      tokenAddress: '0x123',
      recipient: '0x456'
    });
    assert(false, 'Should have thrown error on unsupported blockchain');
  } catch (err) {
    assert(err.message.includes('Unsupported blockchain'), 'Rejects unsupported blockchain BITCOIN');
  }

  // Invalid Solana address format (EVM passed into Solana)
  try {
    await switchService.rescueToken({
      walletId: '6acf99b9f419026f8d11bbe0',
      blockchain: 'SOLANA',
      tokenAddress: '0x4357efdfF55c30d68F0D327491Bd810D805749F5',
      recipient: 'G2NKvCAfXUSjVrn63VYHoXqN8j79B3cx2nY6tG1fnjAx'
    });
    assert(false, 'Should have thrown error on invalid Solana token address');
  } catch (err) {
    assert(err.message.includes('Solana token mint address format'), 'Rejects EVM address for Solana chain');
  }

  // Invalid EVM address format (Solana base58 passed into Base)
  try {
    await switchService.rescueToken({
      walletId: '6acf99b9f419026f8d11bbe0',
      blockchain: 'BASE',
      tokenAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      recipient: '0x4357efdfF55c30d68F0D327491Bd810D805749F5'
    });
    assert(false, 'Should have thrown error on invalid EVM token address');
  } catch (err) {
    assert(err.message.includes('token contract address format'), 'Rejects Base58 address for EVM Base chain');
  }

  // TEST SUITE 3: Official API Request Construction for POST /wallet/rescue
  console.log('\n--- SUITE 3: POST /wallet/rescue Request Construction ---');

  let interceptedRequest = null;
  const originalRequest = switchService._request;

  switchService._request = async (endpoint, options) => {
    interceptedRequest = { endpoint, options };
    return { success: true, message: 'Simulated Switch API response', data: { status: 'rescued' } };
  };

  try {
    const res = await switchService.rescueToken({
      walletId: '6acf99b9f419026f8d11bbe0',
      blockchain: 'BASE',
      tokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      recipient: '0x4357efdfF55c30d68F0D327491Bd810D805749F5'
    });

    assert(interceptedRequest !== null, 'Sent HTTP request to Switch API');
    assert(interceptedRequest.endpoint === '/wallet/rescue', 'Endpoint is strictly /wallet/rescue');
    assert(interceptedRequest.options.method === 'POST', 'HTTP method is POST');
    
    const parsedBody = JSON.parse(interceptedRequest.options.body);
    assert(parsedBody.wallet_id === '6acf99b9f419026f8d11bbe0', 'wallet_id properly mapped in snake_case');
    assert(parsedBody.blockchain === 'BASE', 'blockchain properly mapped in uppercase');
    assert(parsedBody.token_address === '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', 'token_address properly mapped');
    assert(parsedBody.recipient === '0x4357efdfF55c30d68F0D327491Bd810D805749F5', 'recipient properly mapped');
    assert(res.status === 'rescued' || res.success === true, 'Returns provider result');
  } finally {
    switchService._request = originalRequest;
  }

  // TEST SUITE 4: Fee Estimation and Transfer Funds Helpers
  console.log('\n--- SUITE 4: POST /wallet/fee & POST /wallet/transfer Contracts ---');

  switchService._request = async (endpoint, options) => {
    interceptedRequest = { endpoint, options };
    return { data: { simulated: true } };
  };

  try {
    await switchService.estimateWalletFee({
      walletId: '6acf99b9f419026f8d11bbe0',
      amount: 10,
      asset: 'solana:usdc'
    });
    assert(interceptedRequest.endpoint === '/wallet/fee', 'estimateWalletFee calls /wallet/fee');
    const feeBody = JSON.parse(interceptedRequest.options.body);
    assert(feeBody.wallet_id === '6acf99b9f419026f8d11bbe0', 'estimateWalletFee maps wallet_id');

    await switchService.transferFunds({
      walletId: '6acf99b9f419026f8d11bbe0',
      asset: 'solana:usdc',
      recipient: 'G2NKvCAfXUSjVrn63VYHoXqN8j79B3cx2nY6tG1fnjAx',
      fullBalance: true
    });
    assert(interceptedRequest.endpoint === '/wallet/transfer', 'transferFunds calls /wallet/transfer');
    const transferBody = JSON.parse(interceptedRequest.options.body);
    assert(transferBody.full_balance === true, 'transferFunds maps full_balance');
  } finally {
    switchService._request = originalRequest;
  }

  // TEST SUITE 5: Honest Provider Balance & Status Reporting
  console.log('\n--- SUITE 5: Honest Provider Balance & Reconciliation ---');

  // Mock live response
  switchService._request = async (endpoint) => {
    if (endpoint.includes('/balance')) {
      return {
        data: {
          balance: 142.50,
          balance_in_usd: 142.50,
          breakdown: [
            { id: 'solana:usdc', balance: 142.50, balance_in_usd: 142.50 }
          ]
        }
      };
    }
    return { data: {} };
  };

  try {
    const liveBalance = await switchService.getWalletBalance('6acf99b9f419026f8d11bbe0');
    assert(liveBalance.isLive === true, 'Reports isLive=true for genuine provider responses');
    assert(liveBalance.providerStatus === 'live', 'Reports providerStatus=live');
    assert(liveBalance.balance === 142.50, 'Preserves exact numeric on-chain balance');
    assert(liveBalance.breakdown.length === 1, 'Preserves token breakdown array');
  } finally {
    switchService._request = originalRequest;
  }

  // Mock sandbox unsupported / not found fallback
  switchService._request = async () => {
    const err = new Error('Wallet not supported for sandbox environment');
    err.status = 400;
    throw err;
  };

  try {
    const fallbackBalance = await switchService.getWalletBalance('6acf99b9f419026f8d11bbe0');
    assert(fallbackBalance.isLive === false, 'Reports isLive=false when provider returns unsupported');
    assert(fallbackBalance.providerStatus === 'sandbox_unsupported', 'Reports honest providerStatus without inventing fake money');
    assert(fallbackBalance.balance === 0, 'Honest 0 balance on fallback');
  } finally {
    switchService._request = originalRequest;
  }

  // TEST SUITE 6: Inbound Webhook Detection of Unsupported Tokens
  console.log('\n--- SUITE 6: Webhook Detection & User Notification for Unsupported Tokens ---');

  // Stub SwitchWallet and Notification in-memory
  const fakeUserId = new mongoose.Types.ObjectId();
  const fakeWallet = {
    user: fakeUserId,
    switchWalletId: '6acf99b9f419026f8d11bbe0',
    solanaAddress: 'G2NKvCAfXUSjVrn63VYHoXqN8j79B3cx2nY6tG1fnjAx',
    evmAddress: '0x4357efdfF55c30d68F0D327491Bd810D805749F5'
  };

  const origFindOne = SwitchWallet.findOne;
  SwitchWallet.findOne = async () => fakeWallet;

  let createdNotification = null;
  const origCreateNotification = Notification.createNotification;
  Notification.createNotification = async (data) => {
    createdNotification = data;
    return data;
  };

  try {
    // Simulate incoming receive webhook with an unsupported meme token on Solana
    const unsupportedWebhookPayload = {
      type: 'receive',
      data: {
        address: 'G2NKvCAfXUSjVrn63VYHoXqN8j79B3cx2nY6tG1fnjAx',
        hash: '5UxX41X...solana_tx_hash',
        amount: 5000000000,
        asset: 'solana:bonk',
        token: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        decimals: 5
      }
    };

    const webhookResult = await solanaDepositService.processSwitchWalletReceiveWebhook(unsupportedWebhookPayload);
    assert(webhookResult.handled === true, 'Unsupported token webhook is handled');
    assert(webhookResult.unsupportedToken === true, 'Marks result as unsupportedToken=true');
    assert(createdNotification !== null, 'Generates notification for the user');
    assert(createdNotification.type === 'unsupported_token_detected', 'Notification type is unsupported_token_detected');
    assert(createdNotification.message.includes('Token Rescue'), 'Notification informs user about Token Rescue tool');
    assert(createdNotification.metadata.asset === 'solana:bonk', 'Metadata tracks the asset identifier');
  } finally {
    SwitchWallet.findOne = origFindOne;
    Notification.createNotification = origCreateNotification;
  }

  // TEST SUITE 7: RescueTransaction Audit Model
  console.log('\n--- SUITE 7: RescueTransaction Schema & Safety Auditing ---');

  const sampleRescue = new RescueTransaction({
    user: new mongoose.Types.ObjectId(),
    walletId: '6acf99b9f419026f8d11bbe0',
    blockchain: 'SOLANA',
    tokenAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    recipient: '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',
    status: 'completed',
    providerResponse: { success: true },
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0 Test'
  });

  const validationError = sampleRescue.validateSync();
  assert(!validationError, 'RescueTransaction valid document passes schema validation');
  assert(sampleRescue.blockchain === 'SOLANA', 'Blockchain enum normalized to uppercase');
  assert(sampleRescue.status === 'completed', 'Status defaults / tracks completion');

  // Verify invalid blockchain schema rejection
  const invalidRescue = new RescueTransaction({
    user: new mongoose.Types.ObjectId(),
    walletId: '6acf99b9f419026f8d11bbe0',
    blockchain: 'DOGECOIN',
    tokenAddress: '123',
    recipient: '456'
  });
  const invalidError = invalidRescue.validateSync();
  assert(invalidError?.errors?.blockchain !== undefined, 'Rejects unlisted blockchains at database schema level');

  console.log('\n============================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log('============================================================\n');
}

runTestSuite().catch((err) => {
  console.error('\n❌ TEST SUITE FAILURE:', err);
  process.exit(1);
});
