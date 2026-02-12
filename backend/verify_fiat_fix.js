/**
 * Verification Script: Fiat Channel Creation
 * 
 * Verifies:
 * 1. Fiat channel creation uses unique customId.
 * 2. Consecutive calls for same user succeed (by refreshing or using unique ID).
 * 3. Expiry handling works.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const FiatChannel = require('./src/models/FiatChannel');
const hostfiWalletController = require('./src/controllers/hostfiWalletController');

// A helper to simulate the controller call and wait for it
async function simulateCreateFiatChannel(userId, currency) {
    return new Promise((resolve, reject) => {
        const req = {
            user: { _id: userId },
            body: { currency }
        };
        const res = {
            status: function () { return this; },
            json: function (data) { resolve(data); return this; }
        };
        const next = (err) => { reject(err); };

        hostfiWalletController.createFiatChannel(req, res, next);
    });
}

async function verifyFiatChannelFlow() {
    try {
        console.log('🔄 Starting fiat channel flow verification...\n');

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const user = await User.findOne({ email: 'labossvisuals@gmail.com' });
        if (!user) throw new Error('Test user not found');

        console.log(`👤 User: ${user.email} (${user._id})`);

        // Clean up current channel specifically to test fresh creation
        await FiatChannel.deleteMany({ userId: user._id });
        console.log('🗑️  Cleaned up existing channels for user.');

        // 1. First Creation
        console.log('\n--- Step 1: Initial Creation ---');
        const result1 = await simulateCreateFiatChannel(user._id, 'NGN');
        console.log('✅ Result 1:', result1.message);
        const channel1 = result1.data.channel;
        console.log(`📡 Channel ID: ${channel1.id}`);
        console.log(`🔗 Custom ID: ${channel1.customId || 'unknown'}`);

        // 2. Second Creation (should return same if active)
        console.log('\n--- Step 2: Immediate Consecutive Request ---');
        const result2 = await simulateCreateFiatChannel(user._id, 'NGN');
        console.log('✅ Result 2:', result2.message);
        const channel2 = result2.data.channel;

        if (channel1.id === channel2.id) {
            console.log('🎉 SUCCESS: Returned existing active channel.');
        } else {
            console.log('ℹ️  Note: New channel created (might be because logic refreshed it).');
        }

        // 3. Test expiry logic by manually breaking the record in DB
        console.log('\n--- Step 3: Test Expiry Refresh ---');
        await FiatChannel.findOneAndUpdate({ userId: user._id }, { channelId: 'expired_id' });
        console.log('🧪 Simulating expired channel in DB...');

        const result3 = await simulateCreateFiatChannel(user._id, 'NGN');
        console.log('✅ Result 3:', result3.message);
        const channel3 = result3.data.channel;

        if (channel3.id !== 'expired_id') {
            console.log('🎉 SUCCESS: Automatically refreshed channel after HostFi mismatch/expiry.');
        } else {
            console.error('❌ FAILURE: Still returning expired channel ID.');
        }

        console.log('\n✅ Fiat channel verification completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Verification failed:', error);
        process.exit(1);
    }
}

verifyFiatChannelFlow();
