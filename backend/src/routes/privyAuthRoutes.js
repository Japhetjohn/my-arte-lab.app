const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const solanaWalletService = require('../services/solanaWalletService');
const adminNotificationService = require('../services/adminNotificationService');

/**
 * Verify Privy token and create/login user
 */
router.post('/privy', async (req, res) => {
  try {
    const { privyToken, user: userData, isNewUser } = req.body;

    if (!privyToken || !userData || !userData.email) {
      return errorResponse(res, 400, 'Missing required fields');
    }

    // Verify Privy token by calling Privy API
    const privyResponse = await fetch(`https://auth.privy.io/api/v1/users/me`, {
      headers: {
        'Authorization': `Bearer ${privyToken}`,
        'privy-app-id': process.env.PRIVY_APP_ID
      }
    });

    if (!privyResponse.ok) {
      return errorResponse(res, 401, 'Invalid Privy token');
    }

    const privyUser = await privyResponse.json();

    // Find or create user
    let user = await User.findOne({ email: userData.email });

    if (!user) {
      // Create new user
      user = new User({
        name: userData.name,
        email: userData.email,
        role: userData.role || 'client',
        googleId: userData.googleId,
        profilePicture: userData.profilePicture,
        isEmailVerified: true, // Privy emails are verified
        password: 'N/A', // No password for OAuth users
        lastLogin: Date.now()
      });

      // Create Solana wallet for new user
      try {
        const walletData = await solanaWalletService.createWallet(user._id);
        user.wallet = {
          address: walletData.publicKey,
          balance: 0
        };
      } catch (walletError) {
        console.error('Failed to create Solana wallet:', walletError);
      }

      await user.save();

      // Notify admin of new user
      try {
        await adminNotificationService.notifyNewUser(user);
      } catch (error) {
        console.error('Failed to notify admin:', error);
      }
    } else {
      // Update existing user
      if (!user.googleId && userData.googleId) {
        user.googleId = userData.googleId;
      }
      if (!user.profilePicture && userData.profilePicture) {
        user.profilePicture = userData.profilePicture;
      }
      user.lastLogin = Date.now();
      await user.save();
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }
    );

    // Return user data and token
    successResponse(res, 200, isNewUser ? 'Account created successfully' : 'Login successful', {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        isEmailVerified: user.isEmailVerified,
        wallet: user.wallet
      },
      token,
      refreshToken
    });
  } catch (error) {
    console.error('Privy auth error:', error);
    errorResponse(res, 500, 'Authentication failed', error.message);
  }
});

module.exports = router;
