/**
 * Sync Transactions from HostFi to Database
 * 
 * PURPOSE: Rebuild the Transaction collection from HostFi's actual records.
 * This wipes all existing transactions and recreates them from HostFi's API.
 * 
 * WHAT IT DOES:
 * 1. Fetches ALL transactions from HostFi (deposits, withdrawals, swaps, payouts)
 * 2. Maps each HostFi transaction to our Transaction model format
 * 3. Deletes all existing transactions in our database
 * 4. Inserts the real HostFi transactions
 * 
 * RUN: node scripts/syncTransactionsFromHostFi.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const hostfiService = require('../src/services/hostfiService');
const User = require('../src/models/User');
const Transaction = require('../src/models/Transaction');

// Connect to MongoDB
async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');
}

// Map HostFi transaction type to our Transaction model type
function mapHostFiType(hostFiType, direction) {
  const type = (hostFiType || '').toUpperCase();
  const dir = (direction || '').toUpperCase();
  
  if (type === 'DEPOSIT' || type === 'CREDIT') return 'deposit';
  if (type === 'WITHDRAWAL' || type === 'DEBIT') return 'withdrawal';
  if (type === 'SWAP') return 'swap';
  if (type === 'PAYOUT' || type === 'PAYMENT') return 'payment';
  if (type === 'FEE') return 'platform_fee';
  if (type === 'REFUND') return 'refund';
  
  // Fallback based on direction
  if (dir === 'CREDIT' || dir === 'IN') return 'deposit';
  if (dir === 'DEBIT' || dir === 'OUT') return 'withdrawal';
  
  return 'deposit'; // Default
}

// Map HostFi status to our status
function mapHostFiStatus(hostFiStatus) {
  const status = (hostFiStatus || '').toUpperCase();
  
  if (status === 'SUCCESS' || status === 'COMPLETED' || status === 'DONE') return 'completed';
  if (status === 'PENDING' || status === 'PROCESSING') return 'pending';
  if (status === 'FAILED' || status === 'ERROR' || status === 'REJECTED') return 'failed';
  
  return 'completed';
}

// Find user by HostFi customId or reference
async function findUserByHostFiReference(reference, customId) {
  // Try by customId first (most reliable)
  if (customId) {
    const user = await User.findById(customId);
    if (user) return user;
  }
  
  // Try by reference in transactions
  if (reference) {
    // Check if reference contains a user ID pattern
    const userIdMatch = reference.match(/[a-f0-9]{24}/i);
    if (userIdMatch) {
      const user = await User.findById(userIdMatch[0]);
      if (user) return user;
    }
  }
  
  return null;
}

// Main sync function
async function syncTransactions() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  HOSTFI TRANSACTION SYNC');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  await connectDB();
  
  try {
    // Step 1: Get all HostFi wallet assets (shared business assets)
    console.log('[1/5] Fetching HostFi wallet assets...');
    const walletAssets = await hostfiService.getUserWallets();
    console.log(`      Found ${walletAssets.length} wallet assets`);
    
    // Step 2: Fetch transactions for each asset
    const allHostFiTransactions = [];
    
    for (const asset of walletAssets) {
      const assetId = asset.id || asset.assetId;
      const currency = asset.currency?.code || asset.currency || 'UNKNOWN';
      
      if (!assetId) continue;
      
      try {
        console.log(`[2/5] Fetching transactions for ${currency} (asset: ${assetId.slice(0, 8)}...)...`);
        
        const response = await hostfiService.getWalletTransactions(assetId, {
          pageSize: 1000, // Get as many as possible
          pageNumber: 1
        });
        
        const transactions = response.transactions || response.data?.transactions || response.data || [];
        
        if (Array.isArray(transactions) && transactions.length > 0) {
          console.log(`      Found ${transactions.length} transactions`);
          
          for (const tx of transactions) {
            allHostFiTransactions.push({
              ...tx,
              _hostFiAssetId: assetId,
              _hostFiCurrency: currency
            });
          }
        }
      } catch (err) {
        console.warn(`      Failed to fetch for ${currency}:`, err.message);
      }
    }
    
    // Step 3: Fetch collection transactions (deposits)
    console.log(`[3/5] Fetching collection (deposit) transactions...`);
    try {
      const collectionResponse = await hostfiService.getCollectionTransactions({
        pageSize: 1000,
        pageNumber: 1
      });
      
      const collectionTxs = collectionResponse.transactions || 
                           collectionResponse.data?.transactions || 
                           collectionResponse.data || [];
      
      if (Array.isArray(collectionTxs) && collectionTxs.length > 0) {
        console.log(`      Found ${collectionTxs.length} collection transactions`);
        
        for (const tx of collectionTxs) {
          allHostFiTransactions.push({
            ...tx,
            _isCollection: true,
            _hostFiCurrency: tx.currency || 'USDC'
          });
        }
      }
    } catch (err) {
      console.warn(`      Failed to fetch collections:`, err.message);
    }
    
    // Step 4: Fetch payout/withdrawal transactions
    console.log(`[4/5] Fetching payout (withdrawal) transactions...`);
    try {
      const payoutResponse = await hostfiService.getWithdrawalTransactions({
        pageSize: 1000,
        pageNumber: 1
      });
      
      const payoutTxs = payoutResponse.transactions || 
                       payoutResponse.data?.transactions || 
                       payoutResponse.data || [];
      
      if (Array.isArray(payoutTxs) && payoutTxs.length > 0) {
        console.log(`      Found ${payoutTxs.length} payout transactions`);
        
        for (const tx of payoutTxs) {
          allHostFiTransactions.push({
            ...tx,
            _isPayout: true,
            _hostFiCurrency: tx.currency || 'USDC'
          });
        }
      }
    } catch (err) {
      console.warn(`      Failed to fetch payouts:`, err.message);
    }
    
    console.log(`\n      TOTAL HostFi transactions fetched: ${allHostFiTransactions.length}`);
    
    // Step 5: Delete all existing transactions
    console.log(`\n[5/5] Cleaning database...`);
    const deleteResult = await Transaction.deleteMany({});
    console.log(`      Deleted ${deleteResult.deletedCount} existing transactions`);
    
    // Step 6: Insert real HostFi transactions
    console.log(`\n[6/5] Inserting real HostFi transactions...`);
    
    let inserted = 0;
    let skipped = 0;
    
    for (const hostFiTx of allHostFiTransactions) {
      try {
        // Extract transaction details
        const txId = hostFiTx.id || hostFiTx.transactionId || hostFiTx.reference || `HOSTFI-${Date.now()}-${Math.random()}`;
        const txType = mapHostFiType(hostFiTx.type, hostFiTx.direction);
        const txStatus = mapHostFiStatus(hostFiTx.status);
        const amount = parseFloat(hostFiTx.amount?.value || hostFiTx.amount || 0);
        const currency = (hostFiTx.currency?.code || hostFiTx.currency || hostFiTx._hostFiCurrency || 'USDC').toUpperCase();
        const reference = hostFiTx.reference || hostFiTx.clientReference || txId;
        const customId = hostFiTx.customId || hostFiTx.metadata?.customId;
        
        // Try to find the user associated with this transaction
        let userId = null;
        
        // Method 1: Check customId (for collection addresses)
        if (customId) {
          const user = await User.findById(customId);
          if (user) userId = user._id;
        }
        
        // Method 2: Check reference for user ID
        if (!userId && reference) {
          const match = reference.match(/[a-f0-9]{24}/i);
          if (match) {
            const user = await User.findById(match[0]);
            if (user) userId = user._id;
          }
        }
        
        // Method 3: For payouts, check recipient address against user wallets
        if (!userId && hostFiTx.recipient?.address) {
          const user = await User.findOne({
            $or: [
              { 'wallet.address': hostFiTx.recipient.address },
              { 'wallet.tsaraAddress': hostFiTx.recipient.address }
            ]
          });
          if (user) userId = user._id;
        }
        
        // Create transaction document
        const transactionDoc = {
          transactionId: `HOSTFI-${txId.slice(0, 50)}`,
          user: userId, // May be null if we can't determine the user
          type: txType,
          amount: Math.abs(amount),
          currency: currency,
          status: txStatus,
          description: hostFiTx.description || `${txType} via HostFi`,
          transactionHash: hostFiTx.hash || hostFiTx.txHash || reference,
          metadata: {
            hostFiId: txId,
            hostFiReference: reference,
            hostFiType: hostFiTx.type,
            hostFiStatus: hostFiTx.status,
            hostFiRaw: JSON.stringify(hostFiTx),
            syncedAt: new Date().toISOString()
          },
          createdAt: hostFiTx.createdAt ? new Date(hostFiTx.createdAt) : new Date(),
          updatedAt: new Date()
        };
        
        await Transaction.create(transactionDoc);
        inserted++;
        
      } catch (insertErr) {
        console.warn(`      Failed to insert transaction:`, insertErr.message);
        skipped++;
      }
    }
    
    console.log(`\n═══════════════════════════════════════════════════════════`);
    console.log('  SYNC COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  Total HostFi transactions: ${allHostFiTransactions.length}`);
    console.log(`  Inserted: ${inserted}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Database now contains ONLY real HostFi transactions`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('Sync failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run if called directly
if (require.main === module) {
  syncTransactions().then(() => {
    process.exit(0);
  }).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { syncTransactions };
