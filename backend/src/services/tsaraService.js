const axios = require('axios');
const crypto = require('crypto');
const tsaraConfig = require('../config/tsara');

/**
 * Tsara Payment Service
 * Handles all interactions with Tsara payment gateway
 * Documentation: https://github.com/usetsara/tsara-examples
 */

class TsaraService {
  constructor() {
    this.apiUrl = tsaraConfig.apiUrl;
    this.publicKey = tsaraConfig.publicKey;
    this.secretKey = tsaraConfig.secretKey;
    this.webhookSecret = tsaraConfig.webhookSecret;

    // Initialize axios instance with default config
    this.api = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
        'X-Public-Key': this.publicKey
      },
      timeout: 30000
    });
  }

  /**
   * Generate a new wallet address for a user
   * @param {Object} userData - User information
   * @returns {Promise<Object>} Wallet details {address, currency}
   */
  async generateWallet(userData) {
    try {
      console.log(`🔐 Generating Tsara wallet for user: ${userData.email}`);

      const response = await this.api.post('/wallets/generate', {
        user_id: userData.userId,
        email: userData.email,
        name: userData.name,
        currency: 'USDT', // Default to USDT
        metadata: {
          platform: 'myartelab',
          role: userData.role
        }
      });

      if (response.data && response.data.wallet) {
        console.log(`✅ Wallet generated: ${response.data.wallet.address}`);
        return {
          address: response.data.wallet.address,
          currency: response.data.wallet.currency || 'USDT',
          balance: 0
        };
      }

      throw new Error('Invalid response from Tsara API');

    } catch (error) {
      console.error('❌ Wallet generation failed:', error.message);

      // Fallback: Generate a temporary mock wallet for development
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Using mock wallet address for development');
        const mockAddress = `0x${crypto.randomBytes(20).toString('hex')}`;
        return {
          address: mockAddress,
          currency: 'USDT',
          balance: 0
        };
      }

      throw error;
    }
  }

  /**
   * Generate escrow wallet address for a booking
   * @param {Object} bookingData - Booking information
   * @returns {Promise<Object>} Escrow wallet details
   */
  async generateEscrowWallet(bookingData) {
    try {
      console.log(`🔐 Generating escrow wallet for booking: ${bookingData.bookingId}`);

      const response = await this.api.post('/wallets/escrow/generate', {
        booking_id: bookingData.bookingId,
        amount: bookingData.amount,
        currency: bookingData.currency || 'USDT',
        client_id: bookingData.clientId,
        creator_id: bookingData.creatorId,
        metadata: {
          platform: 'myartelab',
          service: bookingData.serviceTitle
        }
      });

      if (response.data && response.data.escrow) {
        console.log(`✅ Escrow wallet generated: ${response.data.escrow.address}`);
        return {
          address: response.data.escrow.address,
          currency: response.data.escrow.currency || 'USDT',
          balance: 0
        };
      }

      throw new Error('Invalid response from Tsara API');

    } catch (error) {
      console.error('❌ Escrow wallet generation failed:', error.message);

      // Fallback: Generate mock escrow wallet for development
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Using mock escrow address for development');
        const mockAddress = `0xESCROW${crypto.randomBytes(18).toString('hex')}`;
        return {
          address: mockAddress,
          currency: bookingData.currency || 'USDT',
          balance: 0
        };
      }

      throw error;
    }
  }

  /**
   * Check payment status for an escrow wallet
   * @param {String} escrowAddress - Escrow wallet address
   * @returns {Promise<Object>} Payment status details
   */
  async checkEscrowPayment(escrowAddress) {
    try {
      const response = await this.api.get(`/wallets/escrow/${escrowAddress}/status`);

      if (response.data) {
        return {
          isPaid: response.data.status === 'paid',
          balance: response.data.balance || 0,
          currency: response.data.currency,
          transactionHash: response.data.transaction_hash,
          paidAt: response.data.paid_at,
          confirmations: response.data.confirmations || 0
        };
      }

      throw new Error('Invalid response from Tsara API');

    } catch (error) {
      console.error('❌ Failed to check escrow payment:', error.message);
      throw error;
    }
  }

  /**
   * Release escrow funds (split between creator and platform)
   * @param {Object} releaseData - Release information
   * @returns {Promise<Object>} Release transaction details
   */
  async releaseEscrowFunds(releaseData) {
    try {
      const {
        escrowAddress,
        creatorAddress,
        platformAddress,
        creatorAmount,
        platformFee,
        currency,
        bookingId
      } = releaseData;

      console.log(`💸 Releasing escrow funds for booking: ${bookingId}`);
      console.log(`   - Creator: ${creatorAmount} ${currency} → ${creatorAddress}`);
      console.log(`   - Platform: ${platformFee} ${currency} → ${platformAddress}`);

      const response = await this.api.post('/wallets/escrow/release', {
        escrow_address: escrowAddress,
        distributions: [
          {
            address: creatorAddress,
            amount: creatorAmount,
            currency,
            type: 'creator_payment'
          },
          {
            address: platformAddress,
            amount: platformFee,
            currency,
            type: 'platform_fee'
          }
        ],
        booking_id: bookingId,
        metadata: {
          platform: 'myartelab'
        }
      });

      if (response.data && response.data.transactions) {
        console.log('✅ Escrow funds released successfully');
        return {
          success: true,
          creatorTransaction: response.data.transactions.find(tx => tx.type === 'creator_payment'),
          platformTransaction: response.data.transactions.find(tx => tx.type === 'platform_fee')
        };
      }

      throw new Error('Invalid response from Tsara API');

    } catch (error) {
      console.error('❌ Failed to release escrow funds:', error.message);
      throw error;
    }
  }

  /**
   * Process withdrawal request for a creator
   * @param {Object} withdrawalData - Withdrawal information
   * @returns {Promise<Object>} Withdrawal transaction details
   */
  async processWithdrawal(withdrawalData) {
    try {
      const {
        userWalletAddress,
        externalAddress,
        amount,
        currency,
        userId
      } = withdrawalData;

      console.log(`💰 Processing withdrawal: ${amount} ${currency}`);

      const response = await this.api.post('/withdrawals/create', {
        from_address: userWalletAddress,
        to_address: externalAddress,
        amount,
        currency,
        user_id: userId,
        metadata: {
          platform: 'myartelab',
          type: 'creator_withdrawal'
        }
      });

      if (response.data && response.data.withdrawal) {
        console.log('✅ Withdrawal initiated successfully');
        return {
          success: true,
          withdrawalId: response.data.withdrawal.id,
          status: response.data.withdrawal.status,
          transactionHash: response.data.withdrawal.transaction_hash,
          estimatedTime: response.data.withdrawal.estimated_time
        };
      }

      throw new Error('Invalid response from Tsara API');

    } catch (error) {
      console.error('❌ Withdrawal processing failed:', error.message);
      throw error;
    }
  }

  /**
   * Get wallet balance
   * @param {String} walletAddress - Wallet address
   * @returns {Promise<Object>} Balance details
   */
  async getWalletBalance(walletAddress) {
    try {
      const response = await this.api.get(`/wallets/${walletAddress}/balance`);

      if (response.data) {
        return {
          balance: response.data.balance || 0,
          currency: response.data.currency,
          lastUpdated: response.data.last_updated
        };
      }

      throw new Error('Invalid response from Tsara API');

    } catch (error) {
      console.error('❌ Failed to get wallet balance:', error.message);
      // Return 0 balance on error
      return { balance: 0, currency: 'USDT' };
    }
  }

  /**
   * Get transaction details
   * @param {String} transactionHash - Transaction hash
   * @returns {Promise<Object>} Transaction details
   */
  async getTransaction(transactionHash) {
    try {
      const response = await this.api.get(`/transactions/${transactionHash}`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get transaction:', error.message);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   * @param {String} payload - Webhook payload (raw body)
   * @param {String} signature - Signature from header
   * @returns {Boolean} Is signature valid
   */
  verifyWebhookSignature(payload, signature) {
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
      console.error('❌ Webhook signature verification failed:', error.message);
      return false;
    }
  }

  /**
   * Handle webhook event
   * @param {Object} event - Webhook event data
   * @returns {Promise<Object>} Processing result
   */
  async handleWebhookEvent(event) {
    const { type, data } = event;

    console.log(`🔔 Processing webhook event: ${type}`);

    switch (type) {
      case tsaraConfig.events.PAYMENT_SUCCESS:
        return await this.handlePaymentSuccess(data);

      case tsaraConfig.events.PAYMENT_FAILED:
        return await this.handlePaymentFailed(data);

      case tsaraConfig.events.WITHDRAWAL_COMPLETED:
        return await this.handleWithdrawalCompleted(data);

      case tsaraConfig.events.WITHDRAWAL_FAILED:
        return await this.handleWithdrawalFailed(data);

      default:
        console.warn(`⚠️ Unknown webhook event type: ${type}`);
        return { success: true, message: 'Event type not handled' };
    }
  }

  /**
   * Handle payment success webhook
   * @private
   */
  async handlePaymentSuccess(data) {
    const Booking = require('../models/Booking');
    const Transaction = require('../models/Transaction');

    try {
      // Find booking by escrow address
      const booking = await Booking.findOne({
        'escrowWallet.address': data.wallet_address
      });

      if (!booking) {
        console.warn(`⚠️ Booking not found for wallet: ${data.wallet_address}`);
        return { success: false, message: 'Booking not found' };
      }

      // Update booking payment status
      booking.escrowWallet.isPaid = true;
      booking.escrowWallet.paidAt = new Date();
      booking.escrowWallet.balance = data.amount;
      booking.escrowWallet.transactionHash = data.transaction_hash;
      booking.paymentStatus = 'paid';
      booking.status = 'confirmed';
      await booking.save();

      // Create transaction record
      await Transaction.create({
        user: booking.client,
        type: 'payment',
        amount: data.amount,
        currency: data.currency,
        status: 'completed',
        booking: booking._id,
        toAddress: data.wallet_address,
        transactionHash: data.transaction_hash,
        description: `Payment for booking ${booking.bookingId}`,
        tsaraPaymentId: data.payment_id,
        completedAt: new Date()
      });

      console.log(`✅ Payment processed for booking: ${booking.bookingId}`);

      return { success: true, bookingId: booking.bookingId };
    } catch (error) {
      console.error('❌ Failed to handle payment success:', error.message);
      throw error;
    }
  }

  /**
   * Handle payment failed webhook
   * @private
   */
  async handlePaymentFailed(data) {
    const Booking = require('../models/Booking');

    try {
      const booking = await Booking.findOne({
        'escrowWallet.address': data.wallet_address
      });

      if (booking) {
        booking.paymentStatus = 'failed';
        await booking.save();
        console.log(`⚠️ Payment failed for booking: ${booking.bookingId}`);
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Failed to handle payment failure:', error.message);
      throw error;
    }
  }

  /**
   * Handle withdrawal completed webhook
   * @private
   */
  async handleWithdrawalCompleted(data) {
    const Transaction = require('../models/Transaction');
    const User = require('../models/User');

    try {
      // Find transaction by Tsara payment ID
      const transaction = await Transaction.findOne({
        tsaraPaymentId: data.withdrawal_id
      });

      if (transaction) {
        await transaction.markCompleted(data.transaction_hash);

        // Update user wallet balance
        const user = await User.findById(transaction.user);
        if (user) {
          await user.updateWalletBalance(transaction.amount, 'subtract');
        }

        console.log(`✅ Withdrawal completed: ${transaction.transactionId}`);
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Failed to handle withdrawal completion:', error.message);
      throw error;
    }
  }

  /**
   * Handle withdrawal failed webhook
   * @private
   */
  async handleWithdrawalFailed(data) {
    const Transaction = require('../models/Transaction');

    try {
      const transaction = await Transaction.findOne({
        tsaraPaymentId: data.withdrawal_id
      });

      if (transaction) {
        await transaction.markFailed(data.error_message, data.error_code);
        console.log(`⚠️ Withdrawal failed: ${transaction.transactionId}`);
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Failed to handle withdrawal failure:', error.message);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new TsaraService();
