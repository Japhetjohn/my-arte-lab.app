const axios = require('axios');
const crypto = require('crypto');
const tsaraConfig = require('../config/tsara');

/**
 * Tsara Stablecoin Payment Service
 * Solana-based stablecoin payments (USDT, USDC, DAI)
 *
 * Documentation: https://docs.tsara.ng/stablecoin
 */

class TsaraService {
  constructor() {
    this.apiUrl = tsaraConfig.apiUrl;
    this.publicKey = tsaraConfig.publicKey;
    this.secretKey = tsaraConfig.secretKey;
    this.webhookSecret = tsaraConfig.webhookSecret;

    // Crypto API instance (JSON requests, secret key auth)
    this.api = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Authorization': `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
        'X-Public-Key': this.publicKey
      },
      timeout: 30000
    });

    console.log(`💳 Tsara Stablecoin Service - Solana Network`);
  }

  /**
   * Generate crypto wallet for stablecoin payments
   * @param {Object} userData - User information
   * @returns {Promise<Object>} Crypto wallet details
   */
  async generateWallet(userData) {
    try {
      console.log(`🔐 Generating wallet for: ${userData.email}`);

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
          balance: 0,
          network: response.data.wallet.network || 'Solana',
          type: 'crypto'
        };
      }

      throw new Error('Invalid response from Tsara API');

    } catch (error) {
      console.error('❌ Wallet generation failed:', error.response ? error.response.data : error.message);
      throw new Error(`Wallet generation failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Generate crypto escrow wallet for booking payments
   * @param {Object} bookingData - Booking information
   * @returns {Promise<Object>} Crypto escrow wallet details
   */
  async generateEscrowWallet(bookingData) {
    try {
      console.log(`🔐 Generating escrow wallet for booking: ${bookingData.bookingId}`);

      const response = await this.api.post('/escrow/create', {
        booking_id: bookingData.bookingId,
        amount: bookingData.amount,
        currency: bookingData.currency || 'USDT',
        client_email: bookingData.clientEmail,
        creator_email: bookingData.creatorEmail,
        metadata: {
          platform: 'myartelab',
          booking_id: bookingData.bookingId
        }
      });

      if (response.data && response.data.escrow) {
        console.log(`✅ Escrow wallet created: ${response.data.escrow.address}`);
        return {
          address: response.data.escrow.address,
          amount: response.data.escrow.amount,
          currency: response.data.escrow.currency || 'USDT',
          escrowId: response.data.escrow.id,
          status: response.data.escrow.status || 'pending',
          network: response.data.escrow.network || 'Solana',
          reference: bookingData.bookingId,
          type: 'crypto'
        };
      }

      throw new Error('Invalid response from Tsara API');

    } catch (error) {
      console.error('❌ Escrow generation failed:', error.response ? error.response.data : error.message);
      throw new Error(`Escrow generation failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Check crypto escrow payment status
   * @param {String} escrowId - Escrow wallet ID
   * @returns {Promise<Object>} Payment status
   */
  async checkEscrowPayment(escrowId) {
    try {
      const response = await this.api.get(`/escrow/${escrowId}/status`);

      if (response.data && response.data.escrow) {
        const escrowData = response.data.escrow;

        return {
          isPaid: escrowData.status === 'paid',
          status: escrowData.status,
          amount: escrowData.amount,
          paidAmount: escrowData.paid_amount || 0,
          currency: escrowData.currency || 'USDT',
          address: escrowData.address,
          txHash: escrowData.transaction_hash
        };
      }

      throw new Error('Invalid response from Tsara API');

    } catch (error) {
      console.error('❌ Escrow status check failed:', error.response ? error.response.data : error.message);
      throw error;
    }
  }

  /**
   * Get crypto wallet balance
   * @param {String} address - Wallet address
   * @returns {Promise<Object>} Wallet balance
   */
  async getWalletBalance(address) {
    try {
      const response = await this.api.get(`/wallets/${address}/balance`);

      if (response.data && response.data.wallet) {
        return {
          balance: response.data.wallet.balance || 0,
          currency: response.data.wallet.currency || 'USDT',
          network: 'Solana',
          type: 'crypto'
        };
      }

      throw new Error('Invalid response from Tsara API');

    } catch (error) {
      console.error('❌ Balance check failed:', error.response ? error.response.data : error.message);
      return { balance: 0, currency: 'USDT', network: 'Solana', type: 'crypto' };
    }
  }

  /**
   * Release escrow funds to creator and platform
   * @param {Object} releaseData - Release information
   * @returns {Promise<Object>} Release result
   */
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

      console.log(`💸 Releasing escrow funds for booking: ${bookingId}`);

      // Release to creator
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

      // Release platform fee
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

      console.log('✅ Escrow funds released successfully');

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
      console.error('❌ Escrow release failed:', error.response ? error.response.data : error.message);
      throw new Error(`Escrow release failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Process withdrawal to external crypto wallet
   * @param {Object} withdrawalData - Withdrawal information
   * @returns {Promise<Object>} Withdrawal result
   */
  async processWithdrawal(withdrawalData) {
    try {
      const {
        fromAddress,
        toAddress,
        amount,
        currency,
        memo
      } = withdrawalData;

      console.log(`💰 Processing withdrawal: ${amount} ${currency}`);

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
        console.log('✅ Withdrawal initiated');

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
      console.error('❌ Withdrawal failed:', error.response ? error.response.data : error.message);
      throw new Error(`Withdrawal failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Handle webhook event from Tsara
   * @param {Object} event - Webhook event data
   * @returns {Promise<Object>} Processing result
   */
  async handleWebhookEvent(event) {
    const { type, data } = event;

    console.log(`🔔 Processing webhook event: ${type}`);

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
          console.warn(`⚠️ Unknown webhook event type: ${type}`);
          return { success: true, message: 'Event type not handled' };
      }
    } catch (error) {
      console.error('❌ Webhook processing failed:', error);
      throw error;
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
      const booking = await Booking.findOne({
        'escrowWallet.reference': data.booking_id || data.reference
      });

      if (!booking) {
        console.warn(`⚠️ Booking not found for reference: ${data.booking_id || data.reference}`);
        return { success: false, message: 'Booking not found' };
      }

      // Update booking
      booking.paymentStatus = 'paid';
      booking.status = 'confirmed';
      booking.escrowWallet.isPaid = true;
      booking.escrowWallet.paidAt = new Date();
      booking.escrowWallet.txHash = data.transaction_hash;
      await booking.save();

      // Create transaction record
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

      console.log(`✅ Payment processed for booking: ${booking.bookingId}`);

      return { success: true, bookingId: booking.bookingId };
    } catch (error) {
      console.error('❌ Failed to handle payment:', error);
      throw error;
    }
  }

  /**
   * Handle payment failed webhook
   * @private
   */
  async handlePaymentFailed(data) {
    console.log(`⚠️ Payment failed:`, data.booking_id || data.reference);

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
      console.error('❌ Failed to update booking:', error);
    }

    return { success: true };
  }

  /**
   * Handle withdrawal completed webhook
   * @private
   */
  async handleWithdrawalCompleted(data) {
    console.log(`✅ Withdrawal completed:`, data.withdrawal_id);

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
      console.error('❌ Failed to update transaction:', error);
    }

    return { success: true };
  }

  /**
   * Handle withdrawal failed webhook
   * @private
   */
  async handleWithdrawalFailed(data) {
    console.log(`⚠️ Withdrawal failed:`, data.withdrawal_id);

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
      console.error('❌ Failed to update transaction:', error);
    }

    return { success: true };
  }
}

// Export singleton instance
module.exports = new TsaraService();
