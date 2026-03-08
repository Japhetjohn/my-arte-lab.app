require('dotenv').config();
const hostfiService = require('./src/services/hostfiService');

async function check() {
  try {
    const banks = await hostfiService.getBanksList('NG');
    const opay = banks.find(b => b.name.toUpperCase().includes('OPAY') || b.bankName?.toUpperCase().includes('OPAY'));
    console.log("OPay Bank Object:", JSON.stringify(opay, null, 2));
    
    if (opay) {
        const bankId = opay.bankId || opay.id || opay.bank_id;
        console.log("Using Bank ID for lookup:", bankId);
        const lookup = await hostfiService.lookupBankAccount({
            country: 'NG',
            bankId: bankId,
            accountNumber: '7031632438'
        });
        console.log("Lookup Result:", JSON.stringify(lookup, null, 2));
    }
  } catch (e) {
    console.error("Error:", e.message);
  }
}
check();
