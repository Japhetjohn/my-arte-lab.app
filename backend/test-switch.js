require('dotenv').config();
const axios = require('axios');

async function testSwitch() {
  console.log('Testing Switch API connection...\n');

  // Check environment variables
  console.log('Environment variables:');
  console.log('SWITCH_API_URL:', process.env.SWITCH_API_URL);
  console.log('SWITCH_SERVICE_KEY:', process.env.SWITCH_SERVICE_KEY ?
    `${process.env.SWITCH_SERVICE_KEY.substring(0, 15)}...` : 'NOT SET');
  console.log('');

  if (!process.env.SWITCH_SERVICE_KEY) {
    console.error('❌ SWITCH_SERVICE_KEY is not set!');
    process.exit(1);
  }

  // Test API call
  try {
    const response = await axios.get(
      `${process.env.SWITCH_API_URL}/coverage`,
      {
        params: { direction: 'OFFRAMP' },
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Key': process.env.SWITCH_SERVICE_KEY
        }
      }
    );

    console.log('✅ Switch API connection successful!');
    console.log('Response status:', response.status);
    console.log('Countries supported:', response.data.data?.length || 0);
    console.log('');
    console.log('First 3 countries:', response.data.data?.slice(0, 3).map(c => c.country));
  } catch (error) {
    console.error('❌ Switch API connection failed!');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data || error.message);
    console.error('');
    console.error('Headers sent:', {
      'Content-Type': 'application/json',
      'X-Service-Key': process.env.SWITCH_SERVICE_KEY?.substring(0, 15) + '...'
    });
  }
}

testSwitch();
