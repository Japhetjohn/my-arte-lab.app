const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const fs = require('fs');
const mongoose = require('mongoose');
const switchService = require('../src/services/switchService');
const withdrawalService = require('../src/services/withdrawalService');
const WithdrawalTransaction = require('../src/models/WithdrawalTransaction');
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

async function runPhase6CTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING PHASE 6C FRONTEND & E2E INTEGRATION SUITE');
  console.log('====================================================\n');

  // --- SECTION 1: FRONTEND ASSETS & BUNDLE INTEGRITY ---
  console.log('--- SECTION 1: FRONTEND BUILD & ARTIFACT INTEGRITY ---');

  const distPath = path.resolve(__dirname, '../frontend/app/dist');
  assert(fs.existsSync(distPath), 'Frontend production dist/ directory exists');

  const indexHtml = fs.readFileSync(path.join(distPath, 'index.html'), 'utf-8');
  assert(indexHtml.includes('<div id="root"></div>') || indexHtml.includes('app'), 'index.html entrypoint is present');

  const assetsDir = path.join(distPath, 'assets');
  assert(fs.existsSync(assetsDir), 'dist/assets directory exists');

  const assetFiles = fs.readdirSync(assetsDir);
  const jsBundles = assetFiles.filter(f => f.endsWith('.js'));
  const cssBundles = assetFiles.filter(f => f.endsWith('.css'));
  assert(jsBundles.length > 0, `Generated JS bundle(s) found: ${jsBundles.join(', ')}`);
  assert(cssBundles.length > 0, `Generated CSS bundle(s) found: ${cssBundles.join(', ')}`);

  // Verify bundle contains withdrawal modal code
  const mainJsContent = fs.readFileSync(path.join(assetsDir, jsBundles[0]), 'utf-8');
  assert(mainJsContent.includes('Withdrawal') || mainJsContent.includes('withdraw'), 'Production JS bundle contains compiled withdrawal logic');

  // --- SECTION 2: FRONTEND CODEBASE COMPLIANCE CHECKS ---
  console.log('\n--- SECTION 2: FRONTEND CODEBASE COMPLIANCE CHECKS ---');

  const withdrawModalFile = fs.readFileSync(path.resolve(__dirname, '../frontend/app/src/components/wallet/WithdrawModal.tsx'), 'utf-8');
  const walletCardFile = fs.readFileSync(path.resolve(__dirname, '../frontend/app/src/components/shared/WalletCard.tsx'), 'utf-8');
  const walletPageFile = fs.readFileSync(path.resolve(__dirname, '../frontend/app/src/pages/Wallet.tsx'), 'utf-8');
  const apiFile = fs.readFileSync(path.resolve(__dirname, '../frontend/app/src/lib/api.ts'), 'utf-8');

  // Check 1: Dynamic multi-corridor support (not Nigeria-only)
  assert(withdrawModalFile.includes('getWithdrawOptions'), 'WithdrawModal fetches dynamic corridors from /withdraw/options');
  assert(withdrawModalFile.includes('BANK') && withdrawModalFile.includes('MOBILEMONEY'), 'WithdrawModal supports both BANK and MOBILEMONEY payout rails');

  // Check 2: No display of internal 1% developer fee line in UI
  assert(!withdrawModalFile.includes('1% developer fee') && !withdrawModalFile.includes('Developer fee'), 'WithdrawModal does NOT display internal 1% developer fee line');

  // Check 3: Clear balance reservation banner
  assert(walletCardFile.includes('is currently reserved for a pending withdrawal'), 'WalletCard displays pending withdrawal reservation banner');
  assert(walletCardFile.includes('availableBalance') && walletCardFile.includes('pendingWithdrawal'), 'WalletCard receives availableBalance and pendingWithdrawal');

  // Check 4: Explicit USDC labeling (no bare $ for non-USD)
  assert(walletCardFile.includes('USDC'), 'WalletCard explicitly labels balances with USDC');

  // Check 5: Withdrawal endpoints in frontend API client
  assert(apiFile.includes('getWithdrawOptions') && apiFile.includes('getWithdrawQuote') && apiFile.includes('initiateWithdrawal'), 'walletService in api.ts has full suite of withdrawal endpoints');

  // --- SECTION 3: BACKEND API ENDPOINT CONTRACT VALIDATION ---
  console.log('\n--- SECTION 3: BACKEND API & SWITCH OFF-RAMP VALIDATION ---');

  // Optional DB connection
  try {
    if (mongoose.connection.readyState === 0) {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/myartelab';
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
      console.log('✅ Connected to MongoDB');
    }
  } catch (dbErr) {
    console.log('ℹ️ Local MongoDB daemon offline (running standalone Switch API & bundle checks)');
  }

  // Verify off-ramp coverage is available from Switch sandbox
  const offrampCoverage = await switchService.getCoverage('OFFRAMP');
  assert(offrampCoverage && Array.isArray(offrampCoverage.corridors), 'Switch off-ramp coverage returned corridors');
  assert(offrampCoverage.corridors.length > 0, `Found ${offrampCoverage.corridors.length} active Switch off-ramp corridor(s)`);

  const hasNG = offrampCoverage.corridors.some(c => c.country === 'NG');
  assert(hasNG, 'Off-ramp corridors include Nigeria (NG)');

  // Verify institution lookup for NG
  const ngInstitutions = await switchService.getInstitutions({ country: 'NG' });
  assert(Array.isArray(ngInstitutions) && ngInstitutions.length > 0, `Fetched ${ngInstitutions.length} banks for NG`);

  // Verify quote generation for 10 USDC
  const quote = await switchService.getOfframpQuote({
    amount: 10,
    country: 'NG',
    currency: 'NGN',
    channel: 'BANK'
  });
  assert(quote && quote.rate > 0, `Off-ramp quote successful: 1 USDC = ${quote.rate} NGN`);
  assert(quote.destination && quote.destination.amount > 0, `Destination payout calculated: ${quote.destination.amount} NGN`);

  console.log('\n====================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} PHASE 6C CHECKS PASSED SUCCESSFULLY!`);
  console.log('====================================================\n');
}

runPhase6CTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error running Phase 6C suite:', err);
    process.exit(1);
  });
