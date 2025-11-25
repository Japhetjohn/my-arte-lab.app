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
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        // Update all users where wallet.currency is 'USDT' to 'USDC'
        const result = await User.updateMany(
            { 'wallet.currency': 'USDT' },
            { $set: { 'wallet.currency': 'USDC' } }
        );

        // Also update default currency in any bookings if needed
        const Booking = require('../models/Booking');
        const bookingResult = await Booking.updateMany(
            { currency: 'USDT' },
            { $set: { currency: 'USDC' } }
        );

        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
migrateUSDTtoUSDC();
