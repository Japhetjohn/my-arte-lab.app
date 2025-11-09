const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const { generateWallet } = require('../services/tsaraService');
const adminNotificationService = require('../services/adminNotificationService');

/**
 * Passport Google OAuth 2.0 Strategy
 * Handles user authentication via Google Sign-In
 */
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback'
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists with this Google ID
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          // User exists, return user
          return done(null, user);
        }

        // Check if user exists with this email
        user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          // User exists with same email, link Google account
          user.googleId = profile.id;
          user.isEmailVerified = true; // Google emails are verified

          // Update avatar if user doesn't have one
          if (!user.avatar && profile.photos && profile.photos.length > 0) {
            user.avatar = profile.photos[0].value;
          }

          await user.save({ validateBeforeSave: false });
          return done(null, user);
        }

        // New user - create account
        console.log('Creating new user via Google OAuth:', profile.emails[0].value);

        // Generate Tsara wallet for new user
        let wallet;
        try {
          wallet = await generateWallet({
            email: profile.emails[0].value,
            fullName: profile.displayName
          });
        } catch (walletError) {
          console.error('Tsara wallet generation failed for Google user:', walletError.message);
          // Continue without wallet - can be created later
          wallet = null;
        }

        // Create new user
        const newUser = await User.create({
          name: profile.displayName,
          email: profile.emails[0].value,
          googleId: profile.id,
          avatar: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : undefined,
          role: 'client', // Default role, user can upgrade to creator later
          isEmailVerified: true, // Google emails are pre-verified
          wallet: wallet ? {
            address: wallet.address,
            balance: 0,
            currency: 'USDT'
          } : undefined,
          password: Math.random().toString(36).slice(-16) // Random password (won't be used for Google login)
        });

        console.log('New user created via Google:', newUser.email);

        // Notify admin of new user registration via Google
        adminNotificationService.notifyNewUserRegistration(newUser)
          .catch(err => console.error('Admin notification failed:', err));

        done(null, newUser);
      } catch (error) {
        console.error('Google OAuth error:', error);
        done(error, null);
      }
    }
  )
);

/**
 * Serialize user for session
 */
passport.serializeUser((user, done) => {
  done(null, user.id);
});

/**
 * Deserialize user from session
 */
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
