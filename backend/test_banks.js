require('dotenv').config();
const mongoose = require('mongoose');
const hostfiService = require('./src/services/hostfiService');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const banks = await hostfiService.getBanksList('NG');
    console.log(`Found ${banks.length} banks.`);
    if (banks.length > 0) {
      console.log('Sample bank:', banks[0]);
    } else {
      console.log("Empty banks list returned:", banks)
    }
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
test();
