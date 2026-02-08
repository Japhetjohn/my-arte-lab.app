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

      // Get all available wallet assets from HostFi
      // HostFi automatically provisions wallets for each supported currency
      const walletAssets = await hostfiService.getUserWallets();

      if (!walletAssets || walletAssets.length === 0) {
        throw new Error('No wallet assets available from HostFi');
      }

      // Store wallet asset IDs in user document
      user.wallet.hostfiWalletAssets = walletAssets.map(asset => ({
        assetId: asset.id,
        currency: asset.currency.code || asset.currency,  // Store currency code
        assetType: asset.type,
        balance: 0, // Initialize with 0, we track this locally
        lastSynced: new Date()
      }));

      // Set primary currency (prefer NGN for Nigerian users)
      const primaryAsset = walletAssets.find(a => a.currency.code === 'NGN') || walletAssets[0];
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
        let storedAsset = user.wallet.hostfiWalletAssets.find(a => a.assetId === asset.id);

        if (!storedAsset) {
          // New asset appeared, add it
          user.wallet.hostfiWalletAssets.push({
            assetId: asset.id,
            currency: asset.currency.code || asset.currency,
            assetType: asset.type,
            balance: 0, // Initialize with 0, we track this locally via transactions
            lastSynced: new Date()
          });
          storedAsset = user.wallet.hostfiWalletAssets[user.wallet.hostfiWalletAssets.length - 1];
        } else {
          // DO NOT overwrite balance from HostFi as it might be platform-wide
          // storedAsset.balance = asset.balance || 0; 
          storedAsset.lastSynced = new Date();
        }

        // Sync collection address if available
        if (asset.type === 'CRYPTO') {
          const addrInfo = cryptoAddresses.find(a => a.assetId === asset.id || a.currency === (asset.currency.code || asset.currency));
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

      // Update primary balance currency if not set
      if (!user.wallet.currency) {
        const primaryAsset = user.wallet.hostfiWalletAssets.find(a => a.currency === 'NGN') ||
          user.wallet.hostfiWalletAssets[0];
        if (primaryAsset) {
          user.wallet.currency = primaryAsset.currency;
        }
      }

      user.wallet.lastUpdated = new Date();
      await user.save();

      console.log(`Wallet balances synced for user ${userId}`);
      return user;
    } catch (error) {
      console.error(`Failed to sync wallet balances for user ${userId}:`, error.message);
      throw error;
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

      // Find the asset
      const asset = user.wallet.hostfiWalletAssets.find(a => a.currency === currency);
      if (!asset) {
        throw new Error(`Wallet for currency ${currency} not found`);
      }

      // Update balance - CONVERT TO PRIMARY CURRENCY IF DIFFERENT
      if (type === 'credit') {
        asset.balance += amount;

        // Convert to primary currency for aggregate balance
        let amountInPrimary = amount;
        if (currency !== user.wallet.currency) {
          try {
            const rateData = await hostfiService.getCurrencyRates(currency, user.wallet.currency);
            const rate = rateData.rate || rateData.data?.rate || 0;
            amountInPrimary = amount * rate;
          } catch (error) {
            console.error(`Balance update conversion failed (${currency} to ${user.wallet.currency}):`, error.message);
            // Fallback: stay with 1:1 if rate fails (better than nothing or crashing, 
            // but log clearly)
          }
        }

        user.wallet.balance += amountInPrimary;
        user.wallet.totalEarnings += amountInPrimary;
      } else {
        asset.balance -= amount;

        let amountInPrimary = amount;
        if (currency !== user.wallet.currency) {
          try {
            const rateData = await hostfiService.getCurrencyRates(currency, user.wallet.currency);
            const rate = rateData.rate || rateData.data?.rate || 0;
            amountInPrimary = amount * rate;
          } catch (error) {
            console.error(`Balance update conversion failed (${currency} to ${user.wallet.currency}):`, error.message);
          }
        }
        user.wallet.balance -= amountInPrimary;
      }

      asset.lastSynced = new Date();
      user.wallet.lastUpdated = new Date();

      await user.save();
      return user;
    } catch (error) {
      console.error(`Failed to update balance for user ${userId}:`, error.message);
      throw error;
    }
  }
}

module.exports = new HostFiWalletService();
