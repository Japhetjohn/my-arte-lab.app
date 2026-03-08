const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function run() {
  try {
    console.log("1. Logging in...");
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'japhetjohnk@gmail.com',
      password: '@Kuulsinim45'
    }, { timeout: 10000 });
    
    const token = loginRes.data.token || loginRes.data.data?.token || loginRes.headers['x-auth-token'];
    console.log("Logged in:", !!token);

    if (!token) {
       console.log("Full Login Response:", JSON.stringify(loginRes.data, null, 2));
       return;
    }

    const headers = { Authorization: `Bearer ${token}` };

    console.log("\n2. Getting User Balance...");
    const profileRes = await axios.get(`${API_URL}/auth/me`, { headers, timeout: 10000 });
    const balance = profileRes.data?.data?.wallet?.balance || 0;
    console.log("Current Balance: $" + balance);

    if (balance < 1) { 
       console.log("Balance too low for a $1 withdrawal test. Aborting.");
       return;
    }

    console.log("\n3. Looking up OPAY Bank...");
    const verifyRes = await axios.post(`${API_URL}/hostfi/withdrawal/verify-account`, {
      country: 'NG',
      bankId: 'NG::100004',
      accountNumber: '7031632438'
    }, { headers, timeout: 10000 });
    
    // Safely parse according to our backend fix
    const resultData = verifyRes.data.data || verifyRes.data;
    const accountName = resultData.account?.accountName || resultData.accountName || "Unknown";
    console.log("Verified Name:", accountName);

    console.log("\n4. Initiating $1 Withdrawal...");
    const withdrawPayload = {
      amount: 1, // $1 test
      currency: 'NGN', // Convert to NGN
      methodId: 'BANK_TRANSFER',
      recipient: {
        bankId: 'NG::100004',
        bankName: 'OPAY',
        accountName: accountName,
        accountNumber: '7031632438',
        type: 'BANK_TRANSFER'
      }
    };

    const withdrawRes = await axios.post(`${API_URL}/hostfi/withdrawal/initiate`, withdrawPayload, { headers, timeout: 15000 });
    console.log("Withdrawal Success:", JSON.stringify(withdrawRes.data, null, 2));

  } catch (error) {
    console.error("Test Error:", error.message);
    if (error.response) {
      console.error("Response Data:", JSON.stringify(error.response.data, null, 2));
    }
  }
}
run();
