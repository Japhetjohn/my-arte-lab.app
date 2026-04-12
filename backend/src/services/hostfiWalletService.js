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

      // Create a unique USDC pay sub-address for this user
      // This gives them their own unique assetId and balance tracking
      console.log(`[Wallet Service] Creating unique USDC pay sub-address for user ${userId}...`);
      let usdcSubAddress;
      try {
        usdcSubAddress = await hostfiService.createPaySubAddress({
          currency: 'USDC',
          network: 'SOL',
          identifier: userId.toString()
        });
        
        // Assign the sub-address
        await hostfiService.assignPayAddress(usdcSubAddress.id);
        
        console.log(`[Wallet Service] ✓ Created unique USDC sub-address: ${usdcSubAddress.id}`);
      } catch (subAddrError) {
        console.error(`[Wallet Service] Failed to create sub-address: ${subAddrError.message}`);
        // Fall back to shared assets if sub-address creation fails
        console.log(`[Wallet Service] Falling back to shared assets...`);
      }

      // Get other currency assets (NGN, etc.) from shared pool
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

      // Store wallet asset IDs - use UNIQUE USDC sub-address if created, otherwise shared
      user.wallet.hostfiWalletAssets = walletAssets.map(asset => {
        const currencyData = asset.currency || {};
        const currencyCode = currencyData.code || currencyData;
        
        // For USDC, use the unique sub-address we just created
        if (currencyCode === 'USDC' && usdcSubAddress) {
          return {
            assetId: usdcSubAddress.assetId || usdcSubAddress.id,
            subAddressId: usdcSubAddress.id,
            currency: 'USDC',
            assetType: 'CRYPTO',
            address: usdcSubAddress.address,
            balance: 0, // Start at 0
            reservedBalance: 0,
            lastSynced: new Date()
          };
        }
        
        // For other currencies, use shared assets
        return {
          assetId: asset.id,
          currency: currencyCode,
          assetType: asset.type,
          balance: 0,
          reservedBalance: 0,
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

      await user.save({ validateBeforeSave: false });

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

      // Fetch crypto collection addresses for this user
      const cryptoAddresses = await hostfiService.getCryptoCollectionAddresses({ 
        customId: userId.toString() 
      }).catch(err => {
        console.warn(`[Sync] Failed to fetch crypto addresses for ${userId}:`, err.message);
        return [];
      });

      // Fetch each wallet asset individually by assetId (per-user balance)
      for (const storedAsset of user.wallet.hostfiWalletAssets) {
        if (!storedAsset.assetId) continue;
        
        try {
          console.log(`[Sync] Fetching wallet asset ${storedAsset.assetId} for user ${userId}`);
          const asset = await hostfiService.getWalletAsset(storedAsset.assetId);
          
          if (asset && asset.balance !== undefined) {
            const currencyCode = asset.currency?.code || asset.currency || storedAsset.currency;
            const networkCode = asset.network || storedAsset.network || 'SOL';
            
            // Update balance from HostFi
            storedAsset.balance = parseFloat(asset.balance) || 0;
            storedAsset.reservedBalance = parseFloat(asset.reservedBalance) || 0;
            storedAsset.lastSynced = new Date();
            
            console.log(`[Sync] Updated ${currencyCode} balance for user ${userId}: ${storedAsset.balance}`);
            
            // Sync collection address if available
            if (asset.type === 'CRYPTO' || storedAsset.assetType === 'CRYPTO') {
              const addrInfo = cryptoAddresses.find(a =>
                a.assetId === storedAsset.assetId ||
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
        } catch (assetError) {
          console.warn(`[Sync] Failed to fetch asset ${storedAsset.assetId} for user ${userId}:`, assetError.message);
          // Keep existing balance if fetch fails
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

      // NOTE: DO NOT calculate balance from HostFi assets!
      // HostFi returns demo/default balances (3 USDC for everyone).
      // Balance is calculated from transaction records in the controller.
      // We only sync asset IDs and addresses here, not balances.
      
      console.log(`[Sync] Skipping balance sync from HostFi - using transaction-based balance calculation instead`);

      // CRITICAL: Ensure the primary wallet address is the Tsara Solana address if available
      if (user.wallet.tsaraAddress) {
        user.wallet.address = user.wallet.tsaraAddress;
        user.wallet.network = 'Solana';
      }

      await user.save({ validateBeforeSave: false });
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
