require('dotenv').config();
const mongoose = require('mongoose');
const hostfiService = require('./src/services/hostfiService');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    console.log("Testing POST /v1/payout/banks/resolve ...");
    const result1 = await hostfiService.makeRequest('POST', '/v1/payout/banks/resolve', {
      bankCode: "100004", // Some APIs use bankCode instead of bankId
      accountNumber: "7031632438",
      countryCode: "NG"
    });
    console.log(result1);
  } catch(e) { console.log(e.message); }

  try {
    console.log("\nTesting GET /v1/banks/resolve");
    const result2 = await hostfiService.makeRequest('GET', '/v1/banks/resolve?bank_code=100004&account_number=7031632438');
    console.log(result2);
  } catch(e) { console.log(e.message); }

  process.exit(0);
}
test();
