/**
 * Payout Cron Job
 * Runs daily to batch-process all pending payouts
 * 
 * Schedule: Every day at 2:00 AM UTC (low traffic time)
 * Can also be triggered manually via admin endpoint
 */

const cron = require('node-cron');
const payoutQueueService = require('../services/payoutQueueService');

let isScheduled = false;

/**
 * Start the payout cron job
 */
function startPayoutCron() {
  if (isScheduled) {
    console.log('[PayoutCron] Already scheduled, skipping');
    return;
  }

  // Run daily at 2:00 AM UTC
  // Format: second minute hour day month day-of-week
  const task = cron.schedule('0 2 * * *', async () => {
    console.log('[PayoutCron] ⏰ Daily batch payout job starting...');
    
    try {
      const result = await payoutQueueService.processBatchPayouts();
      
      if (result.skipped) {
        console.log(`[PayoutCron] Skipped: ${result.reason}`);
      } else {
        console.log(`[PayoutCron] ✓ Batch complete: ${result.processed} processed, ${result.failed} failed`);
      }
    } catch (error) {
      console.error('[PayoutCron] ✗ Batch job failed:', error.message);
    }
  }, {
    scheduled: true,
    timezone: 'UTC'
  });

  isScheduled = true;
  console.log('[PayoutCron] ✅ Scheduled: Daily at 2:00 AM UTC');
  
  return task;
}

/**
 * Run payout job immediately (for manual trigger)
 */
async function runPayoutJobNow() {
  console.log('[PayoutCron] Manual trigger: Starting batch payout...');
  return await payoutQueueService.processBatchPayouts();
}

/**
 * Get next scheduled run time
 */
function getNextRunTime() {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(2, 0, 0, 0);
  
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
