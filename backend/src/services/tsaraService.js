const axios = require('axios');
const axiosRetry = require('axios-retry');
const crypto = require('crypto');
const tsaraConfig = require('../config/tsara');
const { Keypair } = require('@solana/web3.js');
const bip39 = require('bip39');
const { derivePath } = require('ed25519-hd-key');

class TsaraService {
  constructor() {
    this.apiUrl = tsaraConfig.apiUrl;
    this.publicKey = tsaraConfig.publicKey;
    this.secretKey = tsaraConfig.secretKey;
    this.webhookSecret = tsaraConfig.webhookSecret;

    this.api = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
        'X-Public-Key': this.publicKey
      },
      timeout: 30000
    });

    // Configure retry logic for transient network failures
    axiosRetry(this.api, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        // Retry on network errors or 5xx server errors
        return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
               (error.response && error.response.status >= 500);
      },
      onRetry: (retryCount, error, requestConfig) => {
        console.warn(`Tsara API retry attempt ${retryCount} for ${requestConfig.url}`);
      }
    });
  }

  async generateWallet(userData) {
    try {
      const mnemonic = bip39.generateMnemonic(128);

      const seed = await bip39.mnemonicToSeed(mnemonic);

      const { key } = derivePath(`m/44'/501'/0'`, seed.toString('hex'));

      const keypair = Keypair.fromSeed(key);

      const publicKey = keypair.publicKey.toBase58();

      const secretKey = Array.from(keypair.secretKey);

      // SECURITY: mnemonic and secretKey should NEVER be returned in API responses
      // In production, these should be encrypted and stored in a secure vault (AWS KMS, HashiCorp Vault)
      // For now, only return public information

      return {
        address: publicKey,
        currency: 'USDT',
        balance: 0,
        network: 'Solana',
        type: 'crypto'
      };

    } catch (error) {
      console.error('Wallet generation failed:', error.message);
      throw new Error(`Wallet generation failed: ${error.message}`);
    }
  }

  async generateEscrowWallet(bookingData) {
    try {
      const mnemonic = bip39.generateMnemonic(128);
      const seed = await bip39.mnemonicToSeed(mnemonic);
      const { key } = derivePath(`m/44'/501'/0'`, seed.toString('hex'));
      const keypair = Keypair.fromSeed(key);
      const depositAddress = keypair.publicKey.toBase58();
      const secretKey = Array.from(keypair.secretKey);

      const checkoutId = crypto.randomUUID();

      const expiresAt = Date.now() + 3600000;

      return {
        address: depositAddress,
        amount: bookingData.amount,
        currency: bookingData.currency || 'USDT',
        escrowId: checkoutId,
        checkoutId: checkoutId,
        status: 'pending',
        network: 'Solana',
        reference: bookingData.bookingId,
        type: 'crypto',
        expiresAt: expiresAt
        // SECURITY: mnemonic and secretKey removed - should be stored securely, not returned
      };

    } catch (error) {
      console.error('Escrow wallet creation failed:', error.message);
      throw new Error(`Escrow creation failed: ${error.message}`);
    }
  }

  async checkEscrowPayment(checkoutId) {
    try {
      const response = await this.api.get(`/business/checkout/${checkoutId}/status`);

      if (response.data && response.data.data) {
        const checkoutData = response.data.data;

        return {
          isPaid: checkoutData.status === 'completed' || checkoutData.status === 'paid',
          status: checkoutData.status,
          amount: checkoutData.amount,
          paidAmount: checkoutData.amount,
          currency: checkoutData.tokenType || 'USDT',
          address: checkoutData.depositAddress,
          checkoutId: checkoutData.checkoutId,
          createdAt: checkoutData.createdAt,
          completedAt: checkoutData.completedAt
        };
      }

      throw new Error('Invalid response from Tsara API');

    } catch (error) {
      console.error('Checkout status check failed:', error.response ? error.response.data : error.message);
      throw error;
    }
  }

  async getWalletBalance(address) {
    try {
      const response = await this.api.post('/usdt-balance', {
        address: address
      });

      if (response.data && response.data.data) {
        return {
          balance: response.data.data.balance || 0,
          currency: 'USDT',
          network: 'Solana',
          type: 'crypto'
        };
      }

      throw new Error('Invalid response from Tsara API');

    } catch (error) {
      console.error('Balance check failed:', error.response ? error.response.data : error.message);
      return { balance: 0, currency: 'USDT', network: 'Solana', type: 'crypto' };
    }
  }

  async releaseEscrowFunds(releaseData) {
    try {
      const {
        escrowId,
        escrowAddress,
        creatorAddress,
        platformAddress,
        creatorAmount,
        platformFee,
        currency,
        bookingId
      } = releaseData;

      const creatorRelease = await this.api.post('/escrow/release', {
        escrow_id: escrowId || escrowAddress,
        recipient_address: creatorAddress,
        amount: creatorAmount,
        currency: currency || 'USDT',
        metadata: {
          platform: 'myartelab',
          booking_id: bookingId,
          recipient_type: 'creator'
        }
      });

      const platformRelease = await this.api.post('/escrow/release', {
        escrow_id: escrowId || escrowAddress,
        recipient_address: platformAddress,
        amount: platformFee,
        currency: currency || 'USDT',
        metadata: {
          platform: 'myartelab',
          booking_id: bookingId,
          recipient_type: 'platform'
        }
      });

      return {
        success: true,
        creatorTransaction: {
          hash: creatorRelease.data?.transaction_hash,
          amount: creatorAmount,
          status: creatorRelease.data?.status
        },
        platformTransaction: {
          hash: platformRelease.data?.transaction_hash,
          amount: platformFee,
          status: platformRelease.data?.status
        }
      };

    } catch (error) {
      console.error('Escrow release failed:', error.response ? error.response.data : error.message);
      throw new Error(`Escrow release failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async processWithdrawal(withdrawalData) {
    try {
      const {
        fromAddress,
        toAddress,
        amount,
        currency,
        memo
      } = withdrawalData;

      const response = await this.api.post('/withdrawals/create', {
        from_address: fromAddress,
        to_address: toAddress,
        amount: amount,
        currency: currency || 'USDT',
        memo: memo || 'Withdrawal',
        metadata: {
          platform: 'myartelab'
        }
      });

      if (response.data && response.data.withdrawal) {
        return {
          success: true,
          withdrawalId: response.data.withdrawal.id,
          txHash: response.data.withdrawal.transaction_hash,
          status: response.data.withdrawal.status,
          message: 'Withdrawal initiated successfully'
        };
      }

      throw new Error('Invalid response from Tsara API');

    } catch (error) {
      console.error('Withdrawal failed:', error.response ? error.response.data : error.message);
      throw new Error(`Withdrawal failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async handleWebhookEvent(event) {
    const { type, data } = event;

    try {
      switch (type) {
        case 'payment.success':
        case 'escrow.paid':
          return await this.handlePaymentSuccess(data);

        case 'payment.failed':
        case 'escrow.failed':
          return await this.handlePaymentFailed(data);

        case 'withdrawal.completed':
          return await this.handleWithdrawalCompleted(data);

        case 'withdrawal.failed':
          return await this.handleWithdrawalFailed(data);

        default:
          console.warn(`Unknown webhook event type: ${type}`);
          return { success: true, message: 'Event type not handled' };
      }
    } catch (error) {
      console.error('Webhook processing failed:', error);
      throw error;
    }
  }

  async handlePaymentSuccess(data) {
    const Booking = require('../models/Booking');
    const Transaction = require('../models/Transaction');

    try {
      const booking = await Booking.findOne({
        'escrowWallet.reference': data.booking_id || data.reference
      });

      if (!booking) {
        console.warn(`Booking not found for reference: ${data.booking_id || data.reference}`);
        return { success: false, message: 'Booking not found' };
      }

      booking.paymentStatus = 'paid';
      booking.status = 'confirmed';
      booking.escrowWallet.isPaid = true;
      booking.escrowWallet.paidAt = new Date();
      booking.escrowWallet.txHash = data.transaction_hash;
      await booking.save();

      await Transaction.create({
        user: booking.client,
        type: 'payment',
        amount: data.amount,
        currency: data.currency || 'USDT',
        status: 'completed',
        booking: booking._id,
        description: `Stablecoin payment for booking ${booking.bookingId}`,
        tsaraPaymentId: data.id || data.escrow_id,
        txHash: data.transaction_hash,
        completedAt: new Date()
      });

      return { success: true, bookingId: booking.bookingId };
    } catch (error) {
      console.error('Failed to handle payment:', error);
      throw error;
    }
  }

  async handlePaymentFailed(data) {
    const Booking = require('../models/Booking');

    try {
      const booking = await Booking.findOne({
        'escrowWallet.reference': data.booking_id || data.reference
      });

      if (booking) {
        booking.paymentStatus = 'failed';
        booking.escrowWallet.failedAt = new Date();
        booking.escrowWallet.failureReason = data.reason || 'Payment failed';
        await booking.save();
      }
    } catch (error) {
      console.error('Failed to update booking:', error);
    }

    return { success: true };
  }

  async handleWithdrawalCompleted(data) {
    const Transaction = require('../models/Transaction');

    try {
      const transaction = await Transaction.findOne({
        tsaraPaymentId: data.withdrawal_id
      });

      if (transaction) {
        transaction.status = 'completed';
        transaction.txHash = data.transaction_hash;
        transaction.completedAt = new Date();
        await transaction.save();
      }
    } catch (error) {
      console.error('Failed to update transaction:', error);
    }

    return { success: true };
  }

  async handleWithdrawalFailed(data) {
    const Transaction = require('../models/Transaction');

    try {
      const transaction = await Transaction.findOne({
        tsaraPaymentId: data.withdrawal_id
      });

      if (transaction) {
        transaction.status = 'failed';
        transaction.failureReason = data.reason || 'Withdrawal failed';
        await transaction.save();
      }
    } catch (error) {
      console.error('Failed to update transaction:', error);
    }

    return { success: true };
  }

  verifyWebhookSignature(payload, signature) {
    if (!signature || !payload) {
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return false;
    }
  }
}

module.exports = new TsaraService();
