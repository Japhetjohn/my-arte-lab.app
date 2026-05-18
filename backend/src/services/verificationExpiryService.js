const verificationService = require('./verificationService');

class VerificationExpiryService {
    constructor() {
        this.isRunning = false;
        this.interval = null;
        this.CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
    }

    start() {
        if (this.isRunning) return;
        console.log('🚀 [Verification Expiry] Starting subscription monitoring...');
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
        console.log('⏹️  [Verification Expiry] Stopped');
    }

    async runChecks() {
        try {
            // Process auto-renewals first
            await verificationService.processAutoRenewals();
            
            // Then expire any that weren't renewed
            const expiredCount = await verificationService.checkExpiredSubscriptions();
            
            if (expiredCount > 0) {
                console.log(`[Verification Expiry] Processed ${expiredCount} expired subscription(s)`);
            }
        } catch (error) {
            console.error('[Verification Expiry] Error during check:', error.message);
        }
    }
}

module.exports = new VerificationExpiryService();
