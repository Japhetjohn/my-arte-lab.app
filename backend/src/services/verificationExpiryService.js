const verificationService = require('./verificationService');

/**
 * Lightweight maintenance service that handles auto-renewals and database expiry synchronization.
 */
class VerificationExpiryService {
    constructor() {
        this.isRunning = false;
        this.interval = null;
        this.CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
    }

    start() {
        if (this.isRunning) return;
        console.log('🚀 [Verification Maintenance] Starting auto-renewal and expiry monitoring...');
        this.isRunning = true;
        
        // Check every hour
        this.interval = setInterval(() => {
            this.runChecks();
        }, this.CHECK_INTERVAL_MS);
        
        // Run initial check after a short 5-second delay on server startup
        setTimeout(() => this.runChecks(), 5000);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isRunning = false;
        console.log('⏹️  [Verification Maintenance] Stopped');
    }

    async runChecks() {
        try {
            await verificationService.processAutoRenewals();
            await verificationService.syncExpiredSubscriptions();
        } catch (error) {
            console.error('[Verification Maintenance] Error during check:', error.message);
        }
    }
}

module.exports = new VerificationExpiryService();
