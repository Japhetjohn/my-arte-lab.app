
const tsaraConfig = {
  publicKey: process.env.TSARA_PUBLIC_KEY,
  secretKey: process.env.TSARA_SECRET_KEY,
  webhookSecret: process.env.TSARA_WEBHOOK_SECRET,
  apiUrl: process.env.TSARA_API_URL || 'https://api.tsara.ng',
  environment: process.env.TSARA_ENVIRONMENT || 'live',

  platformWallet: process.env.PLATFORM_WALLET_ADDRESS,

  commission: parseFloat(process.env.PLATFORM_COMMISSION) || 10,

  supportedCoins: (process.env.SUPPORTED_STABLECOINS || 'USDT,USDC,DAI').split(','),

  defaultCoin: process.env.DEFAULT_STABLECOIN || 'USDT',

  network: 'Solana',

  events: {
    PAYMENT_SUCCESS: 'payment.success',
    PAYMENT_FAILED: 'payment.failed',
    PAYMENT_PENDING: 'payment.pending',
    ESCROW_PAID: 'escrow.paid',
    ESCROW_FAILED: 'escrow.failed',
    WITHDRAWAL_COMPLETED: 'withdrawal.completed',
    WITHDRAWAL_FAILED: 'withdrawal.failed',
  },

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
