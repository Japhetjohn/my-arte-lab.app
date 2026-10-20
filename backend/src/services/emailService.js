const emailConfig = require('../config/email');
const emailTemplates = require('../utils/emailTemplates');

class EmailService {
  async sendWelcomeEmail(user) {
    return await emailConfig.sendEmail({
      to: user.email,
      subject: 'Welcome to MyArteLab!',
      html: emailTemplates.emailVerified(user.firstName || user.name)
    });
  }

  async sendBookingConfirmation(booking, client, creator) {
    return await emailConfig.sendEmail({
      to: client.email,
      subject: `Booking Confirmed - #${booking.bookingId || booking._id}`,
      html: emailTemplates.bookingConfirmationClient(booking, creator)
    });
  }

  async sendPaymentReceived(booking, creator) {
    return await emailConfig.sendEmail({
      to: creator.email,
      subject: `Payment Received - #${booking.bookingId || booking._id}`,
      html: emailTemplates.paymentReceived(booking)
    });
  }

  async sendWithdrawalNotification(user, withdrawal) {
    return await emailConfig.sendEmail({
      to: user.email,
      subject: 'Withdrawal Initiated ⚡',
      html: emailTemplates.withdrawalInitiated(user, withdrawal)
    });
  }

  async sendWithdrawalCompleted(user, withdrawal) {
    return await emailConfig.sendEmail({
      to: user.email,
      subject: 'Withdrawal Completed ✅',
      html: emailTemplates.withdrawalCompleted(user, withdrawal)
    });
  }

  async sendPasswordReset(user, resetToken) {
    const frontendUrl = process.env.FRONTEND_URL || 'https://app.myartelab.com';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email || '')}`;

    return await emailConfig.sendEmail({
      to: user.email,
      subject: 'Reset your MyArteLab password',
      html: emailTemplates.passwordReset(user.firstName || user.name, null, resetUrl)
    });
  }

  async sendCustomEmail({ to, subject, html, text }) {
    return await emailConfig.sendEmail({ to, subject, html, text });
  }

  async sendErrorNotification({ error, req, additionalInfo = {} }) {
    try {
      const adminEmail = process.env.ADMIN_EMAIL || 'japhetjohnk@gmail.com';

      const errorDetails = `
        <p style="margin: 0 0 8px 0;"><strong>Message:</strong> ${error.message || 'Unknown error'}</p>
        <p style="margin: 0 0 8px 0;"><strong>Status Code:</strong> ${error.statusCode || 500}</p>
        <p style="margin: 0 0 8px 0;"><strong>Time:</strong> ${new Date().toISOString()}</p>
        ${req ? `
          <p style="margin: 0 0 8px 0;"><strong>Method / URL:</strong> ${req.method} ${req.originalUrl || req.url}</p>
          <p style="margin: 0 0 8px 0;"><strong>IP:</strong> ${req.ip}</p>
          ${req.user ? `<p style="margin: 0 0 8px 0;"><strong>User:</strong> ${req.user.email || req.user._id}</p>` : ''}
        ` : ''}
        <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 12px; overflow-x: auto; margin-top: 12px;">
          <pre style="margin: 0; white-space: pre-wrap;">${error.stack || 'No stack trace available'}</pre>
        </div>
      `;

      const html = emailTemplates.baseTemplate({
        title: 'Production Error Alert',
        heading: '🚨 Production Error Alert',
        subtitle: error.message ? error.message.substring(0, 80) : 'System Exception',
        contentHtml: errorDetails,
        noticeText: 'This is an automated server error notification for MyArteLab administration.',
        noticeType: 'warning',
        isSecurityEmail: true,
      });

      await emailConfig.sendEmail({
        to: adminEmail,
        subject: `🚨 Production Error: ${error.message?.substring(0, 50) || 'Unknown Error'}`,
        html
      });
    } catch (emailError) {
      console.error('Failed to send error notification email:', emailError.message);
    }
  }

  async verifyConnection() {
    return await emailConfig.verifyConnection();
  }
}

module.exports = new EmailService();
