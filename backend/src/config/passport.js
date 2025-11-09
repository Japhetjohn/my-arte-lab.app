const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const { generateWallet } = require('../services/tsaraService');
const adminNotificationService = require('../services/adminNotificationService');

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
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          return done(null, user);
        }

        user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          user.googleId = profile.id;
          user.isEmailVerified = true;

          if (!user.avatar && profile.photos && profile.photos.length > 0) {
            user.avatar = profile.photos[0].value;
          }

          await user.save({ validateBeforeSave: false });
          return done(null, user);
        }

        const requestedRole = 'client';
        console.log('Creating new user via Google OAuth:', profile.emails[0].value, 'Role:', requestedRole);

        let wallet;
        try {
          wallet = await generateWallet({
            email: profile.emails[0].value,
            fullName: profile.displayName
          });
        } catch (walletError) {
          console.error('Tsara wallet generation failed for Google user:', walletError.message);
          wallet = null;
        }

        const newUser = await User.create({
          name: profile.displayName,
          email: profile.emails[0].value,
          googleId: profile.id,
          avatar: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : undefined,
          role: requestedRole,
          isEmailVerified: true,
          wallet: wallet ? {
            address: wallet.address,
            balance: 0,
            currency: 'USDT'
          } : undefined,
          password: Math.random().toString(36).slice(-16)
        });

        console.log('New user created via Google:', newUser.email);

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
