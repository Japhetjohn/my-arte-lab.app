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
   * Generate crypto wallet for stablecoin payments (Solana)
   * Uses Tsara's create-new-wallet endpoint (GET request)
   * @param {Object} userData - User information
   * @returns {Promise<Object>} Crypto wallet details
   */
  async generateWallet(userData) {
    try {
      console.log(`🔐 Generating Solana wallet for: ${userData.email}`);

      // Use the correct endpoint from Tsara API
      const response = await this.api.get('/create-new-wallet');

      if (response.data && response.data.data) {
        const walletData = response.data.data;
        console.log(`✅ Solana wallet created: ${walletData.publicKey}`);

        return {
          address: walletData.publicKey,
          currency: 'USDT', // Supports USDT/USDC on Solana
          balance: 0,
          network: 'Solana',
          type: 'crypto',
          // Store these securely if needed for user recovery (encrypted)
          mnemonic: walletData.mnemonic,
          secretKey: walletData.secretKey
        };
      }

      throw new Error('Invalid response from Tsara API');

    } catch (error) {
      console.error('❌ Wallet generation failed:', error.response ? error.response.data : error.message);
      throw new Error(`Wallet generation failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Generate crypto escrow wallet for booking payments using Tsara Business Checkout
   * @param {Object} bookingData - Booking information
   * @returns {Promise<Object>} Crypto escrow wallet details
   */
  async generateEscrowWallet(bookingData) {
    try {
      console.log(`🔐 Generating checkout session for booking: ${bookingData.bookingId}`);

      // Platform wallet address from environment
      const platformAddress = process.env.PLATFORM_WALLET_ADDRESS;
      const platformCommission = parseInt(process.env.PLATFORM_COMMISSION) || 10; // 10% default

      const response = await this.api.post('/business/checkout/create', {
        businessCollectionAddress: platformAddress,
        feeAddress: platformAddress,
        amount: bookingData.amount,
        tokenType: bookingData.currency || 'USDT',
        feeBps: platformCommission * 100, // Convert percentage to basis points (10% = 1000 bps)
        feeFlatAmount: 0
      });

      if (response.data && response.data.data) {
        const checkout = response.data.data;
        console.log(`✅ Checkout session created: ${checkout.depositAddress}`);

        return {
          address: checkout.depositAddress,
          amount: bookingData.amount,
          currency: bookingData.currency || 'USDT',
          escrowId: checkout.checkoutId,
          checkoutId: checkout.checkoutId,
          status: 'pending',
          network: 'Solana',
          reference: bookingData.bookingId,
          type: 'crypto',
          expiresAt: checkout.expiresAt
        };
      }

      throw new Error('Invalid response from Tsara API');

    } catch (error) {
      console.error('❌ Checkout session creation failed:', error.response ? error.response.data : error.message);
      throw new Error(`Checkout creation failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Check checkout session payment status
   * @param {String} checkoutId - Checkout session ID
   * @returns {Promise<Object>} Payment status
   */
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
      console.error('❌ Checkout status check failed:', error.response ? error.response.data : error.message);
      throw error;
    }
  }

  /**
   * Get USDT wallet balance on Solana
   * @param {String} address - Wallet address (Solana public key)
   * @returns {Promise<Object>} Wallet balance
   */
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
