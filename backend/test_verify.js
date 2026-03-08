require('dotenv').config();
const mongoose = require('mongoose');
const hostfiService = require('./src/services/hostfiService');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    // Testing with OPAY bank (code 100004 for NGN) and the account number from the screenshot
    const result = await hostfiService.lookupBankAccount({
      country: 'NG',
      bankId: 'NG::100004', // Using common format, though we don't know the exact ID for OPAY
      accountNumber: '7031632438'
    });
    console.log("Verification Response:", JSON.stringify(result, null, 2));
  } catch(e) {
    console.error("Verification Error:", e.message);
  }
  process.exit(0);
}
test();
