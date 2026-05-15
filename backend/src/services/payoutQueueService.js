/**
 * Payout Queue Service
 * 
 * PROBLEM SOLVED:
 * - HostFi has 1 USDC minimum withdrawal
 * - Per-client accumulation fails for one-time users
 * - Platform fees scattered across client accounts
 * 
 * SOLUTION:
 * - All payouts (creator + platform) are QUEUED internally
 * - A daily cron job batches all pending payouts
 * - Single HostFi withdrawal from shared pool, then distribute via Solana
 * - No per-client accumulation needed!
 */

const Transaction = require('../models/Transaction');
const User = require('../models/User');
const hostfiService = require('./hostfiService');
const solanaTransferService = require('./solanaTransferService');
const { PLATFORM_CONFIG } = require('../utils/constants');

const PLATFORM_WALLET_ADDRESS = process.env.PLATFORM_WALLET_ADDRESS || PLATFORM_CONFIG.PLATFORM_WALLET_ADDRESS;
const HOSTFI_MINIMUM_WITHDRAWAL = 1;

class PayoutQueueService {
  constructor() {
    this.isProcessing = false;
    solanaTransferService.init();
  }

  /**
   * Queue a creator payout (90%)
   * Called when client releases funds
   */
  async queueCreatorPayout(bookingId, creatorId, creatorWalletAddress, amount, currency = 'USDC') {
    try {
      console.log(`[PayoutQueue] Queuing creator payout: ${amount} ${currency} to ${creatorWalletAddress}`);

      const tx = await Transaction.create({
        transactionId: `PAYOUT-CREATOR-${Date.now()}`,
        user: creatorId,
        booking: bookingId,
        type: 'earning',
        amount: amount,
        currency: currency,
        status: 'pending_payout', // NEW STATUS: queued for batch processing
        description: `Creator payout (queued for batch)`,
        metadata: {
          payoutType: 'creator',
          recipientAddress: creatorWalletAddress,
          queuedAt: new Date().toISOString()
        }
      });

      console.log(`[PayoutQueue] ✓ Creator payout queued: ${tx.transactionId}`);
      return { success: true, transactionId: tx.transactionId, status: 'queued' };

    } catch (error) {
      console.error(`[PayoutQueue] Failed to queue creator payout:`, error.message);
      throw error;
    }
  }

  /**
   * Queue a platform fee (10%)
   * Called when client releases funds
   */
  async queuePlatformFee(bookingId, clientId, amount, currency = 'USDC') {
    try {
      console.log(`[PayoutQueue] Queuing platform fee: ${amount} ${currency}`);

      const tx = await Transaction.create({
        transactionId: `PAYOUT-PLATFORM-${Date.now()}`,
        user: clientId, // Track which client generated the fee
        booking: bookingId,
        type: 'platform_fee',
        amount: amount,
        currency: currency,
        status: 'pending_payout', // NEW STATUS
        description: `Platform fee (queued for batch)`,
        metadata: {
          payoutType: 'platform',
          recipientAddress: PLATFORM_WALLET_ADDRESS,
          queuedAt: new Date().toISOString()
        }
      });

      console.log(`[PayoutQueue] ✓ Platform fee queued: ${tx.transactionId}`);
      return { success: true, transactionId: tx.transactionId, status: 'queued' };

    } catch (error) {
      console.error(`[PayoutQueue] Failed to queue platform fee:`, error.message);
      throw error;
    }
  }

  /**
   * Get total pending payouts by type
   */
  async getPendingTotals() {
    const result = await Transaction.aggregate([
      {
        $match: {
          status: 'pending_payout',
          type: { $in: ['earning', 'platform_fee'] }
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const totals = { earning: 0, platform_fee: 0, total: 0, count: 0 };
    for (const item of result) {
      totals[item._id] = item.total;
      totals.total += item.total;
      totals.count += item.count;
    }

    return totals;
  }

  /**
   * Get all pending payouts
   */
  async getPendingPayouts() {
    return await Transaction.find({
      status: 'pending_payout',
      type: { $in: ['earning', 'platform_fee'] }
    }).sort({ createdAt: 1 }).lean();
  }

  /**
   * BATCH PROCESS: Process all pending payouts
   * This is called by a cron job (e.g., daily)
   * 
   * FLOW:
   * 1. Get total pending payouts
   * 2. If total < 1 USDC, skip (HostFi minimum)
   * 3. Withdraw total from HostFi shared pool → platform wallet
   * 4. From platform wallet, distribute to all recipients via Solana
   * 5. Mark all transactions as completed
   */
  async processBatchPayouts() {
    if (this.isProcessing) {
      console.log(`[PayoutQueue] Batch already in progress, skipping`);
      return { skipped: true, reason: 'Already processing' };
    }

    this.isProcessing = true;

    try {
      console.log(`[PayoutQueue] ═══════════════════════════════════════════════`);
      console.log(`[PayoutQueue] STARTING BATCH PAYOUT PROCESSING`);
      console.log(`[PayoutQueue] ═══════════════════════════════════════════════`);

      // 1. Get pending totals
      const pending = await this.getPendingTotals();
      console.log(`[PayoutQueue] Pending: ${pending.total} USDC (${pending.count} transactions)`);
      console.log(`[PayoutQueue]   - Creator payouts: ${pending.earning} USDC`);
      console.log(`[PayoutQueue]   - Platform fees: ${pending.platform_fee} USDC`);

      if (pending.total < HOSTFI_MINIMUM_WITHDRAWAL) {
        console.log(`[PayoutQueue] Total ${pending.total} below minimum ${HOSTFI_MINIMUM_WITHDRAWAL}, skipping`);
        return { 
          skipped: true, 
          reason: `Total ${pending.total} below minimum ${HOSTFI_MINIMUM_WITHDRAWAL}`,
          pending 
        };
      }

      // 2. Get platform's HostFi USDC asset (shared pool)
      const platformUser = await this._getPlatformHostFiUser();
      if (!platformUser?.wallet?.hostfiWalletAssets?.length) {
        throw new Error('Platform HostFi wallet not configured');
      }

      const usdcAsset = platformUser.wallet.hostfiWalletAssets.find(a => a.currency === 'USDC');
      if (!usdcAsset?.assetId) {
        throw new Error('Platform USDC asset not found');
      }

      // 3. Check HostFi balance
      const hostfiBalance = await this._getHostFiBalance(usdcAsset.assetId);
      console.log(`[PayoutQueue] HostFi available balance: ${hostfiBalance} USDC`);

      if (hostfiBalance < pending.total) {
        console.error(`[PayoutQueue] INSUFFICIENT BALANCE: Need ${pending.total}, have ${hostfiBalance}`);
        // Don't fail — just process what we can, or skip
        return {
          skipped: true,
          reason: `Insufficient HostFi balance: ${hostfiBalance} < ${pending.total}`,
          pending,
          hostfiBalance
        };
      }

      // 4. WITHDRAW total from HostFi → Platform Solana wallet
      // This is the SINGLE HostFi withdrawal that covers ALL pending payouts
      console.log(`[PayoutQueue] Withdrawing ${pending.total} USDC from HostFi to platform wallet...`);

      const withdrawal = await hostfiService.initiateWithdrawal({
        walletAssetId: usdcAsset.assetId,
        amount: pending.total,
        currency: 'USDC',
        methodId: 'CRYPTO',
        recipient: {
          type: 'CRYPTO',
          method: 'CRYPTO',
          currency: 'USDC',
          address: PLATFORM_WALLET_ADDRESS,
          network: 'SOL',
          country: 'NG'
        },
        clientReference: `BATCH-PAYOUT-${Date.now()}`,
        memo: `Batch payout: ${pending.count} transactions`
      });

      console.log(`[PayoutQueue] ✓ HostFi withdrawal: ${withdrawal.reference || withdrawal.id}`);

      // Wait a moment for the withdrawal to settle on-chain
      await new Promise(r => setTimeout(r, 5000));

      // 5. DISTRIBUTE via Solana direct transfers (no minimum!)
      const pendingTxs = await this.getPendingPayouts();
      const results = [];

      for (const tx of pendingTxs) {
        try {
          const recipient = tx.metadata?.recipientAddress;
          const amount = tx.amount;

          if (!recipient || !amount) {
            console.error(`[PayoutQueue] Invalid tx ${tx._id}: missing recipient or amount`);
            continue;
          }

          console.log(`[PayoutQueue] Sending ${amount} USDC to ${recipient}...`);

          // Use Solana direct transfer (no minimum!)
          const transfer = await solanaTransferService.transferUSDC(
            recipient,
            amount,
            `Payout: ${tx.booking}`
          );

          // Mark as completed
          await Transaction.updateOne(
            { _id: tx._id },
            {
              $set: {
                status: 'completed',
                transactionHash: transfer.signature,
                'metadata.batchReference': withdrawal.reference || withdrawal.id,
                'metadata.solanaSignature': transfer.signature,
                'metadata.explorerUrl': transfer.explorerUrl,
                'metadata.paidAt': new Date().toISOString()
              }
            }
          );

          results.push({
            transactionId: tx._id,
            type: tx.type,
            amount: amount,
            recipient: recipient,
            signature: transfer.signature,
            success: true
          });

          console.log(`[PayoutQueue] ✓ Sent: ${transfer.signature}`);

        } catch (transferError) {
          console.error(`[PayoutQueue] ✗ Failed to send ${tx.amount} to ${tx.metadata?.recipientAddress}:`, transferError.message);
          results.push({
            transactionId: tx._id,
            type: tx.type,
            amount: tx.amount,
            error: transferError.message,
            success: false
          });
          // Don't mark as failed — will retry next batch
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      console.log(`[PayoutQueue] ═══════════════════════════════════════════════`);
      console.log(`[PayoutQueue] BATCH COMPLETE: ${successCount} sent, ${failCount} failed`);
      console.log(`[PayoutQueue] ═══════════════════════════════════════════════`);

      return {
        success: true,
        batchReference: withdrawal.reference || withdrawal.id,
        totalAmount: pending.total,
        processed: successCount,
        failed: failCount,
        results,
        hostfiWithdrawal: withdrawal
      };

    } catch (error) {
      console.error(`[PayoutQueue] Batch processing failed:`, error.message);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get or create the platform's HostFi user
   * This is a special user that holds the shared HostFi assets
   */
  async _getPlatformHostFiUser() {
    // The platform uses the client user's HostFi asset for withdrawals
    // In practice, this is the HOSTFI_CLIENT_USER_ID user
    const clientUserId = process.env.HOSTFI_CLIENT_USER_ID;
    if (clientUserId) {
      return await User.findById(clientUserId);
    }
    
    // Fallback: find any user with HostFi assets
    return await User.findOne({
      'wallet.hostfiWalletAssets': { $exists: true, $ne: [] }
    });
  }

  /**
   * Get actual HostFi balance for an asset
   */
  async _getHostFiBalance(assetId) {
    try {
      const asset = await hostfiService.getWalletAsset(assetId);
      return parseFloat(asset?.balance || 0);
    } catch (error) {
      console.error(`[PayoutQueue] Failed to get HostFi balance:`, error.message);
      return 0;
    }
  }

  /**
   * Manual retry: Process a specific pending payout immediately
   * For admin use or urgent payouts
   */
  async processSinglePayout(transactionId) {
    const tx = await Transaction.findById(transactionId);
    if (!tx || tx.status !== 'pending_payout') {
      throw new Error('Transaction not found or not in pending_payout status');
    }

    const recipient = tx.metadata?.recipientAddress;
    const amount = tx.amount;

    // Try Solana direct transfer
    const transfer = await solanaTransferService.transferUSDC(
      recipient,
      amount,
      `Manual payout: ${tx.booking}`
    );

    await Transaction.updateOne(
      { _id: tx._id },
      {
        $set: {
          status: 'completed',
          transactionHash: transfer.signature,
          'metadata.solanaSignature': transfer.signature,
          'metadata.explorerUrl': transfer.explorerUrl,
          'metadata.paidAt': new Date().toISOString()
        }
      }
    );

    return { success: true, signature: transfer.signature };
  }
}

module.exports = new PayoutQueueService();
