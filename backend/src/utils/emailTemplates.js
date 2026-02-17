/**
 * Professional Email Templates for MyArteLab
 * Brand Colors: Primary #9747FF, Dark #2C3E50
 */

const emailTemplate = (content, preheader = '') => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="x-apple-disable-message-reformatting">
    <title>MyArteLab</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f4f4;
        }
        table {
            border-collapse: collapse;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
        }
        .header {
            background: linear-gradient(135deg, #9747FF 0%, #6B46FF 100%);
            padding: 30px 20px;
            text-align: center;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #ffffff;
            text-decoration: none;
        }
        .content {
            background-color: #ffffff;
            padding: 40px 30px;
        }
        .code-box {
            background: #f9f9f9;
            border: 2px dashed #9747FF;
            padding: 25px;
            text-align: center;
            border-radius: 10px;
            margin: 25px 0;
        }
        .code {
            font-size: 36px;
            font-weight: bold;
            letter-spacing: 10px;
            color: #9747FF;
            font-family: 'Courier New', monospace;
        }
        .button {
            display: inline-block;
            padding: 15px 35px;
            background-color: #9747FF;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 20px 0;
        }
        .button:hover {
            background-color: #6B46FF;
        }
        .info-box {
            background: #f0f7ff;
            border-left: 4px solid #9747FF;
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 5px;
        }
        .footer {
            background-color: #2C3E50;
            color: #ffffff;
            padding: 25px 30px;
            text-align: center;
            font-size: 14px;
        }
        .footer a {
            color: #9747FF;
            text-decoration: none;
        }
        h1 {
            color: #2C3E50;
            font-size: 24px;
            margin: 0 0 20px 0;
        }
        p {
            color: #555555;
            line-height: 1.6;
            margin: 15px 0;
        }
        .text-small {
            font-size: 13px;
            color: #888888;
        }
    </style>
</head>
<body>
    <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
        ${preheader}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
            <td align="center" style="padding: 20px 0;">
                <table role="presentation" class="email-container" cellpadding="0" cellspacing="0" border="0">
                    <!-- Header -->
                    <tr>
                        <td class="header">
                            <a href="https://app.myartelab.com" class="logo">MyArteLab</a>
                            <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">
                                Trusted by Global Clients.
                            </p>
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td class="content">
                            ${content}
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td class="footer">
                            <p style="margin: 0 0 10px 0; color: #ffffff;">
                                <strong>MyArteLab</strong> - Connecting Creators & Clients
                            </p>
                            <p style="margin: 10px 0; color: #cccccc;">
                                <a href="https://app.myartelab.com">Visit Website</a> |
                                <a href="https://app.myartelab.com">Dashboard</a> |
                                <a href="mailto:contact@myartelab.com">Support</a>
                            </p>
                            <p class="text-small" style="margin: 15px 0 0 0; color: #999999;">
                                © 2026 MyArteLab. All rights reserved.<br>
                                You're receiving this email because you have an account with us.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;

const emailTemplates = {
  /**
   * Welcome & Email Verification
   */
  welcome: (firstName, verificationCode) => emailTemplate(`
    <h1>Welcome to MyArteLab, ${firstName}! 🎉</h1>
    <p>Your account has been created successfully. We're excited to have you join our community of creators and clients!</p>

    <div class="info-box">
        <p style="margin: 0;"><strong>💰 Payment Wallet Ready</strong></p>
        <p style="margin: 5px 0 0 0;">Deposit from 65+ countries and receive USDC instantly. Once verified, you can fund your wallet from any supported country.</p>
    </div>

    <p><strong>Please verify your email address using the code below:</strong></p>

    <div class="code-box">
        <div class="code">${verificationCode}</div>
        <p class="text-small" style="margin: 15px 0 0 0;">Enter this code on the verification page</p>
    </div>

    <p class="text-small">⏰ This code expires in 30 minutes for security reasons.</p>

    <p>Once verified, you'll have full access to all MyArteLab features!</p>

    <p style="margin-top: 30px;">
        Best regards,<br>
        <strong>The MyArteLab Team</strong>
    </p>
  `, `Welcome to MyArteLab! Verify your email with code ${verificationCode}`),

  /**
   * Email Verification Code (Resend)
   */
  verificationCode: (firstName, verificationCode) => emailTemplate(`
    <h1>Your Verification Code</h1>
    <p>Hi ${firstName},</p>
    <p>Here's your new verification code:</p>

    <div class="code-box">
        <div class="code">${verificationCode}</div>
    </div>

    <p class="text-small">⏰ This code expires in 30 minutes.</p>

    <p>If you didn't request this, please ignore this email or contact support if you have concerns.</p>

    <p style="margin-top: 30px;">
        Best regards,<br>
        <strong>The MyArteLab Team</strong>
    </p>
  `, `Your MyArteLab verification code: ${verificationCode}`),

  /**
   * Password Reset
   */
  passwordReset: (resetUrl) => emailTemplate(`
    <h1>Reset Your Password</h1>
    <p>You requested a password reset for your MyArteLab account.</p>

    <p>Click the button below to reset your password (valid for 30 minutes):</p>

    <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" class="button">Reset Password</a>
    </div>

    <p class="text-small">Or copy and paste this link into your browser:<br>
        <a href="${resetUrl}" style="color: #9747FF; word-break: break-all;">${resetUrl}</a>
    </p>

    <div class="info-box">
        <p style="margin: 0;"><strong>🔒 Security Tip</strong></p>
        <p style="margin: 5px 0 0 0;">If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
    </div>

    <p style="margin-top: 30px;">
        Best regards,<br>
        <strong>The MyArteLab Team</strong>
    </p>
  `, 'Reset your MyArteLab password'),

  /**
   * Test Email
   */
  test: (recipientEmail) => emailTemplate(`
    <h1>Email Configuration Test ✅</h1>
    <p>Congratulations! Your email system is working perfectly.</p>

    <div class="info-box">
        <p style="margin: 0;"><strong>📧 Test Details</strong></p>
        <p style="margin: 5px 0 0 0;">
            <strong>Recipient:</strong> ${recipientEmail}<br>
            <strong>Time:</strong> ${new Date().toLocaleString()}<br>
            <strong>Service:</strong> Zoho Mail SMTP
        </p>
    </div>

    <p>This email confirms that:</p>
    <ul style="color: #555555;">
        <li>SMTP connection is successful</li>
        <li>Email authentication is working</li>
        <li>Email templates are rendering correctly</li>
        <li>Brand colors and styling are applied</li>
    </ul>

    <p style="margin-top: 30px;">
        Best regards,<br>
        <strong>The MyArteLab Team</strong>
    </p>
  `, 'MyArteLab Email Test - System Working!')
};

module.exports = emailTemplates;
