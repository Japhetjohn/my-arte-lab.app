/**
 * @file execute-live-withdrawal.js
 * @description Triggers the live bank off-ramp withdrawal of 3.53 USDC for japhetjohnk@gmail.com
 * to OPay account 7031632438 (JOHN KUULSINIM JAPHET).
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');
const SwitchWallet = require('../src/models/SwitchWallet');
const WithdrawalTransaction = require('../src/models/WithdrawalTransaction');
const withdrawalService = require('../src/services/withdrawalService');
const switchService = require('../src/services/switchService');

async function main() {
  console.log('====================================================');
  console.log('🚀 INITIATING LIVE SWITCH SOLANA USDC BANK WITHDRAWAL');
  console.log('====================================================');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const user = await User.findOne({ email: 'japhetjohnk@gmail.com' });
  if (!user) {
    throw new Error('User japhetjohnk@gmail.com not found');
  }

  const switchWallet = await SwitchWallet.findOne({ user: user._id });
  console.log(`👤 User: ${user.name || user.email} (${user._id})`);
  console.log(`💼 DB Balance: ${user.balance} USDC | Pending: ${user.pendingWithdrawal || 0} USDC`);
  console.log(`🏦 Switch Wallet: ${switchWallet?.switchWalletId}`);

  const liveBal = await switchService.getWalletBalance(switchWallet.switchWalletId);
  const solanaEntry = liveBal?.breakdown?.find(b => b.id === 'solana:usdc');
  console.log(`⛓️  Switch On-Chain Solana USDC Balance: ${solanaEntry?.balance || 0}`);

  const withdrawalAmount = 3.53;
  const idempotencyKey = `live-wd-${Date.now()}`;

  const payload = {
    user,
    amount: withdrawalAmount,
    country: 'NG',
    currency: 'NGN',
    channel: 'BANK',
    beneficiary: {
      holderType: 'INDIVIDUAL',
      holderName: 'JOHN KUULSINIM JAPHET',
      accountName: 'JOHN KUULSINIM JAPHET',
      accountNumber: '7031632438',
      bankCode: '100004',
      bankName: 'OPay'
    },
    idempotencyKey,
    narration: 'MyArteLab Payout',
    reason: 'SERVICE_CHARGES'
  };

  console.log('\n--- Payload Verification ---');
  console.log({
    amount: payload.amount,
    currency: payload.currency,
    country: payload.country,
    channel: payload.channel,
    beneficiary: payload.beneficiary,
    idempotencyKey
  });

  console.log('\nExecuting withdrawalService.initiateWithdrawal...');
  const result = await withdrawalService.initiateWithdrawal(payload);

  console.log('\n--- Withdrawal Initiation Result ---');
  console.log(JSON.stringify(result, null, 2));

  // Inspect the persisted record
  const txRecord = await WithdrawalTransaction.findOne({ idempotencyKey });
  console.log('\n--- Persisted Withdrawal Record ---');
  console.log({
    id: txRecord?._id,
    reference: txRecord?.reference,
    status: txRecord?.status,
    switchStatus: txRecord?.switchStatus,
    amountUsdc: txRecord?.amountUsdc,
    destinationAmount: txRecord?.destinationAmount,
    destinationCurrency: txRecord?.destinationCurrency,
    sourceAsset: txRecord?.sourceAsset,
    sourceNetwork: txRecord?.sourceNetwork,
    fundingTransferResult: txRecord?.metadata?.transferResult,
    confirmPaymentResult: txRecord?.metadata?.confirmPaymentResult,
    failureReason: txRecord?.failureReason
  });

  // Verify updated user balance
  const updatedUser = await User.findById(user._id);
  console.log('\n--- Updated User Balance ---');
  console.log({
    balance: updatedUser.balance,
    pendingWithdrawal: updatedUser.pendingWithdrawal
  });

  await mongoose.disconnect();
  console.log('\n✅ Execution finished cleanly.');
}

main().catch(err => {
  console.error('\n❌ Withdrawal Execution Failed:', err);
  process.exit(1);
});
