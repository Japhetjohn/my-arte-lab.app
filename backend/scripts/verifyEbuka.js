#!/usr/bin/env node
/**
 * Script to verify Ebuka's profile
 * Usage: node scripts/verifyEbuka.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const verifyEbuka = async () => {
  try {
    await connectDB();
    
    // Find Ebuka by email
    const ebuka = await User.findOne({ email: 'ebukaesiobu@gmail.com' });
    
    if (!ebuka) {
      console.log('❌ Ebuka not found in database');
      console.log('Searching for any user with "ebuka" in name or email...');
      
      const searchResults = await User.find({
        $or: [
          { firstName: { $regex: 'ebuka', $options: 'i' } },
          { lastName: { $regex: 'ebuka', $options: 'i' } },
          { email: { $regex: 'ebuka', $options: 'i' } }
        ]
      });
      
      if (searchResults.length > 0) {
        console.log('\nFound these matching users:');
        searchResults.forEach(u => {
          console.log(`  - ${u.name} (${u.email}) - ID: ${u._id}`);
        });
      } else {
        console.log('No users found matching "ebuka"');
      }
      
      process.exit(0);
    }
    
    console.log('✅ Found Ebuka:');
    console.log(`  Name: ${ebuka.name}`);
    console.log(`  Email: ${ebuka.email}`);
    console.log(`  Current isVerified: ${ebuka.isVerified}`);
    console.log(`  Role: ${ebuka.role}`);
    console.log(`  ID: ${ebuka._id}`);
    
    // Update to verified
    if (!ebuka.isVerified) {
      ebuka.isVerified = true;
      await ebuka.save();
      console.log('\n✅ Ebuka is now verified!');
    } else {
      console.log('\nℹ️ Ebuka is already verified');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

// Also allow verifying by user ID
const verifyById = async (userId) => {
  try {
    await connectDB();
    
    const user = await User.findById(userId);
    
    if (!user) {
      console.log(`❌ User with ID ${userId} not found`);
      process.exit(1);
    }
    
    console.log('Found user:');
    console.log(`  Name: ${user.name}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Current isVerified: ${user.isVerified}`);
    
    user.isVerified = true;
    await user.save();
    console.log('\n✅ User is now verified!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

// Main execution
const args = process.argv.slice(2);

if (args[0] === '--id' && args[1]) {
  verifyById(args[1]);
} else if (args[0] === '--email' && args[1]) {
  // Verify by custom email
  const verifyByEmail = async (email) => {
    try {
      await connectDB();
      const user = await User.findOne({ email });
      
      if (!user) {
        console.log(`❌ User with email ${email} not found`);
        process.exit(1);
      }
      
      console.log('Found user:');
      console.log(`  Name: ${user.name}`);
      console.log(`  Current isVerified: ${user.isVerified}`);
      
      user.isVerified = true;
      await user.save();
      console.log('\n✅ User is now verified!');
      
      process.exit(0);
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  };
  verifyByEmail(args[1]);
} else {
  verifyEbuka();
}
