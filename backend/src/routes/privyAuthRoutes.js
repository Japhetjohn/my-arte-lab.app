const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const adminNotificationService = require('../services/adminNotificationService');

// Create JWKS client for Privy token verification
const client = jwksClient({
  jwksUri: `https://auth.privy.io/api/v1/apps/${process.env.PRIVY_APP_ID}/jwks.json`,
  cache: true,
  cacheMaxAge: 86400000 // 24 hours
});

// Helper function to get signing key
function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

// Helper function to verify Privy token using JWKS
function verifyPrivyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, {
      algorithms: ['ES256'],
      issuer: 'privy.io',
      audience: process.env.PRIVY_APP_ID
    }, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded);
      }
    });
  });
}

/**
 * Verify Privy token and create/login user
 */
router.post('/privy', async (req, res) => {
  try {
    console.log('=== Privy Auth Request Received ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Headers:', req.headers);

    const { privyToken, user: userData, isNewUser } = req.body;

    console.log('Extracted data:', {
      hasPrivyToken: !!privyToken,
      hasUserData: !!userData,
      userDataEmail: userData?.email,
      isNewUser
    });

    if (!privyToken || !userData || !userData.email) {
      console.log('❌ Missing required fields:', {
        privyToken: !!privyToken,
        userData: !!userData,
        email: userData?.email
      });
      return errorResponse(res, 400, 'Missing required fields');
    }

    // Verify Privy token using JWKS
    let decodedToken;
    try {
      decodedToken = await verifyPrivyToken(privyToken);
      console.log('✅ Privy token verified successfully:', decodedToken.sub);
    } catch (error) {
      console.error('❌ Privy token verification failed:', error.message);
      return errorResponse(res, 401, 'Invalid Privy token');
    }

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

      // Use Privy's embedded wallet (if available)
      if (userData.walletAddress) {
        console.log('✅ Using Privy embedded wallet:', userData.walletAddress);
        user.wallet = {
          address: userData.walletAddress,
          balance: 0
        };
      } else {
        console.log('⚠️ No wallet from Privy, will be created on first login');
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
      // Update wallet address if provided by Privy and not already set
      if (userData.walletAddress && !user.wallet?.address) {
        console.log('✅ Adding Privy wallet to existing user:', userData.walletAddress);
        user.wallet = {
          address: userData.walletAddress,
          balance: user.wallet?.balance || 0
        };
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
