require('dotenv').config();
const mongoose = require('mongoose');
const hostfiService = require('./src/services/hostfiService');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const result = await hostfiService.makeRequest('GET', '/v1/payout/banks/resolve?bankCode=100004&accountNumber=7031632438&countryCode=NG');
    console.log(result);
  } catch(e) { console.log(e.message); }
  
  try {
      const resp = await hostfiService.makeRequest('POST', '/v1/payout/banks/resolve', {
          bankCode: "100004", accountNumber: "7031632438", countryCode: "NG"
      })
      console.log(resp)
  } catch(e) { console.log(e.message); }

  process.exit(0);
}
test();
