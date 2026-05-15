/**
 * Daily Platform Fee Batch Withdrawal Cron
 * 
 * Runs every day at midnight (00:00 UTC)
 * Withdraws ALL accumulated platform fees to the platform wallet
 */

const cron = require('node-cron');
const platformFeeAccumulator = require('../services/platformFeeAccumulator');

let isScheduled = false;

/**
 * Start the daily platform fee cron job
 */
function startPayoutCron() {
  if (isScheduled) {
    console.log('[PayoutCron] Already scheduled, skipping');
    return;
  }

  // Run daily at 00:00 UTC (midnight)
  const task = cron.schedule('0 0 * * *', async () => {
    console.log('[PayoutCron] ⏰ Daily platform fee batch starting...');
    
    try {
      const result = await platformFeeAccumulator.processDailyBatchWithdrawal();
      
      if (result.skipped) {
        console.log(`[PayoutCron] Skipped: ${result.reason}`);
      } else {
        console.log(`[PayoutCron] ✓ Batch complete: ${result.amount} USDC withdrawn (${result.feesCount} fees)`);
      }
    } catch (error) {
      console.error('[PayoutCron] ✗ Daily batch failed:', error.message);
    }
  }, {
    scheduled: true,
    timezone: 'UTC'
  });

  isScheduled = true;
  console.log('[PayoutCron] ✅ Scheduled: Daily at 00:00 UTC (midnight)');
  
  return task;
}

/**
 * Run daily batch immediately (for manual trigger)
 */
async function runPayoutJobNow() {
  console.log('[PayoutCron] Manual trigger: Starting daily batch...');
  return await platformFeeAccumulator.processDailyBatchWithdrawal();
}

/**
 * Get next scheduled run time
 */
function getNextRunTime() {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(0, 0, 0, 0);
  
  if (next <= now) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  
  return next;
}

module.exports = {
  startPayoutCron,
  runPayoutJobNow,
  getNextRunTime
};
