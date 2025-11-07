/**
 * Payment Integration Test Script
 * Tests Tsara payment gateway integration
 */

require('dotenv').config();
const tsaraService = require('./src/services/tsaraService');
const emailConfig = require('./src/config/email');

console.log('🧪 MyArteLab Payment Integration Test\n');

// Test Configuration
async function testConfiguration() {
  console.log('1️⃣ Testing Configuration...');

  const required = [
    'TSARA_PUBLIC_KEY',
    'TSARA_SECRET_KEY',
    'TSARA_API_URL',
    'EMAIL_USER',
    'EMAIL_PASSWORD'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing configuration:', missing.join(', '));
    return false;
  }

  console.log('✅ All required environment variables are set');
  console.log(`   - Tsara Environment: ${process.env.TSARA_ENVIRONMENT}`);
  console.log(`   - API URL: ${process.env.TSARA_API_URL}`);
  console.log(`   - Email Service: ${process.env.EMAIL_SERVICE}`);
  return true;
}

// Test Email Service
async function testEmailService() {
  console.log('\n2️⃣ Testing Email Service...');

  try {
    const isConnected = await emailConfig.verifyConnection();
    if (isConnected) {
      console.log('✅ Email service connected successfully');
      return true;
    } else {
      console.error('❌ Email service connection failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Email service error:', error.message);
    return false;
  }
}

// Test Wallet Generation (Development Mode)
async function testWalletGeneration() {
  console.log('\n3️⃣ Testing Wallet Generation...');

  try {
    const testUser = {
      userId: 'test_' + Date.now(),
      email: 'test@myartelab.com',
      name: 'Test User',
      role: 'client'
    };

    const wallet = await tsaraService.generateWallet(testUser);

    console.log('✅ Wallet generated successfully');
    console.log(`   - Address: ${wallet.address}`);
    console.log(`   - Currency: ${wallet.currency}`);
    console.log(`   - Balance: ${wallet.balance}`);

    if (process.env.NODE_ENV === 'development') {
      console.log('   ⚠️ Using mock wallet (development mode)');
    }

    return true;
  } catch (error) {
    console.error('❌ Wallet generation failed:', error.message);
    return false;
  }
}

// Test Escrow Wallet Generation
async function testEscrowGeneration() {
  console.log('\n4️⃣ Testing Escrow Wallet Generation...');

  try {
    const testBooking = {
      bookingId: 'booking_' + Date.now(),
      amount: 100.00,
      currency: 'USDT',
      clientId: 'client_123',
      creatorId: 'creator_456',
      serviceTitle: 'Photography Session'
    };

    const escrow = await tsaraService.generateEscrowWallet(testBooking);

    console.log('✅ Escrow wallet generated successfully');
    console.log(`   - Address: ${escrow.address}`);
    console.log(`   - Currency: ${escrow.currency}`);
    console.log(`   - Balance: ${escrow.balance}`);

    if (process.env.NODE_ENV === 'development') {
      console.log('   ⚠️ Using mock escrow (development mode)');
    }

    return true;
  } catch (error) {
    console.error('❌ Escrow generation failed:', error.message);
    return false;
  }
}

// Test Webhook Signature Verification
async function testWebhookVerification() {
  console.log('\n5️⃣ Testing Webhook Signature Verification...');

  try {
    const testPayload = JSON.stringify({
      event: 'payment.success',
      data: { amount: 100 }
    });

    const crypto = require('crypto');
    const signature = crypto
      .createHmac('sha256', process.env.TSARA_WEBHOOK_SECRET)
      .update(testPayload)
      .digest('hex');

    const isValid = tsaraService.verifyWebhookSignature(testPayload, signature);

    if (isValid) {
      console.log('✅ Webhook signature verification working');
      return true;
    } else {
      console.error('❌ Webhook signature verification failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Webhook verification error:', error.message);
    return false;
  }
}

// Test Send Email
async function testSendEmail() {
  console.log('\n6️⃣ Testing Email Sending...');

  try {
    await emailConfig.sendEmail({
      to: process.env.EMAIL_USER,
      subject: 'MyArteLab Integration Test',
      html: `
        <h1>Test Email</h1>
        <p>This is a test email from MyArteLab payment integration test.</p>
        <p>If you received this, the email service is working correctly!</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      `
    });

    console.log('✅ Test email sent successfully');
    console.log(`   - Sent to: ${process.env.EMAIL_USER}`);
    return true;
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  const results = [];

  results.push(await testConfiguration());
  results.push(await testEmailService());
  results.push(await testWalletGeneration());
  results.push(await testEscrowGeneration());
  results.push(await testWebhookVerification());
  results.push(await testSendEmail());

  const passed = results.filter(r => r).length;
  const failed = results.filter(r => !r).length;

  console.log('\n' + '═'.repeat(50));
  console.log('📊 Test Summary');
  console.log('═'.repeat(50));
  console.log(`✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Payment integration is ready.');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the errors above.');
  }

  console.log('═'.repeat(50) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// Run the tests
runTests();
