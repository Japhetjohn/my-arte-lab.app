require('dotenv').config();
const hostfiService = require('./src/services/hostfiService');
// Service is already instantiated in export if it is formatted like 'module.exports = new HostFiService()'
// Or if it exports the class: 'const HostFiService = require(...); const service = new HostFiService();'
// Based on view_file below, I'll adjust. Let's assume standard class export for now but check file first.


async function debugChannels() {
    const customId = '6983ea1691b5040eb0fb0276'; // User's ID from logs
    console.log(`🔍 Debugging Channels for CustomID: ${customId}`);

    try {
        // 1. Try standard lookup
        console.log('\n--- Attempt 1: customId (camelCase) ---');
        const channels1 = await hostfiService.getFiatCollectionChannels({ customId });
        console.log(`Found: ${channels1.length}`);
        if (channels1.length > 0) console.log(JSON.stringify(channels1[0], null, 2));

        // 2. Try snake_case
        console.log('\n--- Attempt 2: custom_id (snake_case) ---');
        const channels2 = await hostfiService.getFiatCollectionChannels({ custom_id: customId });
        console.log(`Found: ${channels2.length}`);

        // 3. Try fetching ALL (limit 100) and filtering manually
        console.log('\n--- Attempt 3: Fetch All & Filter ---');
        const allChannels = await hostfiService.getFiatCollectionChannels({ limit: 100 });
        console.log(`Fetched Total: ${allChannels.length}`);

        const manualFilter = allChannels.filter(c => c.customId === customId || c.custom_id === customId);
        console.log(`Manually Filtered matches: ${manualFilter.length}`);
        if (manualFilter.length > 0) {
            console.log('Match found via manual filter!');
            console.log(JSON.stringify(manualFilter[0], null, 2));
        } else {
            // Log one random channel to see structure
            if (allChannels.length > 0) {
                console.log('Random channel structure:', JSON.stringify(allChannels[0], null, 2));
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) console.error(error.response.data);
    }
}

debugChannels();
