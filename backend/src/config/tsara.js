/**
 * Tsara Stablecoin Payment Configuration
 * Solana Network - USDT, USDC, DAI
 * Documentation: https://docs.tsara.ng/stablecoin
 */

const tsaraConfig = {
  publicKey: process.env.TSARA_PUBLIC_KEY,
  secretKey: process.env.TSARA_SECRET_KEY,
  webhookSecret: process.env.TSARA_WEBHOOK_SECRET,
  apiUrl: process.env.TSARA_API_URL || 'https://api.tsara.ng',
  environment: process.env.TSARA_ENVIRONMENT || 'live',

  // Platform Solana wallet for receiving commission fees
  platformWallet: process.env.PLATFORM_WALLET_ADDRESS,

  // Platform commission percentage
  commission: parseFloat(process.env.PLATFORM_COMMISSION) || 10,

  // Supported stablecoins on Solana
  supportedCoins: (process.env.SUPPORTED_STABLECOINS || 'USDT,USDC,DAI').split(','),

  // Default stablecoin
  defaultCoin: process.env.DEFAULT_STABLECOIN || 'USDT',

  // Blockchain network
  network: 'Solana',

  // Webhook events
  events: {
    PAYMENT_SUCCESS: 'payment.success',
    PAYMENT_FAILED: 'payment.failed',
    PAYMENT_PENDING: 'payment.pending',
    ESCROW_PAID: 'escrow.paid',
    ESCROW_FAILED: 'escrow.failed',
    WITHDRAWAL_COMPLETED: 'withdrawal.completed',
    WITHDRAWAL_FAILED: 'withdrawal.failed',
  },

  // Validate configuration
  validate() {
    const required = ['secretKey', 'platformWallet'];
    const missing = required.filter(key => !this[key]);

    if (missing.length > 0) {
      throw new Error(`Missing Tsara configuration: ${missing.join(', ')}`);
    }

    if (this.commission < 0 || this.commission > 100) {
      throw new Error('Platform commission must be between 0 and 100');
    }

    if (!this.supportedCoins.includes(this.defaultCoin)) {
      throw new Error(`Default coin ${this.defaultCoin} not in supported coins list`);
    }

    return true;
  }
};

module.exports = tsaraConfig;
