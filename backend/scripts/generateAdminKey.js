/**
 * Script to generate secure admin API key and its hash
 * Run this once to set up admin authentication
 *
 * Usage: node scripts/generateAdminKey.js
 */

const crypto = require('crypto');

// Generate a secure random API key (32 bytes = 256 bits)
const apiKey = crypto.randomBytes(32).toString('hex');

// Create a SHA-256 hash of the API key (this is what goes in .env)
const apiKeyHash = crypto
  .createHash('sha256')
  .update(apiKey)
  .digest('hex');

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║  Admin API Key Generated Successfully!                ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

console.log('📝 IMPORTANT: Save these values securely!\n');

console.log('1️⃣  API KEY (Share this with authorized admins only):');
console.log('─'.repeat(70));
console.log(apiKey);
console.log('─'.repeat(70));

console.log('\n2️⃣  API KEY HASH (Add this to your .env file):');
console.log('─'.repeat(70));
console.log(`ADMIN_API_KEY_HASH=${apiKeyHash}`);
console.log('─'.repeat(70));

console.log('\n📋 How to use:');
console.log('  1. Copy the ADMIN_API_KEY_HASH line above to your .env file');
console.log('  2. Save the API KEY in a secure password manager');
console.log('  3. Share the API KEY with authorized administrators only');
console.log('  4. Include the API KEY in requests using the X-Admin-API-Key header');

console.log('\n🔒 Security Notes:');
console.log('  • Never commit the API KEY to version control');
console.log('  • Store the API KEY in a password manager');
console.log('  • The hash in .env is safe to commit (but use env variables in production)');
console.log('  • Regenerate keys immediately if compromised');
console.log('  • Use HTTPS only when sending API keys\n');

console.log('📡 Example API Request:');
console.log('─'.repeat(70));
console.log('curl -X POST https://your-api.com/api/admin/endpoint \\');
console.log('  -H "Content-Type: application/json" \\');
console.log(`  -H "X-Admin-API-Key: ${apiKey}" \\`);
console.log('  -d \'{"data": "value"}\'');
console.log('─'.repeat(70));
console.log('');
