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
    data: {
      wallet: {
        balance: 0,
        pendingBalance: 0,
        currency: 'USDC',
        network: 'HostFi',
        address: null
      }
    },
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

// Add transactions route for backwards compatibility
router.get('/transactions', (req, res) => {
  res.json({
    success: true,
    message: 'Wallet transactions have moved to HostFi integration',
    redirectTo: '/api/hostfi/wallet/transactions',
    data: {
      transactions: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: 10
      }
    }
  });
});

module.exports = router;
