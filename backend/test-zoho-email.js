require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('=== Zoho Mail SMTP Configuration Test ===\n');

// Display configuration (hide password)
console.log('Configuration:');
console.log('- EMAIL_SERVICE:', process.env.EMAIL_SERVICE);
console.log('- EMAIL_USER:', process.env.EMAIL_USER);
console.log('- EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***' + process.env.EMAIL_PASSWORD.slice(-4) : 'NOT SET');
console.log('- EMAIL_FROM:', process.env.EMAIL_FROM);
console.log('- SMTP_HOST:', process.env.SMTP_HOST);
console.log('- SMTP_PORT:', process.env.SMTP_PORT);
console.log('- SMTP_SECURE:', process.env.SMTP_SECURE);
console.log('\n');

// Create transporter
console.log('Creating Zoho Mail transporter...');
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.zoho.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true, // SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  debug: true, // Enable debug output
  logger: true // Enable logger
});

// Test connection
console.log('\nTesting SMTP connection...\n');
transporter.verify(function(error, success) {
  if (error) {
    console.error('❌ SMTP Connection FAILED:');
    console.error('Error:', error.message);
    console.error('\nCommon Issues:');
    console.error('1. If you have 2FA enabled on Zoho, you MUST use an app-specific password');
    console.error('2. App-specific passwords are 16 characters long (format: xxxx-xxxx-xxxx-xxxx)');
    console.error('3. Regular account passwords will NOT work with 2FA enabled');
    console.error('4. Generate app password at: https://accounts.zoho.com/home#security/application-specific-passwords');
    console.error('\nYour current password format suggests:',
      process.env.EMAIL_PASSWORD && process.env.EMAIL_PASSWORD.includes('-') && process.env.EMAIL_PASSWORD.length === 19
        ? 'App-specific password ✓'
        : 'Regular password (may fail if 2FA is enabled)'
    );
  } else {
    console.log('✅ SMTP Connection SUCCESS!');
    console.log('\nSending test email...\n');

    // Send test email
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: 'japhetjohnk@gmail.com',
      subject: '✅ MyArteLab - Zoho Mail SMTP Test Success',
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; background: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; }
    .header { background: linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%); padding: 20px; text-align: center; border-radius: 10px; margin-bottom: 30px; }
    .header h1 { color: white; margin: 0; }
    .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .info { background: #f0f7ff; border-left: 4px solid #FF6B35; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; color: #666; margin-top: 30px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MyArteLab</h1>
      <p style="color: white; margin: 10px 0 0 0;">Email System Test</p>
    </div>

    <div class="success">
      <strong>✅ Success!</strong> Zoho Mail SMTP is working correctly.
    </div>

    <p>Congratulations! Your MyArteLab email system is now properly configured.</p>

    <div class="info">
      <strong>Configuration Details:</strong><br>
      <strong>Service:</strong> Zoho Mail<br>
      <strong>SMTP Server:</strong> ${process.env.SMTP_HOST || 'smtp.zoho.com'}<br>
      <strong>Port:</strong> ${process.env.SMTP_PORT || '465'} (SSL)<br>
      <strong>From Address:</strong> ${process.env.EMAIL_FROM || process.env.EMAIL_USER}<br>
      <strong>Test Date:</strong> ${new Date().toLocaleString()}
    </div>

    <p>Your email templates are ready to use for:</p>
    <ul>
      <li>Welcome emails</li>
      <li>Email verification codes</li>
      <li>Password resets</li>
      <li>Booking notifications</li>
    </ul>

    <div class="footer">
      <p><strong>MyArteLab</strong> - Built for African Creators. Trusted globally.</p>
      <p>© 2026 MyArteLab. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
      `,
      text: 'MyArteLab Zoho Mail SMTP Test - Email system is working correctly!'
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('❌ Email sending FAILED:', error.message);
      } else {
        console.log('✅ Email sent successfully!');
        console.log('Message ID:', info.messageId);
        console.log('Response:', info.response);
        console.log('\n🎉 Check japhetjohnk@gmail.com for the test email!');
      }
    });
  }
});
