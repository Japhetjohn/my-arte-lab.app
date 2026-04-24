/**
 * Script to fetch sign-up logs and recent registrations
 * Run with: node scripts/fetch-signup-logs.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Import models
const User = require('../src/models/User');

async function fetchLogs() {
  try {
    console.log('--- Connecting to Database ---');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✓ Connected to MongoDB\n');

    console.log('--- Recent Sign-ups (Last 48 Hours) ---');
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const recentUsers = await User.find({
      createdAt: { $gt: twoDaysAgo }
    }).sort({ createdAt: -1 });

    if (recentUsers.length === 0) {
      console.log('No recent sign-ups found.');
    } else {
      recentUsers.forEach(user => {
        console.log(`User: ${user.firstName} ${user.lastName} (${user.email})`);
        console.log(`  Role: ${user.role}`);
        console.log(`  Created: ${user.createdAt}`);
        console.log(`  Verified: ${user.isEmailVerified ? 'Yes' : 'No'}`);
        console.log(`  Wallet Addr: ${user.wallet?.tsaraAddress || 'None'}`);
        console.log(`  HostFi Assets: ${user.wallet?.hostfiWalletAssets?.length || 0}`);
        console.log('---');
      });
    }

    console.log('\n--- Searching for Log Files ---');
    const logLocations = [
      path.join(__dirname, '../logs/combined.log'),
      path.join(__dirname, '../logs/out.log'),
      path.join(__dirname, '../logs/error.log'),
      '/root/.pm2/logs/myartelab-out.log',
      '/root/.pm2/logs/myartelab-error.log',
      '/home/japhet/.pm2/logs/myartelab-out.log',
      '/home/japhet/.pm2/logs/myartelab-error.log'
    ];

    let foundLogs = false;
    for (const logPath of logLocations) {
      if (fs.existsSync(logPath)) {
        console.log(`✓ Found log file: ${logPath}`);
        foundLogs = true;
        
        console.log(`Searching for "[Register]" in [${path.basename(logPath)}]...`);
        const content = fs.readFileSync(logPath, 'utf8').split('\n');
        const registerLogs = content.filter(line => line.includes('[Register]') || line.includes('[SECURITY]'));
        
        if (registerLogs.length === 0) {
          console.log('  No sign-up related logs found in this file.');
        } else {
          console.log(`  Found ${registerLogs.length} matching lines. Last 20:`);
          console.log(registerLogs.slice(-20).join('\n'));
        }
        console.log('-'.repeat(40));
      }
    }

    if (!foundLogs) {
      console.log('No log files were found in common locations.');
      console.log('Tip: If the app is running in development, check the terminal output.');
    }

  } catch (error) {
    console.error('Error fetching logs:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

fetchLogs();
