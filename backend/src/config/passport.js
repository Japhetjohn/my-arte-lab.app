const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const crypto = require('crypto');
const adminNotificationService = require('../services/adminNotificationService');
const solanaWalletService = require('../services/solanaWalletService');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
      passReqToCallback: true
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const mode = req.oauthMode || 'signin';
        const requestedRole = req.oauthRole || 'client';

        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          if (mode === 'signup') {
            return done(new Error('Account already exists. Please sign in instead.'), null);
          }
          return done(null, user);
        }

        user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          if (mode === 'signup') {
            return done(new Error('An account with this email already exists. Please sign in instead.'), null);
          }

          user.googleId = profile.id;
          user.isEmailVerified = true;

          if (!user.avatar && profile.photos && profile.photos.length > 0) {
            user.avatar = profile.photos[0].value;
          }

          await user.save({ validateBeforeSave: false });
          return done(null, user);
        }

        if (mode === 'signin') {
          return done(new Error('No account found. Please sign up first.'), null);
        }

        // Generate real Solana wallet
        const wallet = solanaWalletService.generateWallet();

        const userData = {
          name: profile.displayName,
          email: profile.emails[0].value,
          googleId: profile.id,
          avatar: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : undefined,
          role: requestedRole,
          isEmailVerified: true,
          wallet: {
            address: wallet.address,
            encryptedPrivateKey: wallet.encryptedPrivateKey,
            currency: wallet.currency || 'USDC',
            balance: 0,
            pendingBalance: 0,
            totalEarnings: 0,
            network: 'Solana'
          },
          password: crypto.randomBytes(32).toString('hex')
        };

        if (requestedRole === 'creator') {
          userData.category = 'other';
        }

        const newUser = await User.create(userData);

        adminNotificationService.notifyNewUserRegistration(newUser)
          .catch(err => console.error('Admin notification failed:', err));

        done(null, newUser);
      } catch (error) {
        done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
