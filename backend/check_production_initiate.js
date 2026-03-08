require('dotenv').config({ path: '/var/www/myartelab/backend/.env' });
const mongoose = require('mongoose');
const hostfiService = require('/var/www/myartelab/backend/src/services/hostfiService');
const User = require('/var/www/myartelab/backend/src/models/User');
const Transaction = require('/var/www/myartelab/backend/src/models/Transaction');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const user = await User.findOne({ email: 'japhetjohnk@gmail.com' });
    if (!user) {
      console.log("User not found.");
      return process.exit(1);
    }
    console.log("User found, balance:", user.wallet.balance);

    if (user.wallet.balance < 1) {
      console.log("Insufficient balance to test $1 withdrawal.");
      return process.exit(1);
    }

    console.log("\nInitiating withdrawal of $1 via HostFi...");

    // Simulating the controller logic directly
    const amount = 1;
    const recipient = {
      bankId: 'NG::100004',
      bankName: 'OPAY',
      accountName: "JOHN KU'ULSINIM JAPHET",
      accountNumber: '7031632438',
      type: 'BANK_TRANSFER'
    };

    // Calculate conversions
    const rateData = await hostfiService.getCurrencyRates('USDC', 'NGN', true);
    let conversionRate = rateData.rate || rateData.data?.rate;
    console.log(`Conversion Rate USDC/NGN: ${conversionRate}`);

    if (!conversionRate) {
      console.log("Could not get conversion rate, aborting to be safe.");
      return process.exit(1);
    }

    const { originalAmount, amountAfterFee, feeAmount } = hostfiService.calculatePlatformFee(amount);

    // Get wallet asset ID for USDC
    const hostfiWalletService = require('/var/www/myartelab/backend/src/services/hostfiWalletService');
    const assetId = await hostfiWalletService.getWalletAssetId(user._id, 'USDC');
    console.log(`USDC Asset ID: ${assetId}`);

    const payoutAmountNGN = (amountAfterFee * conversionRate).toFixed(2);
    console.log(`Initiating payout of ${payoutAmountNGN} NGN (after $${feeAmount} fee)`);

    const payoutResponse = await hostfiService.initiateWithdrawal({
      walletAssetId: assetId,
      amount: payoutAmountNGN,
      currency: 'NGN',
      methodId: 'BANK_TRANSFER',
      recipient: { ...recipient, type: 'BANK' },
      clientReference: `WD-TST-${Date.now()}`
    });

    console.log("Success! HostFi Response:", JSON.stringify(payoutResponse, null, 2));

    // Deduct user balance since the backend controller normally does this
    user.wallet.balance -= amount;
    await user.save();

    // Log transaction
    await Transaction.create({
      user: user._id,
      type: 'withdrawal',
      amount,
      currency: 'USDC',
      status: 'pending',
      reference: payoutResponse.reference || `TST-${Date.now()}`,
      metadata: { ...payoutResponse, recipient, type: 'FIAT', methodId: 'BANK_TRANSFER' }
    });

    console.log("\nDatabase updated successfully.");

  } catch (err) {
    console.error("Error:", err.message);
    if (err.response) console.error("Data:", err.response.data);
  }
  process.exit(0);
}
run();
