const User = require('../models/User');
const Transaction = require('../models/Transaction');
const hostfiService = require('./hostfiService');
const hostfiWalletService = require('./hostfiWalletService');

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
      // Check BOTH fiat collection transactions AND crypto wallet deposits
      await this.checkFiatCollections();
      await this.checkCryptoDeposits();
    } catch (error) {
      console.error('[Deposit Polling] Error:', error.message);
    }
  }

  /**
   * Check for fiat collection transactions (NGN, KES, etc. bank deposits)
   */
  async checkFiatCollections() {
    try {
      // Get recent fiat collection transactions
      const response = await hostfiService.getFiatCollectionTransactions({
        pageSize: 20,
        status: 'SUCCESSFUL'
      });

      const transactions = response.records || response.transactions || response.data || [];

      for (const txn of transactions) {
        await this.processFiatCollection(txn);
      }
    } catch (error) {
      // Silently handle - endpoint might not exist or return errors
      console.error('[Deposit Polling] Fiat collections check failed:', error.message);
    }
  }

  /**
   * Check for crypto deposits on wallet assets
   */
  async checkCryptoDeposits() {
    try {
      // Get all wallet assets
      const assets = await hostfiService.getUserWallets();

      // Check crypto assets for deposits (USDC, BTC, ETH, SOL, etc.)
      const cryptoAssets = assets.filter(a => a.type === 'CRYPTO');

      for (const asset of cryptoAssets) {
        await this.checkAssetDeposits(asset);
      }
    } catch (error) {
      console.error('[Deposit Polling] Crypto deposits check failed:', error.message);
    }
  }

  /**
   * Check deposits for a specific crypto asset
   */
  async checkAssetDeposits(asset) {
    try {
      // Get recent transactions for this asset (fixed method name!)
      const transactions = await hostfiService.getWalletTransactions(asset.id, {
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
   * Process a fiat collection transaction (NGN/KES bank deposit)
   * Must convert fiat to USDC before crediting user
   */
  async processFiatCollection(txn) {
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
        console.log(`[Deposit Polling] No userId found for fiat collection ${txnId}`);
        return;
      }

      const user = await User.findById(userId);
      if (!user) {
        console.log(`[Deposit Polling] User not found: ${userId}`);
        return;
      }

      const fiatAmount = parseFloat(txn.amount || 0);
      const fiatCurrency = txn.currency || 'NGN';

      console.log(`\n💵 [Deposit Polling] NEW FIAT COLLECTION DETECTED!`);
      console.log(`   User: ${user.firstName} ${user.lastName}`);
      console.log(`   Fiat Amount: ${fiatAmount} ${fiatCurrency}`);
      console.log(`   Converting to USDC...`);

      // Get all wallet assets to find source (NGN) and target (USDC) asset IDs
      const assets = await hostfiService.getUserWallets();

      const fiatAsset = assets.find(a => a.currency?.code === fiatCurrency || a.currency === fiatCurrency);
      const usdcAsset = assets.find(a => a.currency?.code === 'USDC' || a.currency === 'USDC');

      if (!fiatAsset || !usdcAsset) {
        console.error(`[Deposit Polling] Cannot find asset IDs for conversion: ${fiatCurrency} → USDC`);
        return;
      }

      // Trigger conversion from NGN to USDC
      try {
        const swapResult = await hostfiService.swapAssets({
          fromAssetId: fiatAsset.id,
          toAssetId: usdcAsset.id,
          amount: fiatAmount,
          currency: fiatCurrency
        });

        const usdcAmount = parseFloat(swapResult.toAmount || swapResult.amount || 0);

        console.log(`   ✅ Converted ${fiatAmount} ${fiatCurrency} → ${usdcAmount} USDC`);
        console.log(`   Exchange rate: ${swapResult.rate || 'N/A'}`);

        // Now credit the USDC amount to user wallet using service (handles conversion)
        const platformFee = 0; // No fee for deposits
        const netAmount = usdcAmount;

        await hostfiWalletService.updateBalance(
          user._id,
          'USDC',
          netAmount,
          'credit'
        );

        // Create transaction record
        await Transaction.findOneAndUpdate(
          { reference: txnId },
          {
            $set: {
              user: userId,
              transactionId: txn.reference || txnId,
              type: 'deposit',
              amount: usdcAmount,
              currency: 'USDC',
              status: 'completed',
              description: `Bank deposit - ${fiatAmount} ${fiatCurrency} → ${usdcAmount} USDC`,
              platformFee: platformFee,
              netAmount: netAmount,
              paymentMethod: 'bank_transfer',
              completedAt: new Date(),
              paymentDetails: {
                actualAmount: fiatAmount,
                fiatCurrency: fiatCurrency,
                usdcAmount: usdcAmount,
                exchangeRate: swapResult.rate,
                platformFee: platformFee,
                bankName: txn.metadata?.bankName,
                accountNumber: txn.metadata?.accountNumber,
                reference: txnId
              },
              metadata: {
                provider: 'hostfi',
                type: 'fiat_collection',
                assetType: 'FIAT',
                autoProcessed: true,
                autoConverted: true,
                processedAt: new Date(),
                conversionDetails: {
                  fromAmount: fiatAmount,
                  fromCurrency: fiatCurrency,
                  toAmount: usdcAmount,
                  toCurrency: 'USDC',
                  rate: swapResult.rate
                },
                feeBreakdown: {
                  grossAmount: usdcAmount,
                  platformFee: platformFee,
                  amountAfterFee: netAmount
                }
              }
            }
          },
          { upsert: true, new: true }
        );

        console.log(`   ✅ Credited ${netAmount.toFixed(2)} USDC to wallet!`);
        console.log(`   🎉 New balance: ${user.wallet.balance} ${user.wallet.currency}\n`);

        // Mark as processed
        this.processedTransactions.add(txnId);

      } catch (swapError) {
        console.error(`[Deposit Polling] Failed to convert ${fiatCurrency} to USDC:`, swapError.message);
        // Don't mark as processed so we can retry later
      }

    } catch (error) {
      console.error('[Deposit Polling] Error processing fiat collection:', error.message);
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

      // Calculate platform fee (0% - no fees on deposits)
      const amount = parseFloat(txn.amount || 0);
      const platformFee = 0; // No fee for deposits
      const netAmount = amount; // Full amount credited

      const currencyCode = asset.currency?.code || asset.currency;
      const assetType = asset.type === 'CRYPTO' ? '🪙 CRYPTO' : '💵 FIAT';

      console.log(`\n💰 [Deposit Polling] NEW ${assetType} DEPOSIT DETECTED!`);
      console.log(`   User: ${user.firstName} ${user.lastName}`);
      console.log(`   Amount: ${amount} ${currencyCode}`);
      console.log(`   Platform Fee: ${platformFee.toFixed(2)} ${currencyCode} (0% - No fees!)`);
      console.log(`   Net Amount: ${netAmount.toFixed(2)} ${currencyCode}`);

      // Credit user wallet using service (handles conversion to primary currency)
      // This FIXES the bug where 0.001 BTC was added as 0.001 NGN
      await hostfiWalletService.updateBalance(
        user._id,
        currencyCode,
        netAmount,
        'credit'
      );

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
