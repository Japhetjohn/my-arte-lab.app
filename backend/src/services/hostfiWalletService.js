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
        currency: asset.currency.code,  // Store currency code, not full object
        assetType: asset.type,
        balance: asset.balance || 0,
        lastSynced: new Date()
      }));

      // Set primary currency balance (prefer NGN for Nigerian users)
      const primaryAsset = walletAssets.find(a => a.currency.code === 'NGN') || walletAssets[0];
      user.wallet.balance = primaryAsset.balance || 0;
      user.wallet.currency = primaryAsset.currency.code;  // Store currency code
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

      // Fetch latest balances from HostFi
      const walletAssets = await hostfiService.getUserWallets();

      // Update stored balances
      for (const asset of walletAssets) {
        const storedAsset = user.wallet.hostfiWalletAssets.find(a => a.assetId === asset.id);
        if (storedAsset) {
          storedAsset.balance = asset.balance || 0;
          storedAsset.lastSynced = new Date();
        } else {
          // New asset appeared, add it
          user.wallet.hostfiWalletAssets.push({
            assetId: asset.id,
            currency: asset.currency.code,  // Store currency code
            assetType: asset.type,
            balance: asset.balance || 0,
            lastSynced: new Date()
          });
        }
      }

      // Update primary balance (NGN or first asset)
      const primaryAsset = user.wallet.hostfiWalletAssets.find(a => a.currency === 'NGN') ||
                          user.wallet.hostfiWalletAssets[0];

      if (primaryAsset) {
        user.wallet.balance = primaryAsset.balance;
        user.wallet.currency = primaryAsset.currency;
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

      // Update balance
      if (type === 'credit') {
        asset.balance += amount;
        user.wallet.balance += amount;
        user.wallet.totalEarnings += amount;
      } else {
        asset.balance -= amount;
        user.wallet.balance -= amount;
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
