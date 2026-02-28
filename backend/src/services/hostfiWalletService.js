const hostfiService = require('./hostfiService');
const User = require('../models/User');

/**
 * HostFi Wallet Initialization and Management Service
 * Handles user wallet provisioning and synchronization
 */
class HostFiWalletService {
  /**
   * Initialize HostFi wallets for a user
   * This is called when a user first accesses their wallet
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User with initialized wallets
   */
  async initializeUserWallets(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user already has HostFi wallets
      if (user.wallet.hostfiWalletAssets && user.wallet.hostfiWalletAssets.length > 0) {
        console.log(`User ${userId} already has HostFi wallets initialized`);
        return await this.syncWalletBalances(userId);
      }

      console.log(`Initializing HostFi wallets for user ${userId}...`);

      // Sync multi-currency assets (managed via HostFi)
      console.log(`[Wallet Service] Syncing HostFi assets for user ${userId}...`);
      const walletAssets = await hostfiService.getUserWallets();

      if (!walletAssets || walletAssets.length === 0) {
        throw new Error('No wallet assets available from HostFi');
      }

      // Create/Sync Tsara Local Solana Wallet
      if (!user.wallet.tsaraAddress) {
        const tsaraService = require('./tsaraService');
        console.log(`[Tsara Service] Generating local Solana wallet for user ${userId}...`);

        try {
          const tsaraWallet = await tsaraService.createWallet(
            `${user.firstName} ${user.lastName}`,
            `tsara_${user._id}`,
            { userId: user._id }
          );

          if (tsaraWallet.success) {
            user.wallet.tsaraWalletId = tsaraWallet.data.id;
            user.wallet.tsaraAddress = tsaraWallet.data.primary_address;
            user.wallet.tsaraReference = tsaraWallet.data.reference;
            user.wallet.tsaraMnemonic = tsaraWallet.data.mnemonic;
            user.wallet.tsaraEncryptedPrivateKey = tsaraWallet.data.secretKey;

            // Also update legacy address field if it's empty or pending
            if (!user.wallet.address || user.wallet.address.startsWith('pending_')) {
              user.wallet.address = tsaraWallet.data.primary_address;
              user.wallet.network = 'Solana';
            }
            console.log(`[Tsara Service] Local Solana wallet created: ${user.wallet.tsaraAddress}`);
          }
        } catch (tsaraError) {
          console.error(`[Tsara Service] Failed to create local wallet for user ${userId}:`, tsaraError.message);
          // Don't fail the whole initialization if Tsara fails
        }
      }

      // Store wallet asset IDs in user document
      user.wallet.hostfiWalletAssets = walletAssets.map(asset => {
        const currencyData = asset.currency || {};
        return {
          assetId: asset.id,
          currency: currencyData.code || currencyData, // Extract code if it's an object
          assetType: asset.type,
          balance: asset.balance || 0, // In initialization we can trust HostFi balance
          reservedBalance: asset.reservedBalance || 0,
          lastSynced: new Date()
        };
      });

      // Set primary currency (prefer NGN for Nigerian users)
      const primaryAsset = walletAssets.find(a => (a.currency.code || a.currency) === 'NGN') || walletAssets[0];
      const primaryCurrencyCode = primaryAsset.currency.code || primaryAsset.currency;
      // Only set currency, don't overwrite balance (we track it ourselves)
      if (!user.wallet.currency) {
        user.wallet.currency = primaryAsset.currency.code;  // Store currency code
      }
      // Don't set balance - we track it based on transactions, not HostFi
      user.wallet.network = 'HostFi';
      user.wallet.lastUpdated = new Date();

      await user.save();

      console.log(`HostFi wallets initialized for user ${userId}: ${walletAssets.length} assets`);
      return user;
    } catch (error) {
      console.error(`Failed to initialize HostFi wallets for user ${userId}:`, error.message);
      throw error;
    }
  }

  /**
   * Sync wallet balances from HostFi
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated user with synced balances
   */
  async syncWalletBalances(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // If no HostFi wallets, initialize them first
      if (!user.wallet.hostfiWalletAssets || user.wallet.hostfiWalletAssets.length === 0) {
        return await this.initializeUserWallets(userId);
      }

      console.log(`Syncing wallet balances for user ${userId}...`);

      // Fetch latest balances and collection addresses from HostFi
      const [walletAssets, cryptoAddresses] = await Promise.all([
        hostfiService.getUserWallets(),
        hostfiService.getCryptoCollectionAddresses({ customId: userId.toString() }).catch(err => {
          console.warn(`[Sync] Failed to fetch crypto addresses for ${userId}:`, err.message);
          return [];
        })
      ]);

      // Update stored assets and balances
      for (const asset of walletAssets) {
        const currencyCode = asset.currency.code || asset.currency;
        const networkCode = asset.network || (asset.type === 'CRYPTO' ? 'SOL' : 'HOSTFI'); // Default network if missing

        // Find existing asset by ID OR by (currency + network) to prevent logical duplicates
        let storedAsset = user.wallet.hostfiWalletAssets.find(a =>
          a.assetId === asset.id ||
          (a.currency === currencyCode && (a.colNetwork === networkCode || a.network === networkCode))
        );

        if (!storedAsset) {
          // New asset appeared, add it
          user.wallet.hostfiWalletAssets.push({
            assetId: asset.id,
            currency: currencyCode,
            assetType: asset.type,
            balance: asset.balance || 0,
            reservedBalance: asset.reservedBalance || 0,
            lastSynced: new Date(),
            network: networkCode
          });
          storedAsset = user.wallet.hostfiWalletAssets[user.wallet.hostfiWalletAssets.length - 1];
        } else {
          // Update details for existing asset
          storedAsset.assetId = asset.id; // Update ID in case it changed
          storedAsset.balance = asset.balance || 0;
          storedAsset.reservedBalance = asset.reservedBalance || 0;
          storedAsset.lastSynced = new Date();
        }

        // Sync collection address if available
        if (asset.type === 'CRYPTO') {
          const addrInfo = cryptoAddresses.find(a =>
            a.assetId === asset.id ||
            (a.currency === currencyCode && a.network === networkCode)
          );

          if (addrInfo) {
            storedAsset.colAddress = addrInfo.address;
            storedAsset.colNetwork = addrInfo.network;

            // Also update legacy address if it's for Solana/USDC
            if ((addrInfo.network === 'SOL' || addrInfo.network === 'Solana') &&
              (!user.wallet.address || user.wallet.address.startsWith('pending_'))) {
              user.wallet.address = addrInfo.address;
              user.wallet.network = 'Solana';
            }
          }
        }
      }

      // Sync Tsara local balance if it exists
      let tsaraLocalUsdcBalance = 0;
      if (user.wallet.tsaraAddress) {
        const tsaraService = require('./tsaraService');
        try {
          const balanceData = await tsaraService.getBalance(user.wallet.tsaraAddress);
          if (balanceData.success) {
            tsaraLocalUsdcBalance = balanceData.data.balance; // This is the USDC balance
            user.wallet.tsaraBalance = tsaraLocalUsdcBalance; // Update specific field if it exists or for local use
          }
        } catch (tsaraErr) {
          console.warn(`[Sync] Failed to fetch Tsara balance for ${userId}:`, tsaraErr.message);
        }
      }

      // Update primary balance currency if not set
      if (!user.wallet.currency) {
        user.wallet.currency = 'USDC'; // Default to USDC for internationalization
      }

      // Rebuild aggregate balance from sub-assets
      let totalAggregateInPrimary = 0;
      const primaryCurrency = user.wallet.currency || 'USDC';

      for (const asset of user.wallet.hostfiWalletAssets) {
        if (!asset.balance || asset.balance <= 0) continue;

        if (asset.currency === primaryCurrency) {
          totalAggregateInPrimary += asset.balance;
        } else {
          try {
            // Use bridge for calculation if needed
            const rateData = await hostfiService.getCurrencyRates(asset.currency, primaryCurrency, true);
            const rate = rateData.rate || rateData.data?.rate || 0;
            totalAggregateInPrimary += (asset.balance * rate);
          } catch (err) {
            console.warn(`[Sync] Conversion failed for aggregate ${asset.currency}->${primaryCurrency}:`, err.message);
          }
        }
      }

      // Add Tsara local balance to aggregate (convert if necessary)
      if (tsaraLocalUsdcBalance > 0) {
        if (['USDC', 'USD', 'USDT'].includes(primaryCurrency.toUpperCase())) {
          totalAggregateInPrimary += tsaraLocalUsdcBalance;
        } else {
          try {
            const rateData = await hostfiService.getCurrencyRates('USDC', primaryCurrency, true);
            const rate = rateData.rate || rateData.data?.rate || 0;
            totalAggregateInPrimary += (tsaraLocalUsdcBalance * rate);
          } catch (err) {
            console.warn(`[Sync] Tsara conversion failed USDC->${primaryCurrency}:`, err.message);
            // If primary is NGN and conversion fails, we still have the value in USDC
            // For now, if we can't value it in primary, we don't add to aggregate to keep it consistent
          }
        }
      }

      user.wallet.balance = Math.max(0, totalAggregateInPrimary || 0);
      user.balance = user.wallet.balance; // Keep root balance in sync

      // CRITICAL: Ensure the primary wallet address is the Tsara Solana address if available
      if (user.wallet.tsaraAddress) {
        user.wallet.address = user.wallet.tsaraAddress;
        user.wallet.network = 'Solana';
      }

      await user.save();
      console.log(`Wallet balances synced for user ${userId}. Total Aggregate: ${user.wallet.balance} ${primaryCurrency}`);
      return user;
    } catch (error) {
      console.error(`Failed to sync wallet balances for user ${userId}:`, error.message);
      // Even if sync fails, returning the user with stale data is better than crashing, 
      // but we should mark it for retry
      const user = await User.findById(userId);
      return user || { wallet: { balance: 0, hostfiWalletAssets: [] } };
    }
  }

  /**
   * Get HostFi wallet asset ID for a currency
   * @param {string} userId - User ID
   * @param {string} currency - Currency code (NGN, USD, USDC, etc.)
   * @returns {Promise<string>} Wallet asset ID
   */
  async getWalletAssetId(userId, currency) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Initialize wallets if not done yet
      if (!user.wallet.hostfiWalletAssets || user.wallet.hostfiWalletAssets.length === 0) {
        const updatedUser = await this.initializeUserWallets(userId);
        const asset = updatedUser.wallet.hostfiWalletAssets.find(a => a.currency === currency);
        return asset?.assetId;
      }

      const asset = user.wallet.hostfiWalletAssets.find(a => a.currency === currency);
      if (!asset) {
        // Sync wallets and try again
        const updatedUser = await this.syncWalletBalances(userId);
        const syncedAsset = updatedUser.wallet.hostfiWalletAssets.find(a => a.currency === currency);
        if (!syncedAsset) {
          throw new Error(`Wallet for currency ${currency} not found`);
        }
        return syncedAsset.assetId;
      }

      return asset.assetId;
    } catch (error) {
      console.error(`Failed to get wallet asset ID for user ${userId}, currency ${currency}:`, error.message);
      throw error;
    }
  }

  /**
   * Get all wallet assets for a user with current balances
   * @param {string} userId - User ID
   * @returns {Promise<Array>} List of wallet assets
   */
  async getUserWalletAssets(userId) {
    try {
      // Sync balances first to get latest data
      const user = await this.syncWalletBalances(userId);
      return user.wallet.hostfiWalletAssets || [];
    } catch (error) {
      console.error(`Failed to get wallet assets for user ${userId}:`, error.message);
      throw error;
    }
  }

  /**
   * Update user balance after transaction
   * @param {string} userId - User ID
   * @param {string} currency - Currency code
   * @param {number} amount - Amount to add/subtract (negative for debit)
   * @param {string} type - Transaction type (credit/debit)
   * @returns {Promise<Object>} Updated user
   */
  async updateBalance(userId, currency, amount, type = 'credit') {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Initialize wallets if empty
      if (!user.wallet.hostfiWalletAssets || user.wallet.hostfiWalletAssets.length === 0) {
        await this.initializeUserWallets(userId);
      }

      // Find the asset
      let asset = user.wallet.hostfiWalletAssets.find(a => a.currency === currency);
      if (!asset) {
        // One more try: sync
        await this.syncWalletBalances(userId);
        asset = user.wallet.hostfiWalletAssets.find(a => a.currency === currency);
      }

      if (!asset) {
        throw new Error(`Wallet for currency ${currency} not found even after sync`);
      }

      // Update balance - Trigger a full sync rather than manual adjustment
      // This ensures we always match the source of truth (HostFi/On-chain)
      return await this.syncWalletBalances(userId);
    } catch (error) {
      console.error(`Failed to update balance for user ${userId}:`, error.message);
      throw error;
    }
  }
}

module.exports = new HostFiWalletService();
