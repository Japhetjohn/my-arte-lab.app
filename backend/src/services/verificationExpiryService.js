const verificationService = require('./verificationService');

/**
 * Lightweight cron that only handles auto-renewals.
 * Subscription expiry is computed on-the-fly — no need to update DB.
 * The badge disappears automatically when expiresAt + grace period passes.
 */
class VerificationExpiryService {
    constructor() {
        this.isRunning = false;
        this.interval = null;
        this.CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
    }

    start() {
        if (this.isRunning) return;
        console.log('🚀 [Verification Renewal] Starting auto-renewal monitoring...');
        this.isRunning = true;
        
        // Check every hour
        this.interval = setInterval(() => {
            this.runChecks();
        }, this.CHECK_INTERVAL_MS);
        
        // Run first check after a short delay
        setTimeout(() => this.runChecks(), 10000);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isRunning = false;
        console.log('⏹️  [Verification Renewal] Stopped');
    }

    async runChecks() {
        try {
            // Only process auto-renewals — expiry is computed on-the-fly
            await verificationService.processAutoRenewals();
        } catch (error) {
            console.error('[Verification Renewal] Error during check:', error.message);
        }
    }
}

module.exports = new VerificationExpiryService();
