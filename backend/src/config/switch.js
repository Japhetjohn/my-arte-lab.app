const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  apiKey: process.env.SWITCH_API_KEY,
  apiUrl: process.env.SWITCH_API_URL || 'https://api.onswitch.xyz',
  webhookSecret: process.env.SWITCH_WEBHOOK_SECRET,

  getHeaders: () => ({
    'Content-Type': 'application/json',
    'x-service-key': process.env.SWITCH_API_KEY,
  }),
};
