const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

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

// Google OAuth Strategy - Only initialize if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user already exists
          let user = await User.findOne({ oauthId: profile.id, oauthProvider: 'google' });

          if (user) {
            // User exists, return user
            return done(null, user);
          }

          // Check if user exists with same email but different provider
          const existingUser = await User.findOne({ email: profile.emails[0].value });

          if (existingUser) {
            // Update existing user to link Google account
            existingUser.oauthProvider = 'google';
            existingUser.oauthId = profile.id;
            existingUser.emailVerified = true; // Google emails are verified
            await existingUser.save();
            return done(null, existingUser);
          }

          // Create new user
          user = await User.create({
            email: profile.emails[0].value,
            oauthProvider: 'google',
            oauthId: profile.id,
            emailVerified: true, // Google emails are pre-verified
            role: 'client', // Default role, can be changed later
            profile: {
              name: profile.displayName || profile.emails[0].value.split('@')[0],
            },
          });

          done(null, user);
        } catch (error) {
          console.error('Error in Google Strategy:', error);
          done(error, null);
        }
      }
    )
  );
  console.log('✅ Google OAuth configured');
} else {
  console.log('⚠️  Google OAuth not configured - credentials missing in .env');
}

module.exports = passport;
