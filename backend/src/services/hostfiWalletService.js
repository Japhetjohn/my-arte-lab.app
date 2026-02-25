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

      // Initialize Tsara local wallet if missing
      if (!user.wallet.tsaraAddress) {
        const tsaraService = require('./tsaraService');
        console.log(`Initializing Tsara local wallet for user ${userId}...`);

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
          }
        } catch (tsaraError) {
          console.error(`Failed to create Tsara wallet for user ${userId}:`, tsaraError.message);
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
            // Update last synced for tsara if we had a field, for now just use it in aggregate
          }
        } catch (tsaraErr) {
          console.warn(`[Sync] Failed to fetch Tsara balance for ${userId}:`, tsaraErr.message);
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

      // Rebuild aggregate balance from sub-assets
      let totalAggregateInPrimary = 0;
      const primaryCurrency = user.wallet.currency || 'NGN';

      for (const asset of user.wallet.hostfiWalletAssets) {
        if (asset.balance === 0) continue;

        if (asset.currency === primaryCurrency) {
          totalAggregateInPrimary += asset.balance;
        } else {
          try {
            // Use bridge for calculation if needed
            const rateData = await hostfiService.getCurrencyRates(asset.currency, primaryCurrency, true);
            const rate = rateData.rate || rateData.data?.rate || 0;
            totalAggregateInPrimary += (asset.balance * rate);
          } catch (err) {
            console.warn(`[Sync] Conversion failed for aggregate:`, err.message);
          }
        }
      }

      // Add Tsara local balance to aggregate (convert if necessary)
      if (tsaraLocalUsdcBalance > 0) {
        if (primaryCurrency === 'USDC' || primaryCurrency === 'USD') {
          totalAggregateInPrimary += tsaraLocalUsdcBalance;
        } else {
          try {
            const rateData = await hostfiService.getCurrencyRates('USDC', primaryCurrency, true);
            const rate = rateData.rate || rateData.data?.rate || 0;
            totalAggregateInPrimary += (tsaraLocalUsdcBalance * rate);
          } catch (err) {
            console.warn(`[Sync] Tsara conversion failed:`, err.message);
            // If conversion fails, we still have the NGN balance from HostFi, 
            // but the Tsara balance might be missed in aggregate. 
            // For now, we don't add it if we can't value it.
          }
        }
      }

      // Update aggregate balance: Use HostFi + Tsara as the base
      user.wallet.balance = totalAggregateInPrimary;

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

      // Update balance - CONVERT TO PRIMARY CURRENCY IF DIFFERENT
      const isCredit = type === 'credit' || type === 'earning' || type === 'deposit';

      if (isCredit) {
        asset.balance += amount;

        // Convert to primary currency for aggregate balance
        let amountInPrimary = amount;
        if (currency !== user.wallet.currency) {
          try {
            const rateData = await hostfiService.getCurrencyRates(currency, user.wallet.currency, true);
            const rate = rateData.rate || rateData.data?.rate || 0;
            amountInPrimary = amount * rate;
          } catch (error) {
            console.error(`Balance update conversion failed (${currency} to ${user.wallet.currency}):`, error.message);
            // Fallback: value it at 0 in primary or keep previous if we can't get rate
          }
        }

        user.wallet.balance += amountInPrimary;
        if (type === 'earning') {
          user.wallet.totalEarnings += amountInPrimary;
        }
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
