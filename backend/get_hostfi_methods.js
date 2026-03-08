require('dotenv').config();
const mongoose = require('mongoose');
const hostfiService = require('./src/services/hostfiService');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    console.log("Testing GET /v1/payout/methods/NG");
    const result1 = await hostfiService.makeRequest('GET', '/v1/payout/methods/NG');
    console.log(JSON.stringify(result1, null, 2));
  } catch(e) { console.log(e.message); }

  process.exit(0);
}
test();
