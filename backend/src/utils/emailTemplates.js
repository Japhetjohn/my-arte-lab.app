/**
 * Professional Email Templates for MyArteLab
 * Brand Colors:
 * - Primary Purple: #9747FF
 * - Primary Dark: #6B46FF
 * - Background Dark: #2C3E50
 * - Background Light: #F8F9FA
 * - Success Green: #10B981
 * - Warning Orange: #F59E0B
 * - Error Red: #EF4444
 * - Text Dark: #1F2937
 * - Text Light: #6B7280
 */

// Brand color palette
const COLORS = {
  primary: '#9747FF',
  primaryDark: '#6B46FF',
  primaryLight: '#A855F7',
  backgroundDark: '#2C3E50',
  backgroundLight: '#F8F9FA',
  white: '#FFFFFF',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  textDark: '#1F2937',
  textLight: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  gradient: 'linear-gradient(135deg, #9747FF 0%, #6B46FF 100%)'
};

// Base email template with professional styling
const baseTemplate = (content, preheader = '', options = {}) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <meta name="x-apple-disable-message-reformatting">
    <title>MyArteLab - ${options.title || 'Notification'}</title>
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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            margin: 0;
            padding: 0;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: ${COLORS.backgroundLight};
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        
        table {
            border-collapse: collapse;
            border-spacing: 0;
        }
        
        .email-wrapper {
            width: 100%;
            background-color: ${COLORS.backgroundLight};
            padding: 40px 20px;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: ${COLORS.white};
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        
        /* Header */
        .header {
            background: ${COLORS.gradient};
            padding: 40px 30px;
            text-align: center;
        }
        
        .header-logo {
            font-size: 32px;
            font-weight: 700;
            color: ${COLORS.white};
            text-decoration: none;
            letter-spacing: -0.5px;
        }
        
        .header-tagline {
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
            margin-top: 8px;
            font-weight: 400;
        }
        
        /* Content */
        .content {
            padding: 40px 32px;
        }
        
        .greeting {
            font-size: 20px;
            font-weight: 600;
            color: ${COLORS.textDark};
            margin-bottom: 16px;
        }
        
        .body-text {
            color: ${COLORS.textLight};
            font-size: 16px;
            line-height: 1.7;
            margin-bottom: 16px;
        }
        
        /* Code Box */
        .code-container {
            background: linear-gradient(135deg, rgba(151, 71, 255, 0.05) 0%, rgba(107, 70, 255, 0.05) 100%);
            border: 2px dashed ${COLORS.primary};
            border-radius: 12px;
            padding: 32px;
            text-align: center;
            margin: 24px 0;
        }
        
        .code-label {
            font-size: 13px;
            color: ${COLORS.textMuted};
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 12px;
        }
        
        .code {
            font-size: 42px;
            font-weight: 700;
            letter-spacing: 12px;
            color: ${COLORS.primary};
            font-family: 'Courier New', monospace;
        }
        
        .code-expiry {
            font-size: 13px;
            color: ${COLORS.textMuted};
            margin-top: 12px;
        }
        
        /* Button */
        .button-container {
            text-align: center;
            margin: 32px 0;
        }
        
        .button {
            display: inline-block;
            padding: 16px 40px;
            background: ${COLORS.gradient};
            color: ${COLORS.white} !important;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 15px;
            box-shadow: 0 4px 14px rgba(151, 71, 255, 0.4);
            transition: all 0.2s ease;
        }
        
        /* Info Boxes */
        .info-box {
            background: linear-gradient(135deg, rgba(151, 71, 255, 0.08) 0%, rgba(107, 70, 255, 0.08) 100%);
            border-left: 4px solid ${COLORS.primary};
            border-radius: 8px;
            padding: 20px 24px;
            margin: 20px 0;
        }
        
        .info-box-title {
            font-weight: 600;
            color: ${COLORS.primaryDark};
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .info-box-text {
            color: ${COLORS.textLight};
            font-size: 14px;
            line-height: 1.6;
            margin: 0;
        }
        
        .success-box {
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.08) 100%);
            border-left-color: ${COLORS.success};
        }
        
        .success-box .info-box-title {
            color: ${COLORS.success};
        }
        
        .warning-box {
            background: linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(217, 119, 6, 0.08) 100%);
            border-left-color: ${COLORS.warning};
        }
        
        .warning-box .info-box-title {
            color: ${COLORS.warning};
        }
        
        .error-box {
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(220, 38, 38, 0.08) 100%);
            border-left-color: ${COLORS.error};
        }
        
        .error-box .info-box-title {
            color: ${COLORS.error};
        }
        
        /* Data Tables */
        .data-table {
            width: 100%;
            margin: 20px 0;
            background: ${COLORS.white};
            border: 1px solid ${COLORS.border};
            border-radius: 12px;
            overflow: hidden;
        }
        
        .data-table-row {
            border-bottom: 1px solid ${COLORS.border};
        }
        
        .data-table-row:last-child {
            border-bottom: none;
        }
        
        .data-table-label {
            padding: 16px 20px;
            font-weight: 600;
            color: ${COLORS.textDark};
            font-size: 14px;
            width: 40%;
            background: ${COLORS.backgroundLight};
        }
        
        .data-table-value {
            padding: 16px 20px;
            color: ${COLORS.textLight};
            font-size: 14px;
        }
        
        .data-table-value.amount {
            font-size: 18px;
            font-weight: 700;
            color: ${COLORS.primary};
        }
        
        /* Stats Cards */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            margin: 24px 0;
        }
        
        .stat-card {
            background: ${COLORS.gradient};
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            color: ${COLORS.white};
        }
        
        .stat-value {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 4px;
        }
        
        .stat-label {
            font-size: 12px;
            opacity: 0.9;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .stat-sublabel {
            font-size: 11px;
            opacity: 0.7;
            margin-top: 4px;
        }
        
        /* Link */
        .link {
            color: ${COLORS.primary};
            text-decoration: none;
            font-weight: 500;
        }
        
        .link:hover {
            text-decoration: underline;
        }
        
        .link-block {
            display: block;
            padding: 12px;
            background: ${COLORS.backgroundLight};
            border-radius: 8px;
            word-break: break-all;
            font-size: 13px;
            color: ${COLORS.primary};
            margin: 12px 0;
            font-family: monospace;
        }
        
        /* Footer */
        .footer {
            background: ${COLORS.backgroundDark};
            color: ${COLORS.white};
            padding: 32px;
            text-align: center;
        }
        
        .footer-brand {
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 8px;
        }
        
        .footer-tagline {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.7);
            margin-bottom: 20px;
        }
        
        .footer-links {
            margin: 20px 0;
        }
        
        .footer-link {
            color: ${COLORS.primaryLight};
            text-decoration: none;
            font-size: 13px;
            margin: 0 12px;
        }
        
        .footer-divider {
            height: 1px;
            background: rgba(255, 255, 255, 0.1);
            margin: 20px 0;
        }
        
        .footer-copyright {
            font-size: 12px;
            color: rgba(255, 255, 255, 0.5);
            line-height: 1.6;
        }
        
        /* Utilities */
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .mt-0 { margin-top: 0; }
        .mb-0 { margin-bottom: 0; }
        .mb-4 { margin-bottom: 16px; }
        .mt-6 { margin-top: 24px; }
        
        .signature {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid ${COLORS.border};
        }
        
        .signature-text {
            color: ${COLORS.textLight};
            font-size: 15px;
            line-height: 1.6;
        }
        
        .signature-team {
            font-weight: 600;
            color: ${COLORS.textDark};
        }
        
        /* Responsive */
        @media (max-width: 480px) {
            .email-wrapper {
                padding: 20px 10px;
            }
            
            .content {
                padding: 24px 20px;
            }
            
            .header {
                padding: 30px 20px;
            }
            
            .code {
                font-size: 32px;
                letter-spacing: 8px;
            }
            
            .stats-grid {
                grid-template-columns: 1fr;
            }
            
            .data-table-label,
            .data-table-value {
                display: block;
                width: 100%;
            }
        }
    </style>
</head>
<body>
    <!-- Preheader -->
    <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
        ${preheader}
    </div>
    
    <table role="presentation" class="email-wrapper" cellpadding="0" cellspacing="0" border="0">
        <tr>
            <td align="center">
                <table role="presentation" class="email-container" cellpadding="0" cellspacing="0" border="0">
                    <!-- Header -->
                    <tr>
                        <td class="header">
                            <a href="https://app.myartelab.com" class="header-logo">MyArteLab</a>
                            <p class="header-tagline">Connecting Creators & Clients Worldwide</p>
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
                            <div class="footer-brand">MyArteLab</div>
                            <div class="footer-tagline">Connecting Creators & Clients</div>
                            
                            <div class="footer-links">
                                <a href="https://app.myartelab.com" class="footer-link">Dashboard</a>
                                <a href="https://app.myartelab.com/explore" class="footer-link">Explore</a>
                                <a href="mailto:contact@myartelab.com" class="footer-link">Support</a>
                            </div>
                            
                            <div class="footer-divider"></div>
                            
                            <p class="footer-copyright">
                                © ${new Date().getFullYear()} MyArteLab. All rights reserved.<br>
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
  welcome: (firstName, verificationCode) => baseTemplate(`
    <p class="body-text" style="font-size: 18px; margin-bottom: 24px;">
        Welcome to MyArteLab,<br>
        Your account has been created successfully. We're thrilled to have you join our community of talented creators and clients!
    </p>

    <p class="body-text" style="margin-bottom: 16px;">
        Please verify your email address using the code below:
    </p>

    <div class="code-container" style="margin: 24px 0;">
        <div class="code-label">Verification Code</div>
        <div class="code">${verificationCode}</div>
        <div class="code-expiry">Expires in 30 minutes for security</div>
    </div>

    <p class="body-text" style="margin-bottom: 32px;">
        Once verified, you'll have full access to all MyArteLab features including booking creators, managing your portfolio, and processing secure payments.
    </p>

    <p class="body-text" style="margin-top: 32px;">
        Best regards,<br>
        <span style="font-weight: 600;">The MyArteLab Team</span>
    </p>
  `, `Welcome to MyArteLab! Your verification code is ${verificationCode}`, { title: 'Welcome' }),

  /**
   * Email Verification Code (Resend)
   */
  verificationCode: (firstName, verificationCode) => baseTemplate(`
    <h1 class="greeting">Your Verification Code</h1>
    
    <p class="body-text">Hi ${firstName},</p>
    
    <p class="body-text">Here's your new verification code:</p>

    <div class="code-container">
        <div class="code-label">Verification Code</div>
        <div class="code">${verificationCode}</div>
        <div class="code-expiry">⏰ Expires in 30 minutes</div>
    </div>

    <p class="body-text">
        If you didn't request this code, please ignore this email or <a href="mailto:contact@myartelab.com" class="link">contact our support team</a> if you have any concerns.
    </p>

    <div class="signature">
        <p class="signature-text">
            Best regards,<br>
            <span class="signature-team">The MyArteLab Team</span>
        </p>
    </div>
  `, `Your MyArteLab verification code: ${verificationCode}`, { title: 'Verification Code' }),

  /**
   * Password Reset
   */
  passwordReset: (resetUrl) => baseTemplate(`
    <h1 class="greeting">Reset Your Password</h1>
    
    <p class="body-text">
        You requested a password reset for your MyArteLab account. Click the button below to create a new password:
    </p>

    <div class="button-container">
        <a href="${resetUrl}" class="button">Reset Password</a>
    </div>

    <p class="body-text" style="font-size: 14px;">
        Or copy and paste this link into your browser:<br>
        <span class="link-block">${resetUrl}</span>
    </p>

    <div class="info-box warning-box">
        <div class="info-box-title">🔒 Security Notice</div>
        <p class="info-box-text">
            If you didn't request this password reset, please ignore this email. Your password will remain unchanged. This link expires in 30 minutes.
        </p>
    </div>

    <div class="signature">
        <p class="signature-text">
            Best regards,<br>
            <span class="signature-team">The MyArteLab Team</span>
        </p>
    </div>
  `, 'Reset your MyArteLab password securely', { title: 'Password Reset' }),

  /**
   * Test Email
   */
  test: (recipientEmail) => baseTemplate(`
    <h1 class="greeting">Email Configuration Test ✅</h1>
    
    <p class="body-text">
        Congratulations! Your email system is working perfectly with our new professional templates.
    </p>

    <div class="info-box success-box">
        <div class="info-box-title">📧 Test Successful</div>
        <p class="info-box-text">
            <strong>Recipient:</strong> ${recipientEmail}<br>
            <strong>Time:</strong> ${new Date().toLocaleString()}<br>
            <strong>Service:</strong> Zoho Mail SMTP<br>
            <strong>Template Version:</strong> Professional v2.0
        </p>
    </div>

    <table class="data-table" cellpadding="0" cellspacing="0" border="0">
        <tr class="data-table-row">
            <td class="data-table-label">SMTP Connection</td>
            <td class="data-table-value">✅ Connected</td>
        </tr>
        <tr class="data-table-row">
            <td class="data-table-label">Authentication</td>
            <td class="data-table-value">✅ Working</td>
        </tr>
        <tr class="data-table-row">
            <td class="data-table-label">Template Rendering</td>
            <td class="data-table-value">✅ Perfect</td>
        </tr>
        <tr class="data-table-row">
            <td class="data-table-label">Brand Colors</td>
            <td class="data-table-value">✅ Applied</td>
        </tr>
    </table>

    <div class="signature">
        <p class="signature-text">
            Best regards,<br>
            <span class="signature-team">The MyArteLab Team</span>
        </p>
    </div>
  `, 'MyArteLab Email Test - All Systems Operational!', { title: 'Email Test' }),

  /**
   * Booking Confirmation (Client)
   */
  bookingConfirmationClient: (booking, creator) => baseTemplate(`
    <h1 class="greeting">Booking Confirmed! 🎉</h1>
    
    <p class="body-text">
        Your booking with <strong>${creator.name}</strong> has been successfully created and is now pending their confirmation.
    </p>

    <table class="data-table" cellpadding="0" cellspacing="0" border="0">
        <tr class="data-table-row">
            <td class="data-table-label">Booking ID</td>
            <td class="data-table-value">${booking.bookingId}</td>
        </tr>
        <tr class="data-table-row">
            <td class="data-table-label">Creator</td>
            <td class="data-table-value">${creator.name}</td>
        </tr>
        <tr class="data-table-row">
            <td class="data-table-label">Service</td>
            <td class="data-table-value">${booking.serviceDetails?.title || 'Custom Request'}</td>
        </tr>
        <tr class="data-table-row">
            <td class="data-table-label">Amount</td>
            <td class="data-table-value amount">${booking.currency} ${booking.amount.toFixed(2)}</td>
        </tr>
        <tr class="data-table-row">
            <td class="data-table-label">Status</td>
            <td class="data-table-value">⏳ Awaiting Creator Confirmation</td>
        </tr>
    </table>

    <div class="info-box">
        <div class="info-box-title">💡 What's Next?</div>
        <p class="info-box-text">
            The creator will review your request and either accept it or provide a counter-proposal. You'll receive a notification once they respond.
        </p>
    </div>

    <div class="button-container">
        <a href="https://app.myartelab.com/bookings/${booking._id}" class="button">View Booking</a>
    </div>

    <div class="signature">
        <p class="signature-text">
            Best regards,<br>
            <span class="signature-team">The MyArteLab Team</span>
        </p>
    </div>
  `, `Your booking with ${creator?.name || 'creator'} has been created`, { title: 'Booking Confirmed' }),

  /**
   * Booking Confirmation (Creator)
   */
  bookingConfirmationCreator: (booking, client) => baseTemplate(`
    <h1 class="greeting">New Booking Request! 🔔</h1>
    
    <p class="body-text">
        <strong>${client.name}</strong> has sent you a booking request. Review and respond to start working together.
    </p>

    <table class="data-table" cellpadding="0" cellspacing="0" border="0">
        <tr class="data-table-row">
            <td class="data-table-label">Booking ID</td>
            <td class="data-table-value">${booking.bookingId}</td>
        </tr>
        <tr class="data-table-row">
            <td class="data-table-label">Client</td>
            <td class="data-table-value">${client.name} (${client.email})</td>
        </tr>
        <tr class="data-table-row">
            <td class="data-table-label">Service</td>
            <td class="data-table-value">${booking.serviceDetails?.title || 'Custom Request'}</td>
        </tr>
        <tr class="data-table-row">
            <td class="data-table-label">Proposed Amount</td>
            <td class="data-table-value amount">${booking.currency} ${booking.amount.toFixed(2)}</td>
        </tr>
        <tr class="data-table-row">
            <td class="data-table-label">Your Earnings</td>
            <td class="data-table-value" style="color: ${COLORS.success}; font-weight: 600;">
                ${booking.currency} ${(booking.amount * 0.9).toFixed(2)} (after 10% platform fee)
            </td>
        </tr>
    </table>

    <div class="button-container">
        <a href="https://app.myartelab.com/bookings/${booking._id}" class="button">Review Booking</a>
    </div>

    <div class="info-box success-box">
        <div class="info-box-title">💰 Earnings Protection</div>
        <p class="info-box-text">
            Payment is secured in escrow before you start working. Funds are released automatically upon project completion.
        </p>
    </div>

    <div class="signature">
        <p class="signature-text">
            Best regards,<br>
            <span class="signature-team">The MyArteLab Team</span>
        </p>
    </div>
  `, `New booking request from ${client?.name || 'client'}`, { title: 'New Booking Request' }),

  /**
   * Payment Received
   */
  paymentReceived: (booking) => baseTemplate(`
    <h1 class="greeting">Payment Received! 💰</h1>
    
    <p class="body-text">
        We've received payment for your booking. The funds are now securely held in escrow.
    </p>

    <div class="code-container" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%); border-color: ${COLORS.success};">
        <div class="code-label" style="color: ${COLORS.success};">Amount Secured</div>
        <div class="code" style="color: ${COLORS.success};">${booking.currency} ${booking.amount.toFixed(2)}</div>
        <div class="code-expiry" style="color: ${COLORS.success};">✓ Secured in Escrow</div>
    </div>

    <table class="data-table" cellpadding="0" cellspacing="0" border="0">
        <tr class="data-table-row">
            <td class="data-table-label">Booking ID</td>
            <td class="data-table-value">${booking.bookingId}</td>
        </tr>
        <tr class="data-table-row">
            <td class="data-table-label">Status</td>
            <td class="data-table-value" style="color: ${COLORS.success}; font-weight: 600;">Payment Confirmed</td>
        </tr>
    </table>

    <div class="info-box success-box">
        <div class="info-box-title">🔒 Escrow Protection</div>
        <p class="info-box-text">
            Your payment is securely held in escrow. The creator can now begin working on your project with confidence.
        </p>
    </div>

    <div class="button-container">
        <a href="https://app.myartelab.com/bookings/${booking._id}" class="button">View Booking</a>
    </div>

    <div class="signature">
        <p class="signature-text">
            Best regards,<br>
            <span class="signature-team">The MyArteLab Team</span>
        </p>
    </div>
  `, `Payment of ${booking.currency} ${booking.amount.toFixed(2)} received`, { title: 'Payment Received' }),

  /**
   * Work Delivered
   */
  workDelivered: (booking) => baseTemplate(`
    <h1 class="greeting">Work Delivered! 📦</h1>
    
    <p class="body-text">
        Great news! The creator has delivered the work for your booking. Please review and approve to release payment.
    </p>

    <table class="data-table" cellpadding="0" cellspacing="0" border="0">
        <tr class="data-table-row">
            <td class="data-table-label">Booking ID</td>
            <td class="data-table-value">${booking.bookingId}</td>
        </tr>
        <tr class="data-table-row">
            <td class="data-table-label">Status</td>
            <td class="data-table-value" style="color: ${COLORS.warning}; font-weight: 600;">📝 Awaiting Your Approval</td>
        </tr>
    </table>

    <div class="button-container">
        <a href="https://app.myartelab.com/bookings/${booking._id}" class="button">Review & Approve</a>
    </div>

    <div class="info-box warning-box">
        <div class="info-box-title">⏰ Action Required</div>
        <p class="info-box-text">
            Please review the delivered work within 7 days. If no action is taken, the payment will be automatically released to the creator.
        </p>
    </div>

    <div class="signature">
        <p class="signature-text">
            Best regards,<br>
            <span class="signature-team">The MyArteLab Team</span>
        </p>
    </div>
  `, `Work delivered for booking ${booking.bookingId}`, { title: 'Work Delivered' }),

  /**
   * Payment Released (Creator)
   */
  paymentReleased: (booking, amount) => baseTemplate(`
    <h1 class="greeting">Payment Released! 💸</h1>
    
    <p class="body-text">
        The client has approved your work and payment has been released to your wallet!
    </p>

    <div class="code-container" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%); border-color: ${COLORS.success};">
        <div class="code-label" style="color: ${COLORS.success};">Earnings Credited</div>
        <div class="code" style="color: ${COLORS.success};">${booking.currency} ${amount.toFixed(2)}</div>
        <div class="code-expiry" style="color: ${COLORS.success};">✓ Available for Withdrawal</div>
    </div>

    <table class="data-table" cellpadding="0" cellspacing="0" border="0">
        <tr class="data-table-row">
            <td class="data-table-label">Booking ID</td>
            <td class="data-table-value">${booking.bookingId}</td>
        </tr>
        <tr class="data-table-row">
            <td class="data-table-label">Status</td>
            <td class="data-table-value" style="color: ${COLORS.success}; font-weight: 600;">✓ Completed</td>
        </tr>
    </table>

    <div class="button-container">
        <a href="https://app.myartelab.com/wallet" class="button">View Wallet</a>
    </div>

    <div class="signature">
        <p class="signature-text">
            Great work!<br>
            <span class="signature-team">The MyArteLab Team</span>
        </p>
    </div>
  `, `Payment of ${booking.currency} ${amount.toFixed(2)} released`, { title: 'Payment Released' })
};

module.exports = emailTemplates;
