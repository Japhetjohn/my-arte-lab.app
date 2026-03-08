require('dotenv').config({ path: '/var/www/myartelab/backend/.env' });
const mongoose = require('mongoose');
const hostfiService = require('/var/www/myartelab/backend/src/services/hostfiService');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    console.log("Fetching NG banks...");
    const banks = await hostfiService.getBanksList('NG');
    console.log("Found", banks?.length, "banks");
    
    const opay = banks.find(b => b.name?.toUpperCase().includes('OPAY') || b.bankName?.toUpperCase().includes('OPAY'));
    console.log("OPay config:", JSON.stringify(opay, null, 2));

    if (opay) {
      const bankId = opay.bankId || opay.id || opay.bank_id;
      console.log(`Verifying account 7031632438 with bank ID: ${bankId}`);
      
      const res = await hostfiService.lookupBankAccount({
        country: 'NG',
        bankId: bankId,
        accountNumber: '7031632438'
      });
      console.log("Result:", JSON.stringify(res, null, 2));
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
  process.exit(0);
}
run();
