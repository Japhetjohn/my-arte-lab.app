/**
 * Switch Live Wallet Migration Script
 * 
 * Migrates and provisions genuine Switch non-custodial multi-chain wallets
 * for every registered user in MyArteLab on the production Switch API.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const SwitchWallet = require('../src/models/SwitchWallet');
const switchService = require('../src/services/switchService');
const walletEncryption = require('../src/services/walletEncryption');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function migrateWallets() {
  console.log('================================================================');
  console.log('       SWITCH LIVE WALLET MIGRATION FOR ALL USERS');
  console.log('================================================================');
  console.log(`Timestamp: ${new Date().toISOString()}`);

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/myartelab';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB successfully.\n');

  // Verify Switch API connectivity on production
  console.log('Verifying Switch production connection...');
  const connTest = await switchService.testConnection();
  if (!connTest.success) {
    console.error('FATAL: Cannot connect to Switch API:', connTest.error);
    process.exit(1);
  }
  console.log('Switch API connected. Assets count:', connTest.assetsCount);

  const users = await User.find({}).sort({ createdAt: 1 });
  console.log(`Found ${users.length} total users to inspect for Switch live wallet migration.\n`);

  let createdCount = 0;
  let alreadyLiveCount = 0;
  let errorCount = 0;

  const callbackUrl = process.env.SWITCH_CALLBACK_URL || 'https://app.myartelab.com/webhooks';

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const userDisplay = user.email || user.name || user._id.toString();
    const progress = `[${i + 1}/${users.length}]`;

    try {
      // Check existing wallet
      const existingWallet = await SwitchWallet.findOne({ user: user._id });

      // Determine if existing wallet is already a genuine live wallet
      // Simulated sandbox wallets used deterministic 24-char sha256 slice or had specific simulation patterns
      const isSimulated = existingWallet && (
        !existingWallet.addresses?.SOLANA ||
        existingWallet.addresses.SOLANA === process.env.PLATFORM_WALLET_ADDRESS ||
        existingWallet.solanaAddress === process.env.PLATFORM_WALLET_ADDRESS
      );

      if (existingWallet && !isSimulated && existingWallet.status === 'active' && existingWallet.addresses?.SOLANA) {
        console.log(`${progress} User ${userDisplay} already has live Switch wallet: ${existingWallet.solanaAddress}`);
        alreadyLiveCount++;
        continue;
      }

      // Prepare clean name for Switch wallet
      let rawName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email?.split('@')[0] || `User${user._id.toString().slice(-6)}`;
      let cleanName = rawName.replace(/[^a-zA-Z0-9]/g, '');
      if (!/[a-zA-Z]/.test(cleanName)) {
        cleanName = `User${cleanName || user._id.toString().slice(-6)}`;
      }

      console.log(`${progress} Creating live Switch wallet for ${userDisplay} (Name: ${cleanName})...`);

      // Call Switch API with retry for rate limits
      let switchData = null;
      let retries = 3;
      while (retries > 0) {
        try {
          switchData = await switchService.createWallet({
            name: cleanName,
            callbackUrl
          });
          break;
        } catch (callErr) {
          if (callErr.status === 429 && retries > 1) {
            console.warn(`   Rate limited by Switch. Backing off 3s...`);
            await sleep(3000);
            retries--;
          } else {
            throw callErr;
          }
        }
      }

      if (!switchData || !switchData.id) {
        throw new Error('Switch returned invalid wallet response');
      }

      const addresses = switchData.address || {};
      const solanaAddress = addresses.SOLANA || '';
      const evmAddress = addresses.BASE || addresses.ETHEREUM || '';

      // Encrypt private key
      let encryptedKey = null;
      if (switchData.private_key) {
        try {
          encryptedKey = walletEncryption.encryptPrivateKey(switchData.private_key);
        } catch (encErr) {
          console.warn(`   Warning: Could not encrypt private key: ${encErr.message}`);
        }
      }

      // Upsert SwitchWallet record in DB
      await SwitchWallet.findOneAndUpdate(
        { user: user._id },
        {
          user: user._id,
          switchWalletId: switchData.id,
          name: switchData.name || cleanName,
          solanaAddress,
          evmAddress,
          addresses,
          encryptedPrivateKey: encryptedKey,
          status: 'active',
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );

      console.log(`   ✅ Success! Switch ID: ${switchData.id} | Solana: ${solanaAddress}`);
      createdCount++;

      // Small throttle to avoid hitting Switch rate limits
      await sleep(250);

    } catch (err) {
      console.error(`   ❌ Failed for ${userDisplay}: ${err.message}`);
      errorCount++;
    }
  }

  console.log('\n================================================================');
  console.log('       MIGRATION SUMMARY');
  console.log('================================================================');
  console.log(`Total Users Processed:  ${users.length}`);
  console.log(`New Wallets Created:    ${createdCount}`);
  console.log(`Already Live:           ${alreadyLiveCount}`);
  console.log(`Failed / Errors:        ${errorCount}`);
  console.log('================================================================');

  await mongoose.disconnect();
}

migrateWallets().catch(err => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
