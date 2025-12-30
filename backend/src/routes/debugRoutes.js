const express = require('express');
const router = express.Router();

// Temporary debug endpoint - REMOVE AFTER FIXING
router.get('/test-wallet', async (req, res) => {
  try {
    const solanaWalletService = require('../services/solanaWalletService');
    const wallet = solanaWalletService.generateWallet();
    res.json({ success: true, message: 'Wallet generation works!', walletAddress: wallet.address });
  } catch (error) {
    res.json({ success: false, error: error.message, stack: error.stack });
  }
});

router.get('/test-user-create', async (req, res) => {
  try {
    const User = require('../models/User');
    const solanaWalletService = require('../services/solanaWalletService');

    const wallet = solanaWalletService.generateWallet();

    const testUser = {
      firstName: 'Debug',
      lastName: 'Test',
      email: `debugtest${Date.now()}@example.com`,
      password: 'TestPass123!',
      role: 'creator',
      category: 'photographer',
      location: {
        localArea: 'Tanke',
        state: 'Kwara',
        country: 'Nigeria'
      },
      wallet: {
        address: wallet.address,
        encryptedPrivateKey: wallet.encryptedPrivateKey,
        currency: wallet.currency || 'USDC',
        balance: 0,
        pendingBalance: 0,
        totalEarnings: 0,
        network: 'Solana'
      }
    };

    const user = await User.create(testUser);

    res.json({ success: true, message: 'User creation works!', userId: user._id });
  } catch (error) {
    res.json({ success: false, error: error.message, stack: error.stack, name: error.name });
  }
});

module.exports = router;
