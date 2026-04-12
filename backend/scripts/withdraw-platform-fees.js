#!/usr/bin/env node
/**
 * Withdraw accumulated platform fees to platform wallet
 * Run: node scripts/withdraw-platform-fees.js [userId]
 * If no userId provided, withdraws fees for oonawa66@gmail.com
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const platformFeeAccumulator = require('../src/services/platformFeeAccumulator');

async function withdrawFees() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/myartelab');
    
    console.log('========================================');
    console.log('WITHDRAW PLATFORM FEES');
    console.log('========================================\n');

    // Get userId from args or use oonawa66@gmail.com
    const userEmail = process.argv[2] || 'oonawa66@gmail.com';
    
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      console.error(`❌ User ${userEmail} not found`);
      process.exit(1);
    }
    
    console.log(`User: ${user.email} (${user._id})`);
    
    // Check accumulated amount
    const accumulated = await platformFeeAccumulator.getAccumulatedAmount(user._id.toString(), 'USDC');
    console.log(`Accumulated: ${accumulated} USDC`);
    console.log(`Minimum: 1 USDC`);
    console.log(`Can withdraw: ${accumulated >= 1 ? 'YES ✅' : 'NO ❌'}\n`);
    
    if (accumulated < 1) {
      console.log('⏳ Not enough to withdraw yet. Need at least 1 USDC.');
      console.log(`   Remaining: ${(1 - accumulated).toFixed(2)} USDC`);
      process.exit(0);
    }
    
    // Get asset ID
    const usdcAsset = user.wallet?.hostfiWalletAssets?.find(a => a.currency === 'USDC');
    if (!usdcAsset?.assetId) {
      console.error('❌ USDC asset not found for user');
      process.exit(1);
    }
    
    console.log('Initiating withdrawal...\n');
    
    // Withdraw
    const result = await platformFeeAccumulator.withdrawAccumulatedFees(
      user._id.toString(),
      'USDC',
      usdcAsset.assetId
    );
    
    if (result.success) {
      console.log('✅ WITHDRAWAL SUCCESSFUL!');
      console.log(`   Amount: ${result.amount} USDC`);
      console.log(`   Reference: ${result.reference}`);
      console.log(`   Transactions updated: ${result.transactionsUpdated}`);
      console.log(`\n   Platform wallet: Bqc5Cf9UAr1rM27HgDDYERSHJAcgfzVH2MnBn7sSdkTg`);
    } else if (result.skipped) {
      console.log(`⏳ Skipped: ${result.reason}`);
    } else {
      console.error('❌ Withdrawal failed:', result);
    }
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

withdrawFees();
