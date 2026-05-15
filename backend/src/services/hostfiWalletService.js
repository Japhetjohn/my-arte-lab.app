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

      // Get the shared USDC asset ID first
      const walletAssets = await hostfiService.getUserWallets();
      const sharedUsdcAsset = walletAssets.find(a => 
        (a.currency?.code || a.currency) === 'USDC'
      );
      
      if (!sharedUsdcAsset) {
        throw new Error('No USDC asset available from HostFi');
      }
      
      // Create a unique collection address for this user
      // This allows deposits to be tracked per-user via customId
      console.log(`[Wallet Service] Creating unique USDC collection address for user ${userId}...`);
      let userCollectionAddress;
      try {
        userCollectionAddress = await hostfiService.createCryptoCollectionAddress({
          assetId: sharedUsdcAsset.id,
          currency: 'USDC',
          network: 'SOL',
          customId: userId.toString(),
          async: false // Get address immediately
        });
        
        console.log(`[Wallet Service] ✓ Created unique collection address: ${userCollectionAddress.address}`);
      } catch (addrError) {
        console.error(`[Wallet Service] Failed to create collection address: ${addrError.message}`);
        // Continue without unique address - deposits won't work for this user
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

      // Store wallet asset IDs - shared asset for USDC, but with unique collection address per user
      user.wallet.hostfiWalletAssets = walletAssets.map(asset => {
        const currencyData = asset.currency || {};
        const currencyCode = currencyData.code || currencyData;
        
        // For USDC, store the shared asset but with user's unique collection address
        if (currencyCode === 'USDC') {
          return {
            assetId: sharedUsdcAsset.id, // Shared business asset
            currency: 'USDC',
            assetType: 'CRYPTO',
            // User's unique deposit address for tracking
            colAddress: userCollectionAddress?.address || sharedUsdcAsset.colAddress,
            colReference: userCollectionAddress?.id,
            colNetwork: 'SOL',
            colCustomId: userId.toString(), // For deposit tracking
            balance: 0, // Tracked internally, not from HostFi
            reservedBalance: 0,
            lastSynced: new Date()
          };
        }
        
        // For other currencies, use shared assets as-is
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

      // ═══════════════════════════════════════════════════════════════
      // CRITICAL FIX: Calculate balance from TRANSACTION HISTORY
      // instead of fetching from HostFi shared asset (which returns
      // the SAME platform-wide balance for ALL users)
      // ═══════════════════════════════════════════════════════════════
      
      const Transaction = require('../models/Transaction');
      const Booking = require('../models/Booking');
      
      // Calculate user's actual balance from their transaction history
      // Formula: Deposits + Earnings + Refunds - Withdrawals - Payments - Escrow - PlatformFees
      const userTransactions = await Transaction.find({
        user: userId,
        status: { $in: ['completed', 'pending'] }
      });
      
      let calculatedUsdcBalance = 0;
      let calculatedNgnBalance = 0;
      
      for (const tx of userTransactions) {
        const amount = parseFloat(tx.amount) || 0;
        const currency = (tx.currency || 'USDC').toUpperCase();
        
        // Only count completed transactions for available balance
        if (tx.status !== 'completed') continue;
        
        switch (tx.type) {
          // CREDIT transactions (money coming in)
          case 'deposit':
          case 'earning':
          case 'refund':
            if (currency === 'USDC') calculatedUsdcBalance += amount;
            if (currency === 'NGN') calculatedNgnBalance += amount;
            break;
            
          // DEBIT transactions (money going out)
          case 'withdrawal':
          case 'payment':
          case 'escrow':
          case 'platform_fee':
            if (currency === 'USDC') calculatedUsdcBalance -= amount;
            if (currency === 'NGN') calculatedNgnBalance -= amount;
            break;
        }
      }
      
      // Also account for active escrow (bookings that are paid but not completed)
      // This is money the client has paid but is held in escrow
      const activeEscrowBookings = await Booking.find({
        client: userId,
        status: { $in: ['confirmed', 'in_progress', 'delivered'] },
        paymentStatus: 'paid'
      });
      
      const escrowTotal = activeEscrowBookings.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);
      calculatedUsdcBalance -= escrowTotal;
      
      // Ensure non-negative balance
      calculatedUsdcBalance = Math.max(0, parseFloat(calculatedUsdcBalance.toFixed(6)));
      calculatedNgnBalance = Math.max(0, parseFloat(calculatedNgnBalance.toFixed(2)));
      
      console.log(`[Sync] Calculated balance for user ${userId}: ${calculatedUsdcBalance} USDC, ${calculatedNgnBalance} NGN (escrow: ${escrowTotal})`);

      // Update each asset with the CALCULATED balance (NOT from HostFi shared asset)
      for (const storedAsset of user.wallet.hostfiWalletAssets) {
        const currencyCode = (storedAsset.currency || 'USDC').toUpperCase();
        
        if (currencyCode === 'USDC') {
          storedAsset.balance = calculatedUsdcBalance;
        } else if (currencyCode === 'NGN') {
          storedAsset.balance = calculatedNgnBalance;
        } else {
          // For other currencies, we don't track yet — set to 0
          storedAsset.balance = 0;
        }
        
        storedAsset.lastSynced = new Date();
      }

      // Update user's primary balance fields
      user.wallet.balance = calculatedUsdcBalance;
      user.balance = calculatedUsdcBalance;
      user.wallet.pendingBalance = escrowTotal;
      
      // Fetch crypto collection addresses for this user (for deposit addresses)
      const cryptoAddresses = await hostfiService.getCryptoCollectionAddresses({ 
        customId: userId.toString() 
      }).catch(err => {
        console.warn(`[Sync] Failed to fetch crypto addresses for ${userId}:`, err.message);
        return [];
      });
      
      // Update collection addresses (these are unique per user)
      for (const storedAsset of user.wallet.hostfiWalletAssets) {
        if (storedAsset.assetType === 'CRYPTO' || storedAsset.currency === 'USDC') {
          const addrInfo = cryptoAddresses.find(a =>
            a.assetId === storedAsset.assetId ||
            (a.currency === storedAsset.currency && a.network === 'SOL')
          );
          
          if (addrInfo) {
            storedAsset.colAddress = addrInfo.address;
            storedAsset.colNetwork = addrInfo.network;
            
            if ((addrInfo.network === 'SOL' || addrInfo.network === 'Solana') &&
              (!user.wallet.address || user.wallet.address.startsWith('pending_'))) {
              user.wallet.address = addrInfo.address;
              user.wallet.network = 'Solana';
            }
          }
        }
      }

      // Sync Tsara local balance if it exists (on-chain Solana wallet)
      if (user.wallet.tsaraAddress) {
        const tsaraService = require('./tsaraService');
        try {
          const balanceData = await tsaraService.getBalance(user.wallet.tsaraAddress);
          if (balanceData.success) {
            user.wallet.tsaraBalance = balanceData.data.balance;
          }
        } catch (tsaraErr) {
          console.warn(`[Sync] Failed to fetch Tsara balance for ${userId}:`, tsaraErr.message);
        }
      }

      // Update primary balance currency if not set
      if (!user.wallet.currency) {
        user.wallet.currency = 'USDC';
      }

      // CRITICAL: Ensure the primary wallet address is the Tsara Solana address if available
      if (user.wallet.tsaraAddress) {
        user.wallet.address = user.wallet.tsaraAddress;
        user.wallet.network = 'Solana';
      }

      await user.save({ validateBeforeSave: false });
      console.log(`Wallet balances synced for user ${userId}. Balance: ${user.wallet.balance} USDC, Escrow: ${escrowTotal}`);
      return user;
    } catch (error) {
      console.error(`Failed to sync wallet balances for user ${userId}:`, error.message);
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

  /**
   * Get actual balance per currency from transaction history
   * FIXED: No longer fetches from HostFi shared asset (which returns same balance for all users)
   */
  async getLiveBalanceAsset(userId, currencyCode = 'USDC') {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    
    // Sync calculates balance from user's transaction history
    await this.syncWalletBalances(userId);
    
    const refreshedUser = await User.findById(userId);
    const asset = refreshedUser.wallet.hostfiWalletAssets?.find(a => a.currency === currencyCode);
    
    // Balance is already calculated with escrow deducted in syncWalletBalances
    // So we just return the stored balance directly
    const trueBalance = parseFloat(asset?.balance || 0);
    return Math.max(0, parseFloat(trueBalance.toFixed(2)));
  }
}

module.exports = new HostFiWalletService();
