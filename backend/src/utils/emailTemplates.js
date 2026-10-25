/**
 * Professional Branded Email Templates for MyArteLab
 *
 * Visual System:
 * - Neutral light background (#f4f5f7)
 * - Centered white card container (max 600px, border-radius 16px, subtle border)
 * - 4px horizontal brand purple divider (#9747FF) along top of card
 * - Branded header with MyArteLab logo and wordmark
 * - Centered high-resolution illustration (undraw_opened_47gd) for auth/confirmation
 * - Prominent, friendly heading
 * - Subtitle describing purpose
 * - Clear explanatory message
 * - Prominent 6-digit verification code container or branded CTA button
 * - Clean footer with support, privacy policy, and copyright
 * - Bulletproof table-based layout with inline CSS for 100% email client compatibility
 */

const BASE_APP_URL = process.env.FRONTEND_URL || 'https://app.myartelab.com';

const COLORS = {
  primary: '#9747FF',
  primaryHover: '#8534f0',
  primaryLight: '#fbf9ff',
  primaryBorder: '#e9d5ff',
  bgPage: '#f4f5f7',
  bgCard: '#ffffff',
  textHeading: '#111827',
  textBody: '#4b5563',
  textMuted: '#6b7280',
  border: '#e5e7eb',
  success: '#10b981',
  successBg: '#ecfdf5',
  warning: '#f59e0b',
  warningBg: '#fffbeb',
};

const ASSETS = {
  logo: `${BASE_APP_URL}/images/myartelab-logo.png`,
  openedIllustrationPng: `${BASE_APP_URL}/images/undraw_opened_47gd.png`,
  openedIllustrationSvg: `${BASE_APP_URL}/images/undraw_opened_47gd.svg`,
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Base template that wraps any email content with the MyArteLab branded container.
 */
const baseTemplate = ({
  title = 'Notification',
  preheader = '',
  illustrationUrl = null,
  illustrationAlt = 'MyArteLab Illustration',
  heading = '',
  subtitle = '',
  contentHtml = '',
  ctaText = null,
  ctaUrl = null,
  noticeText = null,
  noticeType = 'info', // 'info' | 'warning' | 'success'
  isSecurityEmail = false,
}) => {
  const currentYear = new Date().getFullYear();

  // Notice box styling
  let noticeBorder = COLORS.primary;
  let noticeBg = '#faf5ff';
  let noticeTextColor = '#6b21a8';
  let noticeIcon = 'ℹ️';

  if (noticeType === 'warning') {
    noticeBorder = COLORS.warning;
    noticeBg = COLORS.warningBg;
    noticeTextColor = '#92400e';
    noticeIcon = '🔒';
  } else if (noticeType === 'success') {
    noticeBorder = COLORS.success;
    noticeBg = COLORS.successBg;
    noticeTextColor = '#065f46';
    noticeIcon = '✓';
  }

  const illustrationMarkup = illustrationUrl ? `
    <!-- Illustration -->
    <tr>
      <td align="center" style="padding: 24px 30px 16px 30px;">
        <img src="${illustrationUrl}" alt="${escapeHtml(illustrationAlt)}" width="220" height="193" style="display: block; width: 220px; max-width: 100%; height: auto; margin: 0 auto; border: 0;" />
      </td>
    </tr>
  ` : '';

  const headingMarkup = heading ? `
    <!-- Heading -->
    <tr>
      <td align="center" style="padding: 12px 32px 6px 32px;">
        <h1 style="margin: 0; font-size: 26px; line-height: 1.25; font-weight: 800; color: ${COLORS.textHeading}; letter-spacing: -0.5px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          ${escapeHtml(heading)}
        </h1>
      </td>
    </tr>
  ` : '';

  const subtitleMarkup = subtitle ? `
    <!-- Subtitle -->
    <tr>
      <td align="center" style="padding: 0 32px 20px 32px;">
        <p style="margin: 0; font-size: 15px; line-height: 1.5; color: ${COLORS.textMuted}; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          ${escapeHtml(subtitle)}
        </p>
      </td>
    </tr>
  ` : '';

  const ctaMarkup = (ctaText && ctaUrl) ? `
    <!-- Primary CTA Button -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 28px auto;">
      <tr>
        <td align="center" style="border-radius: 9999px; background-color: ${COLORS.primary};">
          <a href="${ctaUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 14px 36px; font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 9999px; background-color: ${COLORS.primary}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; letter-spacing: 0.2px;">
            ${escapeHtml(ctaText)}
          </a>
        </td>
      </tr>
    </table>
  ` : '';

  const noticeMarkup = noticeText ? `
    <!-- Notice Box -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 24px 0 16px 0;">
      <tr>
        <td style="padding: 16px 20px; background-color: ${noticeBg}; border-left: 4px solid ${noticeBorder}; border-radius: 8px;">
          <p style="margin: 0; font-size: 13px; line-height: 1.6; color: ${noticeTextColor}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <strong style="margin-right: 4px;">${noticeIcon}</strong> ${noticeText}
          </p>
        </td>
      </tr>
    </table>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <meta name="x-apple-disable-message-reformatting">
    <title>MyArteLab - ${escapeHtml(title)}</title>
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
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
        body { margin: 0; padding: 0; width: 100% !important; background-color: ${COLORS.bgPage}; }
        @media only screen and (max-width: 600px) {
            .email-container { width: 100% !important; border-radius: 0 !important; }
            .content-padding { padding-left: 20px !important; padding-right: 20px !important; }
            .code-text { font-size: 32px !important; letter-spacing: 6px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${COLORS.bgPage}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <!-- Preheader for preview text -->
    <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: #ffffff;">
        ${escapeHtml(preheader)}
    </div>

    <!-- Outer background wrapper -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: ${COLORS.bgPage}; margin: 0; padding: 40px 16px 48px 16px;">
        <tr>
            <td align="center" valign="top">
                <!-- Centered Card Container -->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="email-container" style="max-width: 600px; background-color: ${COLORS.bgCard}; border-radius: 16px; border: 1px solid ${COLORS.border}; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);">
                    
                    <!-- Top Brand Accent Divider (4px) -->
                    <tr>
                        <td height="4" style="background-color: ${COLORS.primary}; line-height: 4px; font-size: 4px; mso-line-height-rule: exactly;">&nbsp;</td>
                    </tr>

                    <!-- Branded Header: Logo and Wordmark -->
                    <tr>
                        <td align="center" style="padding: 32px 32px 12px 32px;">
                            <a href="${BASE_APP_URL}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; display: inline-block;">
                                <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                                    <tr>
                                        <td valign="middle" style="padding-right: 10px;">
                                            <img src="${ASSETS.logo}" width="36" height="36" alt="MyArteLab Logo" style="display: block; width: 36px; height: 36px; border: 0;" />
                                        </td>
                                        <td valign="middle">
                                            <span style="font-size: 22px; font-weight: 800; color: #111827; letter-spacing: -0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">MyArte<span style="color: ${COLORS.primary};">Lab</span></span>
                                        </td>
                                    </tr>
                                </table>
                            </a>
                        </td>
                    </tr>

                    ${illustrationMarkup}
                    ${headingMarkup}
                    ${subtitleMarkup}

                    <!-- Content Body -->
                    <tr>
                        <td class="content-padding" style="padding: 8px 40px 32px 40px; color: ${COLORS.textBody}; font-size: 15px; line-height: 1.65; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                            ${contentHtml}
                            ${ctaMarkup}
                            ${noticeMarkup}

                            <!-- Sign-off -->
                            <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid ${COLORS.border};">
                                <p style="margin: 0; font-size: 14px; color: ${COLORS.textMuted}; line-height: 1.6;">
                                    Warm regards,<br />
                                    <strong style="color: ${COLORS.textHeading}; font-weight: 600;">The MyArteLab Team</strong>
                                </p>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 28px 32px; background-color: #f9fafb; border-top: 1px solid ${COLORS.border}; text-align: center;">
                            <p style="margin: 0 0 12px 0; font-size: 13px; color: ${COLORS.textMuted}; line-height: 1.5;">
                                <a href="${BASE_APP_URL}" target="_blank" rel="noopener noreferrer" style="color: ${COLORS.primary}; text-decoration: none; font-weight: 500; margin: 0 8px;">Home</a>
                                •
                                <a href="${BASE_APP_URL}/privacy-policy" target="_blank" rel="noopener noreferrer" style="color: ${COLORS.primary}; text-decoration: none; font-weight: 500; margin: 0 8px;">Privacy Policy</a>
                                •
                                <a href="mailto:support@myartelab.com" style="color: ${COLORS.primary}; text-decoration: none; font-weight: 500; margin: 0 8px;">Support</a>
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.5;">
                                © ${currentYear} MyArteLab Inc. All rights reserved.<br />
                                ${isSecurityEmail
                                  ? 'This is a mandatory security notice sent regarding your MyArteLab account.'
                                  : 'You are receiving this email because of your activity on MyArteLab.'}
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
};

/**
 * Reusable HTML helper to generate a prominent 6-digit verification code container.
 */
function renderVerificationCodeBox(code, label = 'VERIFICATION CODE', expiryText = '⏱️ Expires in 30 minutes for security') {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 24px 0 20px 0;">
      <tr>
        <td align="center" style="background-color: ${COLORS.primaryLight}; border: 2px dashed ${COLORS.primary}; border-radius: 14px; padding: 24px 16px;">
          <div style="font-size: 12px; font-weight: 700; color: #7e22ce; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            ${escapeHtml(label)}
          </div>
          <div class="code-text" style="font-size: 40px; font-weight: 800; letter-spacing: 10px; color: #111827; font-family: 'Courier New', Courier, monospace; margin: 6px 0; text-align: center;">
            ${escapeHtml(code)}
          </div>
          <div style="font-size: 13px; color: ${COLORS.textMuted}; margin-top: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            ${escapeHtml(expiryText)}
          </div>
        </td>
      </tr>
    </table>
  `;
}

const emailTemplates = {
  /**
   * 1. Welcome & Email Verification (Registration)
   */
  welcome: (firstName, verificationCode) => {
    const greetingName = firstName ? escapeHtml(firstName) : 'there';
    const contentHtml = `
      <p style="margin: 0 0 16px 0; font-size: 16px; color: ${COLORS.textHeading}; font-weight: 600;">
        Hi ${greetingName},
      </p>
      <p style="margin: 0 0 16px 0;">
        Welcome to MyArteLab! Your account has been created. We're thrilled to connect you with our vibrant global network of creators and clients.
      </p>
      <p style="margin: 0 0 8px 0;">
        Please enter the 6-digit verification code below on the confirmation screen to activate your account:
      </p>

      ${renderVerificationCodeBox(verificationCode, 'VERIFICATION CODE', '⏱️ Expires in 30 minutes for security')}

      <p style="margin: 16px 0 0 0; font-size: 14px; color: ${COLORS.textMuted};">
        Once verified, you will have full access to create bookings, showcase your portfolio, and manage your wallet seamlessly.
      </p>
    `;

    return baseTemplate({
      title: 'Welcome to MyArteLab',
      preheader: `Your MyArteLab verification code is ${verificationCode}.`,
      illustrationUrl: ASSETS.openedIllustrationPng,
      illustrationAlt: 'Email Verification Illustration',
      heading: 'Verify your email address',
      subtitle: 'Confirm your email to get started on MyArteLab.',
      contentHtml,
      ctaText: 'Verify email',
      ctaUrl: `${BASE_APP_URL}/verify-email`,
      noticeText: "If you didn't create an account with MyArteLab, you can safely disregard this email.",
      noticeType: 'info',
      isSecurityEmail: true,
    });
  },

  /**
   * 2. Resend Email Verification Code
   */
  verificationCode: (firstName, verificationCode) => {
    const greetingName = firstName ? escapeHtml(firstName) : 'there';
    const contentHtml = `
      <p style="margin: 0 0 16px 0; font-size: 16px; color: ${COLORS.textHeading}; font-weight: 600;">
        Hi ${greetingName},
      </p>
      <p style="margin: 0 0 8px 0;">
        Here is your new 6-digit verification code as requested:
      </p>

      ${renderVerificationCodeBox(verificationCode, 'NEW VERIFICATION CODE', '⏱️ Expires in 30 minutes')}

      <p style="margin: 16px 0 0 0; font-size: 14px; color: ${COLORS.textMuted};">
        Enter this code in your browser to complete email verification.
      </p>
    `;

    return baseTemplate({
      title: 'Your Verification Code',
      preheader: `Your new verification code is ${verificationCode}.`,
      illustrationUrl: ASSETS.openedIllustrationPng,
      illustrationAlt: 'Verification Code Illustration',
      heading: 'Verify your email address',
      subtitle: 'Your new verification code is ready.',
      contentHtml,
      ctaText: 'Enter verification code',
      ctaUrl: `${BASE_APP_URL}/verify-email`,
      noticeText: "If you didn't request a new verification code, please ignore this email or reach out to support.",
      noticeType: 'info',
      isSecurityEmail: true,
    });
  },

  /**
   * 3. Password Reset
   */
  passwordReset: (nameOrUrl, code, url) => {
    let firstName = 'there';
    let resetCode = null;
    let resetUrl = '';

    if (code) {
      firstName = nameOrUrl || 'there';
      resetCode = code;
      resetUrl = url || '';
    } else if (typeof nameOrUrl === 'string' && nameOrUrl.startsWith('http')) {
      resetUrl = nameOrUrl;
    } else {
      firstName = nameOrUrl || 'there';
      resetUrl = url || '';
    }

    const greetingName = escapeHtml(firstName);

    let codeSection = '';
    if (resetCode) {
      codeSection = `
        <p style="margin: 0 0 8px 0;">
          Enter the 6-digit code below on the password reset screen:
        </p>
        ${renderVerificationCodeBox(resetCode, 'PASSWORD RESET CODE', '⏱️ Expires in 30 minutes')}
      `;
    }

    const contentHtml = `
      <p style="margin: 0 0 16px 0; font-size: 16px; color: ${COLORS.textHeading}; font-weight: 600;">
        Hi ${greetingName},
      </p>
      <p style="margin: 0 0 16px 0;">
        We received a request to reset the password for your MyArteLab account.
      </p>
      ${codeSection}
      <p style="margin: 16px 0 0 0; font-size: 14px; color: ${COLORS.textMuted};">
        You can also click the button below to proceed directly.
      </p>
    `;

    return baseTemplate({
      title: 'Reset Your Password',
      preheader: resetCode ? `Your password reset code is ${resetCode}.` : 'Reset your MyArteLab password securely.',
      illustrationUrl: ASSETS.openedIllustrationPng,
      illustrationAlt: 'Password Reset Illustration',
      heading: 'Reset your password',
      subtitle: 'Follow the instructions below to choose a new password.',
      contentHtml,
      ctaText: 'Reset password',
      ctaUrl: resetUrl || `${BASE_APP_URL}/forgot-password`,
      noticeText: "If you did not request a password reset, please ignore this email. Your password will remain unchanged and your account is secure.",
      noticeType: 'warning',
      isSecurityEmail: true,
    });
  },

  /**
   * 4. Email Verified Successfully Confirmation
   */
  emailVerified: (firstName) => {
    const greetingName = firstName ? escapeHtml(firstName) : 'there';
    const contentHtml = `
      <p style="margin: 0 0 16px 0; font-size: 16px; color: ${COLORS.textHeading}; font-weight: 600;">
        Hi ${greetingName},
      </p>
      <p style="margin: 0 0 16px 0;">
        Your email address has been verified successfully. Your MyArteLab account is now fully active!
      </p>
      <p style="margin: 0 0 16px 0;">
        You can now explore creators, post requests, manage bookings, and transact securely on the platform.
      </p>
    `;

    return baseTemplate({
      title: 'Email Verified',
      preheader: 'Your MyArteLab account is verified and ready to use.',
      illustrationUrl: ASSETS.openedIllustrationPng,
      illustrationAlt: 'Account Verified Illustration',
      heading: 'Email verified',
      subtitle: 'Your account is ready. Welcome to MyArteLab.',
      contentHtml,
      ctaText: 'Explore MyArteLab',
      ctaUrl: `${BASE_APP_URL}/home`,
      noticeText: 'Need help? Reach out to support@myartelab.com anytime.',
      noticeType: 'success',
      isSecurityEmail: false,
    });
  },

  /**
   * 5. Booking Confirmation (Client)
   */
  bookingConfirmationClient: (booking, creator) => {
    const creatorName = escapeHtml(creator?.name || 'Creator');
    const serviceTitle = escapeHtml(booking.serviceDetails?.title || 'Creative Service');
    const bookingId = escapeHtml(booking.bookingId || booking._id);
    const amountStr = `${escapeHtml(booking.currency)} ${Number(booking.amount || 0).toFixed(2)}`;

    const contentHtml = `
      <p style="margin: 0 0 16px 0; font-size: 16px; color: ${COLORS.textHeading}; font-weight: 600;">
        Booking Request Sent
      </p>
      <p style="margin: 0 0 16px 0;">
        Your booking request with <strong>${creatorName}</strong> has been received and is awaiting their confirmation.
      </p>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fafafa; border: 1px solid ${COLORS.border}; border-radius: 12px; margin: 20px 0; overflow: hidden;">
        <tr>
          <td style="padding: 12px 16px; font-weight: 600; font-size: 14px; color: ${COLORS.textMuted}; width: 35%; border-bottom: 1px solid ${COLORS.border};">Booking ID</td>
          <td style="padding: 12px 16px; font-size: 14px; color: ${COLORS.textHeading}; border-bottom: 1px solid ${COLORS.border};">${bookingId}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-weight: 600; font-size: 14px; color: ${COLORS.textMuted}; border-bottom: 1px solid ${COLORS.border};">Creator</td>
          <td style="padding: 12px 16px; font-size: 14px; color: ${COLORS.textHeading}; border-bottom: 1px solid ${COLORS.border};">${creatorName}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-weight: 600; font-size: 14px; color: ${COLORS.textMuted}; border-bottom: 1px solid ${COLORS.border};">Service</td>
          <td style="padding: 12px 16px; font-size: 14px; color: ${COLORS.textHeading}; border-bottom: 1px solid ${COLORS.border};">${serviceTitle}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-weight: 600; font-size: 14px; color: ${COLORS.textMuted};">Amount</td>
          <td style="padding: 12px 16px; font-size: 16px; font-weight: 700; color: ${COLORS.primary};">${amountStr}</td>
        </tr>
      </table>
    `;

    return baseTemplate({
      title: 'Booking Confirmed',
      preheader: `Your booking with ${creatorName} has been created.`,
      heading: 'Booking request sent',
      subtitle: `Booking #${bookingId}`,
      contentHtml,
      ctaText: 'View booking',
      ctaUrl: `${BASE_APP_URL}/bookings/${booking._id}`,
      noticeText: 'The creator will review your request. You will be notified as soon as they respond.',
      noticeType: 'info',
    });
  },

  /**
   * 6. Booking Confirmation (Creator)
   */
  bookingConfirmationCreator: (booking, client) => {
    const clientName = escapeHtml(client?.name || 'A client');
    const serviceTitle = escapeHtml(booking.serviceDetails?.title || 'Creative Service');
    const bookingId = escapeHtml(booking.bookingId || booking._id);
    const amountStr = `${escapeHtml(booking.currency)} ${Number(booking.amount || 0).toFixed(2)}`;
    const earningsStr = `${escapeHtml(booking.currency)} ${(Number(booking.amount || 0) * 0.9).toFixed(2)}`;

    const contentHtml = `
      <p style="margin: 0 0 16px 0; font-size: 16px; color: ${COLORS.textHeading}; font-weight: 600;">
        New Project Opportunity
      </p>
      <p style="margin: 0 0 16px 0;">
        <strong>${clientName}</strong> sent you a new booking request. Review the project scope and accept to begin collaboration.
      </p>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fafafa; border: 1px solid ${COLORS.border}; border-radius: 12px; margin: 20px 0; overflow: hidden;">
        <tr>
          <td style="padding: 12px 16px; font-weight: 600; font-size: 14px; color: ${COLORS.textMuted}; width: 35%; border-bottom: 1px solid ${COLORS.border};">Booking ID</td>
          <td style="padding: 12px 16px; font-size: 14px; color: ${COLORS.textHeading}; border-bottom: 1px solid ${COLORS.border};">${bookingId}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-weight: 600; font-size: 14px; color: ${COLORS.textMuted}; border-bottom: 1px solid ${COLORS.border};">Client</td>
          <td style="padding: 12px 16px; font-size: 14px; color: ${COLORS.textHeading}; border-bottom: 1px solid ${COLORS.border};">${clientName}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-weight: 600; font-size: 14px; color: ${COLORS.textMuted}; border-bottom: 1px solid ${COLORS.border};">Service</td>
          <td style="padding: 12px 16px; font-size: 14px; color: ${COLORS.textHeading}; border-bottom: 1px solid ${COLORS.border};">${serviceTitle}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-weight: 600; font-size: 14px; color: ${COLORS.textMuted}; border-bottom: 1px solid ${COLORS.border};">Proposed Amount</td>
          <td style="padding: 12px 16px; font-size: 14px; color: ${COLORS.textHeading}; border-bottom: 1px solid ${COLORS.border};">${amountStr}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-weight: 600; font-size: 14px; color: ${COLORS.textMuted};">Your Earnings</td>
          <td style="padding: 12px 16px; font-size: 16px; font-weight: 700; color: ${COLORS.success};">${earningsStr} (after 10% platform fee)</td>
        </tr>
      </table>
    `;

    return baseTemplate({
      title: 'New Booking Request',
      preheader: `New booking request from ${clientName} for ${amountStr}.`,
      heading: 'New booking request',
      subtitle: `Booking #${bookingId}`,
      contentHtml,
      ctaText: 'Review booking',
      ctaUrl: `${BASE_APP_URL}/bookings/${booking._id}`,
      noticeText: 'Funds are held in escrow before work begins and released when the client approves deliverables.',
      noticeType: 'success',
    });
  },

  /**
   * 7. Payment Received in Escrow
   */
  paymentReceived: (booking) => {
    const bookingId = escapeHtml(booking.bookingId || booking._id);
    const amountStr = `${escapeHtml(booking.currency)} ${Number(booking.amount || 0).toFixed(2)}`;

    const contentHtml = `
      <p style="margin: 0 0 16px 0; font-size: 16px; color: ${COLORS.textHeading}; font-weight: 600;">
        Payment Confirmed
      </p>
      <p style="margin: 0 0 16px 0;">
        Payment for booking <strong>#${bookingId}</strong> has been secured in escrow.
      </p>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fafafa; border: 1px solid ${COLORS.border}; border-radius: 12px; margin: 20px 0; overflow: hidden;">
        <tr>
          <td style="padding: 12px 16px; font-weight: 600; font-size: 14px; color: ${COLORS.textMuted}; width: 35%; border-bottom: 1px solid ${COLORS.border};">Booking ID</td>
          <td style="padding: 12px 16px; font-size: 14px; color: ${COLORS.textHeading}; border-bottom: 1px solid ${COLORS.border};">${bookingId}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-weight: 600; font-size: 14px; color: ${COLORS.textMuted}; border-bottom: 1px solid ${COLORS.border};">Amount Secured</td>
          <td style="padding: 12px 16px; font-size: 16px; font-weight: 700; color: ${COLORS.success}; border-bottom: 1px solid ${COLORS.border};">${amountStr}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-weight: 600; font-size: 14px; color: ${COLORS.textMuted};">Status</td>
          <td style="padding: 12px 16px; font-size: 14px; font-weight: 600; color: ${COLORS.success};">✓ Held in Escrow</td>
        </tr>
      </table>
    `;

    return baseTemplate({
      title: 'Payment Received',
      preheader: `Payment of ${amountStr} has been secured in escrow.`,
      heading: 'Escrow funded',
      subtitle: `Booking #${bookingId}`,
      contentHtml,
      ctaText: 'View booking',
      ctaUrl: `${BASE_APP_URL}/bookings/${booking._id}`,
      noticeText: 'Funds are held safely in escrow and released when the client approves deliverables.',
      noticeType: 'success',
    });
  },

  /**
   * 8. Work Delivered
   */
  workDelivered: (booking) => {
    const bookingId = escapeHtml(booking.bookingId || booking._id);

    const contentHtml = `
      <p style="margin: 0 0 16px 0; font-size: 16px; color: ${COLORS.textHeading}; font-weight: 600;">
        Deliverables Ready for Review
      </p>
      <p style="margin: 0 0 16px 0;">
        The creator has submitted the deliverables for booking <strong>#${bookingId}</strong>. Please inspect the work and approve to release payment.
      </p>
    `;

    return baseTemplate({
      title: 'Work Delivered',
      preheader: `Work delivered for booking #${bookingId}. Please review and approve.`,
      heading: 'Deliverables submitted',
      subtitle: `Booking #${bookingId}`,
      contentHtml,
      ctaText: 'Review deliverables',
      ctaUrl: `${BASE_APP_URL}/bookings/${booking._id}`,
      noticeText: 'Please review deliverables within 7 days. If no action is taken, payment will release automatically.',
      noticeType: 'warning',
    });
  },

  /**
   * 9. Payment Released (Creator)
   */
  paymentReleased: (booking, amount) => {
    const bookingId = escapeHtml(booking.bookingId || booking._id);
    const amountStr = `${escapeHtml(booking.currency)} ${Number(amount || booking.amount || 0).toFixed(2)}`;

    const contentHtml = `
      <p style="margin: 0 0 16px 0; font-size: 16px; color: ${COLORS.textHeading}; font-weight: 600;">
        Earnings Credited
      </p>
      <p style="margin: 0 0 16px 0;">
        The client approved your work for booking <strong>#${bookingId}</strong>. Your payout of <strong>${amountStr}</strong> has been credited to your wallet!
      </p>
    `;

    return baseTemplate({
      title: 'Payment Released',
      preheader: `Payment of ${amountStr} has been credited to your wallet.`,
      heading: 'Payment released',
      subtitle: `Booking #${bookingId}`,
      contentHtml,
      ctaText: 'View wallet',
      ctaUrl: `${BASE_APP_URL}/wallet`,
      noticeText: 'Funds are available immediately for withdrawal to your external wallet.',
      noticeType: 'success',
    });
  },

  /**
   * 10. Withdrawal Initiated
   */
  withdrawalInitiated: (user, withdrawal) => {
    const amountStr = `${escapeHtml(withdrawal.currency)} ${Number(withdrawal.amount || 0).toFixed(2)}`;
    const destination = escapeHtml(withdrawal.toAddress || 'External Wallet');

    const contentHtml = `
      <p style="margin: 0 0 16px 0; font-size: 16px; color: ${COLORS.textHeading}; font-weight: 600;">
        Hi ${escapeHtml(user?.firstName || user?.name || 'there')},
      </p>
      <p style="margin: 0 0 16px 0;">
        Your withdrawal request of <strong>${amountStr}</strong> to <code>${destination}</code> has been initiated.
      </p>
    `;

    return baseTemplate({
      title: 'Withdrawal Initiated',
      preheader: `Your withdrawal of ${amountStr} has been initiated.`,
      heading: 'Withdrawal processing',
      subtitle: 'Transfer initiated from your wallet.',
      contentHtml,
      ctaText: 'View wallet',
      ctaUrl: `${BASE_APP_URL}/wallet`,
      noticeText: 'You will receive another notification once the transaction has confirmed on-chain.',
      noticeType: 'info',
      isSecurityEmail: true,
    });
  },

  /**
   * 11. Withdrawal Completed
   */
  withdrawalCompleted: (user, withdrawal) => {
    const amountStr = `${escapeHtml(withdrawal.currency)} ${Number(withdrawal.amount || 0).toFixed(2)}`;
    const txHash = escapeHtml(withdrawal.txHash || '');

    const contentHtml = `
      <p style="margin: 0 0 16px 0; font-size: 16px; color: ${COLORS.textHeading}; font-weight: 600;">
        Hi ${escapeHtml(user?.firstName || user?.name || 'there')},
      </p>
      <p style="margin: 0 0 16px 0;">
        Your withdrawal of <strong>${amountStr}</strong> has completed successfully!
      </p>
      ${txHash ? `<p style="margin: 0 0 16px 0; font-size: 13px; color: ${COLORS.textMuted};">Transaction Hash: <br/><code style="word-break: break-all;">${txHash}</code></p>` : ''}
    `;

    return baseTemplate({
      title: 'Withdrawal Completed',
      preheader: `Your withdrawal of ${amountStr} has completed.`,
      heading: 'Withdrawal completed',
      subtitle: 'Your funds have been transferred.',
      contentHtml,
      ctaText: 'View wallet',
      ctaUrl: `${BASE_APP_URL}/wallet`,
      noticeText: 'The funds should now be reflected in your receiving wallet.',
      noticeType: 'success',
      isSecurityEmail: true,
    });
  },

  /**
   * 12. Email Diagnostic Test
   */
  test: (recipientEmail) => {
    const contentHtml = `
      <p style="margin: 0 0 16px 0;">
        This test confirms that your Zoho Mail SMTP configuration, branded templates, and HTML formatting are functioning properly.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fafafa; border: 1px solid ${COLORS.border}; border-radius: 12px; margin: 20px 0; overflow: hidden;">
        <tr>
          <td style="padding: 12px 16px; font-weight: 600; font-size: 14px; color: ${COLORS.textMuted}; width: 35%; border-bottom: 1px solid ${COLORS.border};">Recipient</td>
          <td style="padding: 12px 16px; font-size: 14px; color: ${COLORS.textHeading}; border-bottom: 1px solid ${COLORS.border};">${escapeHtml(recipientEmail)}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-weight: 600; font-size: 14px; color: ${COLORS.textMuted}; border-bottom: 1px solid ${COLORS.border};">Timestamp</td>
          <td style="padding: 12px 16px; font-size: 14px; color: ${COLORS.textHeading}; border-bottom: 1px solid ${COLORS.border};">${new Date().toISOString()}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-weight: 600; font-size: 14px; color: ${COLORS.textMuted};">Template Engine</td>
          <td style="padding: 12px 16px; font-size: 14px; font-weight: 600; color: ${COLORS.success};">✓ Branded Global System v3.0</td>
        </tr>
      </table>
    `;

    return baseTemplate({
      title: 'Email Configuration Test',
      preheader: 'MyArteLab email configuration test message.',
      illustrationUrl: ASSETS.openedIllustrationPng,
      illustrationAlt: 'Test Email Illustration',
      heading: 'Email System Operational ✅',
      subtitle: 'Zoho Mail SMTP & Branded Template Test',
      contentHtml,
      ctaText: 'Visit MyArteLab',
      ctaUrl: BASE_APP_URL,
      noticeText: 'All production transactional emails are rendering through this branded email template.',
      noticeType: 'success',
    });
  },

  // Export baseTemplate for custom usage
  baseTemplate,
};

module.exports = emailTemplates;
