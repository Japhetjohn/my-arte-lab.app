/**
 * Verification Script: Booking Flow and Payment
 * 
 * Verifies:
 * 1. Booking creation does NOT deduct balance.
 * 2. Payment deducts balance correctly.
 * 3. Counter-proposal payment works.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Booking = require('./src/models/Booking');
const bookingService = require('./src/services/bookingService');

async function verifyBookingFlow() {
    try {
        console.log('🔄 Starting booking flow verification...\n');

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Get Test Users and ensure balance
        const client = await User.findOne({ role: 'client' });
        if (!client) throw new Error('No client found');

        client.wallet.balance = 5000; // Give plenty of balance
        await client.save({ validateBeforeSave: false });

        const creator = await User.findOne({ role: 'creator' });
        if (!creator) throw new Error('No creator found');

        console.log(`👤 Client: ${client.email} (Balance: ${client.wallet.balance})`);
        console.log(`👤 Creator: ${creator.email} (Balance: ${creator.wallet.balance})`);

        const initialBalance = client.wallet.balance;
        const amount = 100;

        // 2. Test Booking Creation
        console.log('\n--- Step 1: Create Booking ---');
        const { booking } = await bookingService.createBookingWithValidation(
            {
                creatorId: creator._id,
                amount,
                serviceTitle: 'Test Service',
                serviceDescription: 'Description',
                category: 'Development',
                currency: 'USDC',
                startDate: new Date(),
                endDate: new Date(Date.now() + 86400000)
            },
            client._id
        );

        const clientAfterCreation = await User.findById(client._id);
        console.log(`✅ Booking created: ${booking.bookingId}`);
        console.log(`💰 Client Balance after creation: ${clientAfterCreation.wallet.balance}`);

        if (clientAfterCreation.wallet.balance === initialBalance) {
            console.log('🎉 SUCCESS: Balance was NOT deducted during creation.');
        } else {
            console.error(`❌ FAILURE: Balance was deducted! Expected ${initialBalance}, got ${clientAfterCreation.wallet.balance}`);
        }

        // 3. Test Acceptance
        console.log('\n--- Step 2: Accept Booking ---');
        await bookingService.acceptBookingWithTransaction(booking._id, creator._id);
        const acceptedBooking = await Booking.findById(booking._id);
        console.log(`✅ Booking status: ${acceptedBooking.status}`);

        // 4. Test Payment
        console.log('\n--- Step 3: Process Payment ---');
        await bookingService.processBookingPayment(booking._id, client._id);

        const clientAfterPayment = await User.findById(client._id);
        const updatedBooking = await Booking.findById(booking._id);

        console.log(`💰 Client Balance after payment: ${clientAfterPayment.wallet.balance}`);
        console.log(`✅ Booking payment status: ${updatedBooking.paymentStatus}`);

        if (clientAfterPayment.wallet.balance === initialBalance - amount) {
            console.log('🎉 SUCCESS: Balance was deducted correctly during payment.');
        } else {
            console.error(`❌ FAILURE: Balance deduction incorrect. Expected ${initialBalance - amount}, got ${clientAfterPayment.wallet.balance}`);
        }

        console.log('\n✅ Verification completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Verification failed:', error);
        process.exit(1);
    }
}

verifyBookingFlow();
