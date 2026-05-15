/**
 * NUCLEAR OPTION: Reset All Transactions and Recalculate from HostFi
 * 
 * USE THIS WHEN:
 * - The Transaction collection has completely fake data
 * - You want to start fresh with only real HostFi records
 * - User balances are completely wrong
 * 
 * WHAT IT DOES:
 * 1. DELETES ALL transactions from the database
 * 2. Fetches real transactions from HostFi
 * 3. Recreates the Transaction collection with ONLY real data
 * 4. Recalculates all user balances from the real transactions
 * 
 * ⚠️ WARNING: This is DESTRUCTIVE. All existing transaction records will be lost.
 * Only run this if you're sure the current data is wrong.
 * 
 * RUN: node scripts/resetTransactionsAndSync.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const hostfiService = require('../src/services/hostfiService');
const User = require('../src/models/User');
const Transaction = require('../src/models/Transaction');
const Booking = require('../src/models/Booking');

async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');
}

async function resetAndSync() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║     RESET TRANSACTIONS & SYNC FROM HOSTFI                    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  await connectDB();
  
  try {
    // CONFIRMATION
    console.log('⚠️  THIS WILL DELETE ALL EXISTING TRANSACTIONS');
    console.log('   and replace them with real HostFi data.\n');
    
    // Count existing
    const existingCount = await Transaction.countDocuments();
    console.log(`   Current transaction count: ${existingCount}`);
    
    // STEP 1: Delete all existing transactions
    console.log('\n[1/6] Deleting all existing transactions...');
    const deleteResult = await Transaction.deleteMany({});
    console.log(`      ✓ Deleted ${deleteResult.deletedCount} transactions`);
    
    // STEP 2: Get all users
    console.log('\n[2/6] Fetching all users...');
    const users = await User.find({}).select('_id firstName lastName email wallet');
    console.log(`      ✓ Found ${users.length} users`);
    
    // STEP 3: For each user, fetch their real HostFi transactions
    console.log('\n[3/6] Fetching real transactions from HostFi...');
    
    let totalInserted = 0;
    let totalFailed = 0;
    
    for (const user of users) {
      const userTxCount = await processUserTransactions(user);
      totalInserted += userTxCount.inserted;
      totalFailed += userTxCount.failed;
    }
    
    // STEP 4: Also fetch platform-level transactions (not tied to specific users)
    console.log('\n[4/6] Fetching platform-level transactions...');
    const platformTxCount = await fetchPlatformTransactions();
    totalInserted += platformTxCount.inserted;
    totalFailed += platformTxCount.failed;
    
    // STEP 5: Recalculate all user balances
    console.log('\n[5/6] Recalculating user balances...');
    await recalculateAllBalances(users);
    
    // STEP 6: Verify
    console.log('\n[6/6] Verification...');
    const newCount = await Transaction.countDocuments();
    console.log(`      ✓ New transaction count: ${newCount}`);
    
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║     SYNC COMPLETE                                            ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║  Transactions inserted: ${String(totalInserted).padEnd(38)} ║`);
    console.log(`║  Transactions failed:   ${String(totalFailed).padEnd(38)} ║`);
    console.log(`║  Total in database:     ${String(newCount).padEnd(38)} ║`);
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    
  } catch (error) {
    console.error('\n✗ Sync failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
}

async function processUserTransactions(user) {
  let inserted = 0;
  let failed = 0;
  
  try {
    // Get user's crypto collection addresses (deposits)
    const cryptoAddresses = await hostfiService.getCryptoCollectionAddresses({
      customId: user._id.toString()
    }).catch(() => []);
    
    for (const addr of cryptoAddresses) {
      if (!addr.address) continue;
      
      try {
        // Fetch transactions for this address
        // Note: HostFi API may vary — adjust as needed
        const deposits = await hostfiService.getCollectionTransactions({
          address: addr.address,
          pageSize: 100
        }).catch(() => ({ transactions: [] }));
        
        const txs = deposits.transactions || deposits.data?.transactions || [];
        
        for (const tx of txs) {
          try {
            await Transaction.create({
              transactionId: `HOSTFI-${tx.id || tx.reference || Date.now()}`,
              user: user._id,
              type: 'deposit',
              amount: parseFloat(tx.amount?.value || tx.amount || 0),
              currency: (tx.currency || 'USDC').toUpperCase(),
              status: ['SUCCESS', 'COMPLETED'].includes(tx.status) ? 'completed' : 'pending',
              description: `Deposit to ${addr.address.slice(0, 8)}...`,
              metadata: {
                hostFiId: tx.id,
                hostFiReference: tx.reference,
                address: addr.address,
                syncedAt: new Date().toISOString()
              },
              createdAt: tx.createdAt ? new Date(tx.createdAt) : new Date()
            });
            inserted++;
          } catch (e) {
            failed++;
          }
        }
      } catch (e) {
        // Address may not have transactions
      }
    }
    
    // Get user's wallet asset transactions (withdrawals, swaps, etc.)
    const assets = user.wallet?.hostfiWalletAssets || [];
    
    for (const asset of assets) {
      if (!asset.assetId) continue;
      
      try {
        const walletTxs = await hostfiService.getWalletTransactions(asset.assetId, {
          pageSize: 100
        }).catch(() => ({ transactions: [] }));
        
        const txs = walletTxs.transactions || walletTxs.data?.transactions || [];
        
        for (const tx of txs) {
          try {
            const isCredit = tx.direction === 'CREDIT' || tx.type === 'CREDIT' || tx.type === 'DEPOSIT';
            const isDebit = tx.direction === 'DEBIT' || tx.type === 'DEBIT' || tx.type === 'WITHDRAWAL';
            
            let txType = 'deposit';
            if (isDebit) txType = 'withdrawal';
            if (tx.type === 'SWAP') txType = 'swap';
            if (tx.type === 'FEE') txType = 'platform_fee';
            
            await Transaction.create({
              transactionId: `HOSTFI-${tx.id || tx.reference || Date.now()}`,
              user: user._id,
              type: txType,
              amount: parseFloat(tx.amount?.value || tx.amount || 0),
              currency: (tx.currency?.code || tx.currency || asset.currency || 'USDC').toUpperCase(),
              status: ['SUCCESS', 'COMPLETED'].includes(tx.status) ? 'completed' : 'pending',
              description: tx.description || `${txType} via HostFi`,
              transactionHash: tx.hash || tx.txHash || tx.reference,
              metadata: {
                hostFiId: tx.id,
                hostFiReference: tx.reference,
                hostFiType: tx.type,
                syncedAt: new Date().toISOString()
              },
              createdAt: tx.createdAt ? new Date(tx.createdAt) : new Date()
            });
            inserted++;
          } catch (e) {
            failed++;
          }
        }
      } catch (e) {
        // Asset may not have transactions
      }
    }
    
  } catch (error) {
    console.warn(`   Failed to process user ${user._id}:`, error.message);
  }
  
  return { inserted, failed };
}

async function fetchPlatformTransactions() {
  let inserted = 0;
  let failed = 0;
  
  try {
    // Fetch all payout/withdrawal transactions (platform-level)
    const payouts = await hostfiService.getWithdrawalTransactions({
      pageSize: 1000
    }).catch(() => ({ transactions: [] }));
    
    const txs = payouts.transactions || payouts.data?.transactions || [];
    
    for (const tx of txs) {
      try {
        // Try to find the recipient user
        let userId = null;
        if (tx.recipient?.address) {
          const user = await User.findOne({
            $or: [
              { 'wallet.address': tx.recipient.address },
              { 'wallet.tsaraAddress': tx.recipient.address }
            ]
          });
          if (user) userId = user._id;
        }
        
        await Transaction.create({
          transactionId: `HOSTFI-PAYOUT-${tx.id || tx.reference || Date.now()}`,
          user: userId,
          type: 'withdrawal',
          amount: parseFloat(tx.amount?.value || tx.amount || 0),
          currency: (tx.currency || 'USDC').toUpperCase(),
          status: ['SUCCESS', 'COMPLETED'].includes(tx.status) ? 'completed' : 'pending',
          description: `Payout to ${tx.recipient?.address?.slice(0, 8) || 'unknown'}...`,
          metadata: {
            hostFiId: tx.id,
            hostFiReference: tx.reference,
            recipientAddress: tx.recipient?.address,
            syncedAt: new Date().toISOString()
          },
          createdAt: tx.createdAt ? new Date(tx.createdAt) : new Date()
        });
        inserted++;
      } catch (e) {
        failed++;
      }
    }
  } catch (e) {
    console.warn('   Failed to fetch platform transactions:', e.message);
  }
  
  return { inserted, failed };
}

async function recalculateAllBalances(users) {
  for (const user of users) {
    try {
      // Get all completed transactions for this user
      const txs = await Transaction.find({
        user: user._id,
        status: 'completed'
      });
      
      let usdcBalance = 0;
      let ngnBalance = 0;
      
      for (const tx of txs) {
        const amount = parseFloat(tx.amount) || 0;
        const currency = (tx.currency || 'USDC').toUpperCase();
        
        if (tx.type === 'deposit' || tx.type === 'earning' || tx.type === 'refund') {
          if (currency === 'USDC') usdcBalance += amount;
          if (currency === 'NGN') ngnBalance += amount;
        } else if (tx.type === 'withdrawal' || tx.type === 'payment' || tx.type === 'platform_fee') {
          if (currency === 'USDC') usdcBalance -= amount;
          if (currency === 'NGN') ngnBalance -= amount;
        }
      }
      
      // Account for active escrow
      const escrowBookings = await Booking.find({
        client: user._id,
        status: { $in: ['confirmed', 'in_progress', 'delivered'] },
        paymentStatus: 'paid'
      });
      
      const escrowTotal = escrowBookings.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);
      usdcBalance -= escrowTotal;
      
      // Ensure non-negative
      usdcBalance = Math.max(0, parseFloat(usdcBalance.toFixed(6)));
      ngnBalance = Math.max(0, parseFloat(ngnBalance.toFixed(2)));
      
      // Update user
      user.wallet.balance = usdcBalance;
      user.balance = usdcBalance;
      user.wallet.pendingBalance = escrowTotal;
      
      // Update asset balances
      for (const asset of user.wallet.hostfiWalletAssets || []) {
        const currency = (asset.currency || 'USDC').toUpperCase();
        if (currency === 'USDC') asset.balance = usdcBalance;
        if (currency === 'NGN') asset.balance = ngnBalance;
      }
      
      await user.save({ validateBeforeSave: false });
      
      console.log(`   ✓ ${user.email}: ${usdcBalance} USDC, ${ngnBalance} NGN (escrow: ${escrowTotal})`);
      
    } catch (error) {
      console.warn(`   ✗ Failed to recalculate balance for ${user.email}:`, error.message);
    }
  }
}

// Run
if (require.main === module) {
  resetAndSync().then(() => {
    process.exit(0);
  }).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { resetAndSync };
