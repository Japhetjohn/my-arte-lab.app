/**
 * Migration Script: Update USDT to USDC
 *
 * This script updates all existing wallets from USDT to USDC
 * Run this once to migrate existing data
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

async function migrateUSDTtoUSDC() {
    try {
        console.log('🔄 Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to database');

        console.log('🔄 Updating wallets from USDT to USDC...');

        // Update all users where wallet.currency is 'USDT' to 'USDC'
        const result = await User.updateMany(
            { 'wallet.currency': 'USDT' },
            { $set: { 'wallet.currency': 'USDC' } }
        );

        console.log(`✅ Updated ${result.modifiedCount} wallet(s) from USDT to USDC`);

        // Also update default currency in any bookings if needed
        const Booking = require('../models/Booking');
        const bookingResult = await Booking.updateMany(
            { currency: 'USDT' },
            { $set: { currency: 'USDC' } }
        );

        console.log(`✅ Updated ${bookingResult.modifiedCount} booking(s) from USDT to USDC`);

        console.log('🎉 Migration complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
migrateUSDTtoUSDC();
