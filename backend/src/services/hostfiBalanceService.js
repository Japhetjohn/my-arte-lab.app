/**
 * HostFi Balance Service
 * Fetches real-time balances from HostFi API
 */

const hostfiService = require('./hostfiService');

class HostFiBalanceService {
  /**
   * Get balance for a specific collection address from HostFi
   * @param {string} address - Collection address
   * @returns {Promise<number>} Balance
   */
  async getAddressBalance(address) {
    try {
      // Get collection transactions for this address
      const filters = { 
        address: address,
        limit: 100 
      };
      
      const response = await hostfiService.getCryptoCollectionAddresses(filters);
      const addresses = response?.records || response?.data || (Array.isArray(response) ? response : []);
      
      // Find the specific address and get its balance
      const addressData = addresses.find(a => a.address === address);
      if (addressData && addressData.balance !== undefined) {
        return parseFloat(addressData.balance) || 0;
      }
      
      return 0;
    } catch (error) {
      console.error(`[HostFiBalanceService] Error fetching balance for ${address}:`, error.message);
      return 0; // Return 0 on error, don't throw
    }
  }

  /**
   * Get all balances for a user from HostFi
   * @param {Object} user - User document
   * @returns {Promise<Object>} Updated balances
   */
  async getUserBalancesFromHostFi(user) {
    try {
      const assets = user.wallet?.hostfiWalletAssets || [];
      const updatedAssets = [];
      
      console.log(`[HostFiBalanceService] Syncing ${user.email}...`);
      
      for (const asset of assets) {
        // Only sync USDC for now (main currency)
        if (asset.currency !== 'USDC') continue;
        
        try {
          console.log(`[HostFiBalanceService]   Fetching ${asset.currency} balance...`);
          
          // Get balance from collection address
          let balance = 0;
          if (asset.colAddress) {
            balance = await this.getAddressBalance(asset.colAddress);
          }
          
          // Update asset
          asset.balance = balance;
          asset.reservedBalance = 0; // Reset reserved - we'll calculate this separately
          asset.lastSynced = new Date();
          
          updatedAssets.push({
            currency: asset.currency,
            assetId: asset.assetId,
            balance: balance,
            colAddress: asset.colAddress,
            lastSynced: asset.lastSynced
          });
          
          console.log(`[HostFiBalanceService]   ✓ ${asset.currency}: ${balance}`);
        } catch (e) {
          console.error(`[HostFiBalanceService]   ✗ Failed ${asset.currency}:`, e.message);
          updatedAssets.push({
            currency: asset.currency,
            assetId: asset.assetId,
            balance: asset.balance,
            colAddress: asset.colAddress,
            error: true
          });
        }
      }
      
      // Save updated user
      await user.save({ validateBeforeSave: false });
      
      return {
        userId: user._id,
        email: user.email,
        assets: updatedAssets,
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('[HostFiBalanceService] Error:', error.message);
      throw error;
    }
  }

  /**
   * Sync all user balances from HostFi
   * @returns {Promise<Array>} Sync results
   */
  async syncAllUserBalances() {
    const User = require('../models/User');
    const users = await User.find({ 'wallet.hostfiWalletAssets': { $exists: true, $ne: [] } });
    
    console.log(`[HostFiBalanceService] Syncing ${users.length} users...`);
    
    const results = [];
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      console.log(`[HostFiBalanceService] [${i + 1}/${users.length}] ${user.email}`);
      
      try {
        const result = await this.getUserBalancesFromHostFi(user);
        results.push({ success: true, ...result });
      } catch (e) {
        results.push({ success: false, userId: user._id, email: user.email, error: e.message });
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return results;
  }
}

module.exports = new HostFiBalanceService();
