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
      // Check existing wallet with .lean() for plain object access
      const existingWallet = await SwitchWallet.findOne({ user: user._id }).lean();

      // Check if wallet is already a valid genuine Switch wallet
      const hasSolana = existingWallet?.solanaAddress && existingWallet.solanaAddress !== process.env.PLATFORM_WALLET_ADDRESS;
      const isGenuineLive = existingWallet && 
        existingWallet.status === 'active' && 
        existingWallet.switchWalletId && 
        hasSolana;

      if (isGenuineLive) {
        console.log(`${progress} User ${userDisplay} already has live Switch wallet: ${existingWallet.solanaAddress}`);
        alreadyLiveCount++;
        continue;
      }

      // Prepare clean name for Switch wallet
      let rawName = user.name;
      if (!rawName) {
        const full = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        if (full) rawName = full;
      }
      if (!rawName && user.email) {
        rawName = user.email.split('@')[0];
      }
      if (!rawName) {
        rawName = `User${user._id.toString().slice(-6)}`;
      }
      let cleanName = rawName.replace(/[^a-zA-Z0-9]/g, '');
      if (!cleanName || !/[a-zA-Z]/.test(cleanName)) {
        cleanName = `User${cleanName || user._id.toString().slice(-6)}`;
      }

      console.log(`${progress} Creating live Switch wallet for ${userDisplay} (Name: ${cleanName})...`);

      // Call Switch API with retry for rate limits
      let switchData = null;
      let retries = 5;
      while (retries > 0) {
        try {
          switchData = await switchService.createWallet({
            name: cleanName,
            callbackUrl
          });
          break;
        } catch (callErr) {
          const isRateLimited = callErr.status === 429 || 
            callErr.message?.toLowerCase().includes('rate-limit') ||
            callErr.message?.toLowerCase().includes('rate limited');

          if (isRateLimited && retries > 1) {
            console.warn(`   Rate limit encountered (${callErr.message}). Backing off 15s (retries left: ${retries - 1})...`);
            await sleep(15000);
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

      // Polite throttle between successful creations (1.5s avoids Cloudflare bursts)
      await sleep(1500);

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
