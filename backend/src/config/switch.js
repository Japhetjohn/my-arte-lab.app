/**
 * Switch API Configuration
 * Global stablecoin orchestrator for 60+ countries
 * https://switch-3.gitbook.io
 */

module.exports = {
  apiUrl: process.env.SWITCH_API_URL || 'https://switch.up.railway.app',
  serviceKey: process.env.SWITCH_SERVICE_KEY,

  /**
   * Get headers for API requests
   * @returns {Object} Headers object
   */
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-Service-Key': this.serviceKey
    };
  },

  /**
   * Check if running in sandbox mode
   * @returns {boolean} True if sandbox mode
   */
  isSandbox() {
    return this.serviceKey?.startsWith('SANDBOX_');
  },

  /**
   * Validate required configuration
   * @returns {boolean} True if valid
   * @throws {Error} If configuration is invalid
   */
  validate() {
    const required = ['serviceKey'];
    const missing = required.filter(key => !this[key]);

    if (missing.length > 0) {
      throw new Error(`Missing required Switch configuration: ${missing.join(', ')}`);
    }

    if (!this.apiUrl) {
      throw new Error('SWITCH_API_URL is required');
    }

    return true;
  },

  /**
   * Get supported assets for offramp
   * @returns {Array} List of supported blockchain assets
   */
  getSupportedAssets() {
    return [
      'solana:usdc',
      'solana:usdt',
      'ethereum:usdc',
      'ethereum:usdt',
      'solana:usdc',
      'base:cngn',
      'polygon:usdc',
      'polygon:usdt',
      'bsc:usdc',
      'bsc:usdt',
      'arbitrum:usdc',
      'optimism:usdc',
      'avalanche:usdc',
      'tron:usdt'
    ];
  },

  /**
   * Get default asset for user's wallet
   * @returns {string} Default asset identifier
   */
  getDefaultAsset() {
    return 'solana:usdc'; // Match our platform's Solana wallet
  }
};
