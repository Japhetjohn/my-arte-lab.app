const User = require('../models/User');
const Transaction = require('../models/Transaction');
const hostfiService = require('./hostfiService');

class DepositPollingService {
  constructor() {
    this.isRunning = false;
    this.interval = null;
    this.lastChecked = new Date();
    this.processedTransactions = new Set();
  }

  /**
   * Start polling for deposits every 10 seconds
   */
  start() {
    if (this.isRunning) {
      console.log('[Deposit Polling] Already running');
      return;
    }

    console.log('🚀 [Deposit Polling] Starting automatic deposit detection...');
    console.log('   Checking HostFi every 10 seconds for new deposits\n');

    this.isRunning = true;

    // Check immediately on start
    this.checkForDeposits();

    // Then check every 10 seconds
    this.interval = setInterval(() => {
      this.checkForDeposits();
    }, 10000); // 10 seconds
  }

  /**
   * Stop polling
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    console.log('⏹️  [Deposit Polling] Stopped');
  }

  /**
   * Check HostFi for new deposits and credit them automatically
   */
  async checkForDeposits() {
    try {
      // Get all wallet assets
      const assets = await hostfiService.getUserWallets();

      // Check BOTH fiat AND crypto assets for deposits
      // This covers all currencies globally: NGN, USD, EUR, GBP, KES, USDC, BTC, etc.
      const allAssets = assets.filter(a => a.type === 'FIAT' || a.type === 'CRYPTO');

      for (const asset of allAssets) {
        await this.checkAssetDeposits(asset);
      }
    } catch (error) {
      console.error('[Deposit Polling] Error:', error.message);
    }
  }

  /**
   * Check deposits for a specific asset
   */
  async checkAssetDeposits(asset) {
    try {
      // Get recent transactions for this asset
      const transactions = await hostfiService.getAssetTransactions(asset.id, {
        type: 'DEPOSIT',
        pageSize: 20 // Check last 20 transactions
      });

      const records = transactions.records || transactions.data || [];

      for (const txn of records) {
        await this.processDeposit(txn, asset);
      }
    } catch (error) {
      // Silently handle - asset might not have transactions endpoint
    }
  }

  /**
   * Process a single deposit transaction
   */
  async processDeposit(txn, asset) {
    try {
      // Skip if not successful
      if (txn.status !== 'SUCCESSFUL' && txn.status !== 'successful' && txn.status !== 'completed') {
        return;
      }

      // Skip if already processed
      const txnId = txn.id || txn.reference;
      if (this.processedTransactions.has(txnId)) {
        return;
      }

      // Check if already in database
      const existing = await Transaction.findOne({ reference: txnId });
      if (existing && existing.status === 'completed') {
        this.processedTransactions.add(txnId);
        return;
      }

      // Extract customId (user ID) from transaction
      const userId = txn.customId || txn.metadata?.customId;
      if (!userId) {
        console.log(`[Deposit Polling] No userId found for transaction ${txnId}`);
        return;
      }

      const user = await User.findById(userId);
      if (!user) {
        console.log(`[Deposit Polling] User not found: ${userId}`);
        return;
      }

      // Calculate platform fee (1%)
      const amount = parseFloat(txn.amount || 0);
      const platformFee = amount * 0.01;
      const netAmount = amount - platformFee;

      const currencyCode = asset.currency?.code || asset.currency;
      const assetType = asset.type === 'CRYPTO' ? '🪙 CRYPTO' : '💵 FIAT';

      console.log(`\n💰 [Deposit Polling] NEW ${assetType} DEPOSIT DETECTED!`);
      console.log(`   User: ${user.firstName} ${user.lastName}`);
      console.log(`   Amount: ${amount} ${currencyCode}`);
      console.log(`   Platform Fee (1%): ${platformFee.toFixed(2)} ${currencyCode}`);
      console.log(`   Net Amount: ${netAmount.toFixed(2)} ${currencyCode}`);

      // Credit user wallet
      user.wallet.balance += netAmount;
      user.wallet.totalEarnings += netAmount;

      // Update specific HostFi asset balance for USD conversion consistency
      if (user.wallet.hostfiWalletAssets && user.wallet.hostfiWalletAssets.length > 0) {
        const storedAsset = user.wallet.hostfiWalletAssets.find(a => a.assetId === asset.id || a.currency === currencyCode);
        if (storedAsset) {
          storedAsset.balance += netAmount;
          storedAsset.lastSynced = new Date();
        }
      }

      user.wallet.lastUpdated = new Date();
      await user.save();

      const isCrypto = asset.type === 'CRYPTO';
      const paymentMethod = isCrypto ? 'crypto' : 'bank_transfer';
      const collectionType = isCrypto ? 'crypto_collection' : 'fiat_collection';

      // Create/update transaction record
      await Transaction.findOneAndUpdate(
        { reference: txnId },
        {
          $set: {
            user: userId,
            transactionId: txn.reference || txnId,
            type: 'deposit',
            amount: amount,
            currency: currencyCode,
            status: 'completed',
            description: `${asset.type === 'CRYPTO' ? 'Crypto' : 'Bank'} deposit - ${currencyCode}`,
            platformFee: platformFee,
            netAmount: netAmount,
            paymentMethod: paymentMethod,
            completedAt: new Date(),
            paymentDetails: {
              actualAmount: amount,
              platformFee: platformFee,
              network: isCrypto ? txn.network : undefined,
              walletAddress: isCrypto ? txn.address : undefined,
              txHash: isCrypto ? txn.txHash : undefined,
              bankName: !isCrypto ? txn.metadata?.bankName : undefined,
              accountNumber: !isCrypto ? txn.metadata?.accountNumber : undefined,
              reference: txnId
            },
            metadata: {
              provider: 'hostfi',
              type: collectionType,
              assetType: asset.type,
              autoProcessed: true,
              processedAt: new Date(),
              feeBreakdown: {
                grossAmount: amount,
                platformFee: platformFee,
                amountAfterFee: netAmount
              }
            }
          }
        },
        { upsert: true, new: true }
      );

      console.log(`   ✅ Credited ${netAmount.toFixed(2)} ${currencyCode} to wallet!`);
      console.log(`   🎉 New balance: ${user.wallet.balance} ${user.wallet.currency}\n`);

      // Mark as processed
      this.processedTransactions.add(txnId);

    } catch (error) {
      console.error('[Deposit Polling] Error processing deposit:', error.message);
    }
  }
}

// Export singleton instance
const depositPollingService = new DepositPollingService();
module.exports = depositPollingService;
