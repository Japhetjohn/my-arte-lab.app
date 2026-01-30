const express = require('express');
const router = express.Router();

/**
 * Wallet Routes
 *
 * All wallet functionality has been moved to HostFi integration.
 * Please use /api/hostfi endpoints for all wallet operations.
 *
 * This route file is kept for backwards compatibility.
 */

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Wallet functionality has moved to HostFi integration',
    redirectTo: '/api/hostfi/wallet',
    endpoints: {
      wallet: '/api/hostfi/wallet',
      transactions: '/api/hostfi/wallet/transactions',
      onRamp: {
        crypto: '/api/hostfi/collections/crypto/address',
        fiat: '/api/hostfi/collections/fiat/channel'
      },
      offRamp: {
        withdraw: '/api/hostfi/withdrawal/initiate',
        status: '/api/hostfi/withdrawal/status/:reference'
      }
    }
  });
});

module.exports = router;
