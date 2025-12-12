const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const adminNotificationService = require('../services/adminNotificationService');
const { Keypair } = require('@solana/web3.js');
const crypto = require('crypto');

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

    // Find or create user (with duplicate handling)
    let user = await User.findOne({ email: userData.email });

    if (!user) {
      // Create new user with manually generated Solana wallet
      console.log('Creating new user with manual Solana wallet generation');

      // Generate new Solana keypair
      const keypair = Keypair.generate();
      const walletAddress = keypair.publicKey.toString();

      // Encrypt private key before storing
      const encryptionKey = process.env.WALLET_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey.slice(0, 64), 'hex'), iv);
      let encryptedPrivateKey = cipher.update(Buffer.from(keypair.secretKey));
      encryptedPrivateKey = Buffer.concat([encryptedPrivateKey, cipher.final()]);
      const encryptedKey = iv.toString('hex') + ':' + encryptedPrivateKey.toString('hex');

      const newUserData = {
        name: userData.name,
        email: userData.email,
        role: userData.role || 'client',
        googleId: userData.googleId,
        profilePicture: userData.profilePicture,
        isEmailVerified: true, // Privy emails are verified
        password: 'OAUTH_USER_NO_PASSWORD', // Placeholder for OAuth users
        lastLogin: Date.now(),
        wallet: {
          address: walletAddress,
          encryptedPrivateKey: encryptedKey,
          balance: 0,
          currency: 'USDC',
          network: 'Solana'
        }
      };

      console.log('✅ Creating new user with Solana wallet:', walletAddress);

      try {
        user = new User(newUserData);
        await user.save();
      } catch (error) {
        // Handle duplicate key error (race condition)
        if (error.code === 11000) {
          console.log('⚠️ User already exists (race condition), fetching existing user');
          user = await User.findOne({ email: userData.email });
        } else {
          throw error;
        }
      }
    } else {
      // Update existing user
      if (!user.googleId && userData.googleId) {
        user.googleId = userData.googleId;
      }
      if (!user.profilePicture && userData.profilePicture) {
        user.profilePicture = userData.profilePicture;
      }
      // Generate wallet for existing users who don't have one
      if (!user.wallet?.address) {
        console.log('✅ Generating Solana wallet for existing user');
        const keypair = Keypair.generate();
        const walletAddress = keypair.publicKey.toString();

        const encryptionKey = process.env.WALLET_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey.slice(0, 64), 'hex'), iv);
        let encryptedPrivateKey = cipher.update(Buffer.from(keypair.secretKey));
        encryptedPrivateKey = Buffer.concat([encryptedPrivateKey, cipher.final()]);
        const encryptedKey = iv.toString('hex') + ':' + encryptedPrivateKey.toString('hex');

        user.wallet = {
          address: walletAddress,
          encryptedPrivateKey: encryptedKey,
          balance: user.wallet?.balance || 0,
          currency: 'USDC',
          network: 'Solana'
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
