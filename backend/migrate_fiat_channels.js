/**
 * Migration Script: Sync Existing HostFi Fiat Channels to Database
 * 
 * This script fetches all fiat collection channels from HostFi and saves them
 * to our local database, matching them to users by customId.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const FiatChannel = require('./src/models/FiatChannel');
const User = require('./src/models/User');
const hostfiService = require('./src/services/hostfiService');

async function migrateFiatChannels() {
    try {
        console.log('🔄 Starting fiat channel migration...\n');

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Fetch all fiat channels from HostFi
        console.log('📡 Fetching all fiat channels from HostFi...');
        const allChannels = await hostfiService.getFiatCollectionChannels({ limit: 1000 });
        console.log(`✅ Found ${allChannels.length} channels in HostFi\n`);

        if (allChannels.length === 0) {
            console.log('⚠️  No channels found in HostFi. Exiting...');
            process.exit(0);
        }

        let migrated = 0;
        let skipped = 0;
        let errors = 0;

        for (const channel of allChannels) {
            try {
                // Extract user ID from customId (format: userId-FIAT or just userId)
                const customId = channel.customId || channel.custom_id;

                if (!customId) {
                    console.log(`⚠️  Skipping channel ${channel.id} - no customId`);
                    skipped++;
                    continue;
                }

                // Extract userId from customId (remove -FIAT suffix if present)
                const userId = customId.replace('-FIAT', '');

                // Verify user exists
                const user = await User.findById(userId);
                if (!user) {
                    console.log(`⚠️  Skipping channel ${channel.id} - user ${userId} not found`);
                    skipped++;
                    continue;
                }

                // Check if channel already exists in database
                const existingChannel = await FiatChannel.findOne({
                    channelId: channel.id
                });

                if (existingChannel) {
                    console.log(`⏭️  Channel ${channel.id} already in database - skipping`);
                    skipped++;
                    continue;
                }

                // Save channel to database
                await FiatChannel.create({
                    userId: userId,
                    currency: channel.currency,
                    channelId: channel.id,
                    reference: channel.reference,
                    customId: customId,
                    type: channel.type || 'DYNAMIC',
                    method: channel.method || 'BANK_TRANSFER',
                    accountNumber: channel.accountNumber,
                    accountName: channel.accountName,
                    bankName: channel.bankName,
                    bankId: channel.bankId,
                    countryCode: channel.country,
                    assetId: null, // Will be populated on next use
                    active: channel.active !== false,
                    hostfiResponse: channel
                });

                console.log(`✅ Migrated channel ${channel.id} for user ${user.email} (${channel.currency})`);
                migrated++;

            } catch (error) {
                console.error(`❌ Error migrating channel ${channel.id}:`, error.message);
                errors++;
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('📊 Migration Summary:');
        console.log('='.repeat(60));
        console.log(`✅ Migrated: ${migrated}`);
        console.log(`⏭️  Skipped: ${skipped}`);
        console.log(`❌ Errors: ${errors}`);
        console.log(`📊 Total: ${allChannels.length}`);
        console.log('='.repeat(60) + '\n');

        console.log('✅ Migration completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
migrateFiatChannels();
