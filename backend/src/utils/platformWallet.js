const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { PLATFORM_CONFIG } = require('./constants');

/**
 * Generate a temporary wallet address for platform fees
 * This wallet acts as an intermediary before forwarding to main platform wallet
 * Security measure to prevent tracking of main platform wallet
 */
function generateTempPlatformWallet(transactionId) {
  // Generate a unique wallet address based on transaction ID
  const uniqueId = uuidv4();
  const hash = crypto.createHash('sha256')
    .update(`platform-fee-${transactionId}-${uniqueId}`)
    .digest('hex')
    .substring(0, 32);

  return `TEMP-PLT-${hash}`;
}

/**
 * Get the main platform wallet address
 */
function getMainPlatformWallet() {
  return PLATFORM_CONFIG.PLATFORM_WALLET_ADDRESS;
}

/**
 * Check if temp wallets should be used
 */
function shouldUseTempWallets() {
  return PLATFORM_CONFIG.USE_TEMP_WALLETS;
}

/**
 * Get the destination wallet for platform fee
 * Returns temp wallet if enabled, otherwise main platform wallet
 */
function getPlatformFeeDestination(transactionId) {
  if (shouldUseTempWallets()) {
    return {
      address: generateTempPlatformWallet(transactionId),
      isTemp: true,
      mainWallet: getMainPlatformWallet()
    };
  }

  return {
    address: getMainPlatformWallet(),
    isTemp: false,
    mainWallet: getMainPlatformWallet()
  };
}

module.exports = {
  generateTempPlatformWallet,
  getMainPlatformWallet,
  shouldUseTempWallets,
  getPlatformFeeDestination
};
