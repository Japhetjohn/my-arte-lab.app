/**
 * HostFi Balance Service
 * Fetches real-time balances from HostFi API
 */

const hostfiService = require('./hostfiService');

class HostFiBalanceService {
  /**
   * Get real balance for a user's asset from HostFi API
   * @param {string} assetId - HostFi asset ID
   * @returns {Promise<Object>} Balance info from HostFi
   */
  async getAssetBalanceFromHostFi(assetId) {
    try {
      // Get asset transactions to calculate actual balance
      const transactions = await hostfiService.getAssetTransactions(assetId, { limit: 100 });
      
      // Calculate balance from transactions
      let totalReceived = 0;
      let totalSent = 0;
      
      const txList = transactions?.records || transactions?.data || (Array.isArray(transactions) ? transactions : []);
      
      for (const tx of txList) {
        if (tx.status === 'completed' || tx.status === 'success' || tx.status === 'CONFIRMED') {
          const amount = parseFloat(tx.amount) || parseFloat(tx.receivedAmount) || 0;
          
          // Determine direction
          const isIncoming = tx.direction === 'incoming' || 
                            tx.type === 'deposit' || 
                            tx.type === 'collection' ||
                            (tx.to && tx.to.includes && tx.to.includes('deposit'));
          
          if (isIncoming) {
            totalReceived += amount;
          } else {
            totalSent += amount;
          }
        }
      }
      
      const calculatedBalance = totalReceived - totalSent;
      
      return {
        balance: calculatedBalance,
        totalReceived,
        totalSent,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error(`[HostFiBalanceService] Error fetching balance for ${assetId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get all balances for a user from HostFi
   * @param {Object} user - User document with hostfiWalletAssets
   * @returns {Promise<Object>} Updated balances
   */
  async getUserBalancesFromHostFi(user) {
    try {
      const assets = user.wallet?.hostfiWalletAssets || [];
      const updatedAssets = [];
      
      for (const asset of assets) {
        if (!asset.assetId) continue;
        
        try {
          const hostFiBalance = await this.getAssetBalanceFromHostFi(asset.assetId);
          
          // Update asset with HostFi data
          asset.balance = hostFiBalance.balance;
          asset.lastSynced = new Date();
          
          updatedAssets.push({
            currency: asset.currency,
            assetId: asset.assetId,
            balance: hostFiBalance.balance,
            colAddress: asset.colAddress,
            lastSynced: asset.lastSynced
          });
        } catch (e) {
          console.error(`[HostFiBalanceService] Failed to get balance for ${asset.currency}:`, e.message);
          // Keep existing balance if fetch fails
          updatedAssets.push({
            currency: asset.currency,
            assetId: asset.assetId,
            balance: asset.balance,
            colAddress: asset.colAddress,
            lastSynced: asset.lastSynced,
            error: true
          });
        }
      }
      
      // Save updated user without validation
      await user.save({ validateBeforeSave: false });
      
      return {
        userId: user._id,
        email: user.email,
        assets: updatedAssets,
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('[HostFiBalanceService] Error getting user balances:', error.message);
      throw error;
    }
  }

  /**
   * Sync all user balances from HostFi
   * @returns {Promise<Array>} Sync results for all users
   */
  async syncAllUserBalances() {
    const User = require('../models/User');
    const users = await User.find({ 'wallet.hostfiWalletAssets': { $exists: true, $ne: [] } });
    
    const results = [];
    for (const user of users) {
      try {
        const result = await this.getUserBalancesFromHostFi(user);
        results.push({ success: true, ...result });
      } catch (e) {
        results.push({ success: false, userId: user._id, email: user.email, error: e.message });
      }
    }
    
    return results;
  }
}

module.exports = new HostFiBalanceService();
