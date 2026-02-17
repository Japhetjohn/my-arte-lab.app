/**
 * HostFi Configuration
 * Wallet infrastructure, ON-RAMP and OFF-RAMP services
 */

module.exports = {
  apiUrl: process.env.HOSTFI_API_URL || 'https://api.hostcap.io',
  clientId: process.env.HOSTFI_CLIENT_ID,
  secretKey: process.env.HOSTFI_SECRET_KEY,
  webhookSecret: process.env.HOSTFI_WEBHOOK_SECRET,

  /**
   * Get headers for API requests
   * @param {string} accessToken - Optional access token
   */
  getHeaders(accessToken = null) {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (accessToken) {
      headers['x-auth-token'] = accessToken;
    }

    return headers;
  },

  /**
   * Validate configuration
   */
  validate() {
    if (!this.clientId) {
      throw new Error('HOSTFI_CLIENT_ID is not configured');
    }
    if (!this.secretKey) {
      throw new Error('HOSTFI_SECRET_KEY is not configured');
    }
    return true;
  }
};
