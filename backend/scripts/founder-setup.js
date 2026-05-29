/**
 * Founder Setup Script
 * 
 * Usage: node backend/scripts/founder-setup.js
 * 
 * This script sets up founder accounts with:
 * - Category: programming
 * - Permanent verified badge (blue tick)
 * - No payment required for verification
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI or MONGO_URI not found in environment variables');
  process.exit(1);
}

// Founder emails to set up
// Add or remove emails as needed
const FOUNDER_EMAILS = [
  'japhetjohnk@gmail.com',
  // 'ebuka@example.com',  // <-- Add Ebuka's email here
];

const TARGET_CATEGORY = 'programming'; // Closest match to "programming and tech"

async function setupFounders() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const User = require('../src/models/User');

    for (const email of FOUNDER_EMAILS) {
      console.log(`\n--- Processing: ${email} ---`);

      const user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        console.log(`  User not found: ${email}`);
        continue;
      }

      console.log(`  Found user: ${user.firstName} ${user.lastName} (${user.role})`);

      // Update category to programming
      const oldCategory = user.category;
      user.category = [TARGET_CATEGORY];

      // Set permanent verification (expires in year 2099)
      const permanentExpiry = new Date('2099-12-31T23:59:59.999Z');
      user.verificationSubscription = {
        active: true,
        subscribedAt: new Date(),
        expiresAt: permanentExpiry,
        lastRenewalAt: new Date(),
        autoRenew: false // Don't auto-renew, it's permanent
      };
      user.isVerified = true;

      // Save with validation disabled to bypass enum/category restrictions
      await user.save({ validateBeforeSave: false });

      console.log(`  Category updated: ${JSON.stringify(oldCategory)} -> [${TARGET_CATEGORY}]`);
      console.log(`  Verified badge: PERMANENT (expires ${permanentExpiry.toISOString()})`);
      console.log(`  Done!`);
    }

    console.log('\n=== All founders processed successfully ===');
    process.exit(0);
  } catch (error) {
    console.error('Script failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

setupFounders();
