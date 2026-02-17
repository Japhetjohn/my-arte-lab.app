const emailConfig = require('../config/email');

class EmailService {
  async sendWelcomeEmail(user) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to MyArteLab!</h2>
        <p>Hi ${user.name},</p>
        <p>Thank you for joining MyArteLab, the premier marketplace for creative services.</p>
        <p>You can now:</p>
        <ul>
          <li>Browse talented creators</li>
          <li>Book services seamlessly</li>
          <li>Make secure payments with stablecoins</li>
          <li>Build your creative portfolio</li>
        </ul>
        <p>Get started by exploring our platform!</p>
        <br>
        <p>Best regards,</p>
        <p><strong>The MyArteLab Team</strong></p>
      </div>
    `;

    return await emailConfig.sendEmail({
      to: user.email,
      subject: 'Welcome to MyArteLab!',
      html
    });
  }

  async sendBookingConfirmation(booking, client, creator) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Booking Confirmation</h2>
        <p>Hi ${client.name},</p>
        <p>Your booking has been confirmed!</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
          <p><strong>Creator:</strong> ${creator.name}</p>
          <p><strong>Service:</strong> ${booking.serviceTitle}</p>
          <p><strong>Amount:</strong> ${booking.amount} ${booking.currency}</p>
          <p><strong>Status:</strong> ${booking.status}</p>
        </div>
        <p>You can track your booking status in your dashboard.</p>
        <br>
        <p>Best regards,</p>
        <p><strong>The MyArteLab Team</strong></p>
      </div>
    `;

    return await emailConfig.sendEmail({
      to: client.email,
      subject: `Booking Confirmed - ${booking.bookingId}`,
      html
    });
  }

  async sendPaymentReceived(booking, creator) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Payment Received!</h2>
        <p>Hi ${creator.name},</p>
        <p>You have received a payment for booking <strong>${booking.bookingId}</strong>.</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Amount:</strong> ${booking.amount} ${booking.currency}</p>
          <p><strong>Service:</strong> ${booking.serviceTitle}</p>
          <p><strong>Transaction Hash:</strong> ${booking.escrowWallet?.txHash || 'Pending'}</p>
        </div>
        <p>The funds are being held in escrow and will be released upon completion.</p>
        <br>
        <p>Best regards,</p>
        <p><strong>The MyArteLab Team</strong></p>
      </div>
    `;

    return await emailConfig.sendEmail({
      to: creator.email,
      subject: `Payment Received - ${booking.bookingId}`,
      html
    });
  }

  async sendWithdrawalNotification(user, withdrawal) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Withdrawal Initiated</h2>
        <p>Hi ${user.name},</p>
        <p>Your withdrawal request has been initiated.</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Amount:</strong> ${withdrawal.amount} ${withdrawal.currency}</p>
          <p><strong>Destination:</strong> ${withdrawal.toAddress}</p>
          <p><strong>Status:</strong> ${withdrawal.status}</p>
        </div>
        <p>You will receive another email once the withdrawal is completed.</p>
        <br>
        <p>Best regards,</p>
        <p><strong>The MyArteLab Team</strong></p>
      </div>
    `;

    return await emailConfig.sendEmail({
      to: user.email,
      subject: 'Withdrawal Initiated',
      html
    });
  }

  async sendWithdrawalCompleted(user, withdrawal) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Withdrawal Completed</h2>
        <p>Hi ${user.name},</p>
        <p>Your withdrawal has been completed successfully!</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Amount:</strong> ${withdrawal.amount} ${withdrawal.currency}</p>
          <p><strong>Transaction Hash:</strong> ${withdrawal.txHash}</p>
        </div>
        <p>The funds should appear in your wallet shortly.</p>
        <br>
        <p>Best regards,</p>
        <p><strong>The MyArteLab Team</strong></p>
      </div>
    `;

    return await emailConfig.sendEmail({
      to: user.email,
      subject: 'Withdrawal Completed',
      html
    });
  }

  async sendPasswordReset(user, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hi ${user.name},</p>
        <p>You requested a password reset for your MyArteLab account.</p>
        <p>Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        </div>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <br>
        <p>Best regards,</p>
        <p><strong>The MyArteLab Team</strong></p>
      </div>
    `;

    return await emailConfig.sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      html
    });
  }

  async sendCustomEmail({ to, subject, html, text }) {
    return await emailConfig.sendEmail({ to, subject, html, text });
  }

  async sendErrorNotification({ error, req, additionalInfo = {} }) {
    try {
      const adminEmail = process.env.ADMIN_EMAIL || 'japhetjohnk@gmail.com';

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">
            🚨 Production Error Alert
          </h2>

          <div style="background: #fee2e2; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #991b1b; margin-top: 0;">Error Details</h3>
            <p><strong>Message:</strong> ${error.message || 'Unknown error'}</p>
            <p><strong>Status Code:</strong> ${error.statusCode || 500}</p>
            <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          </div>

          ${req ? `
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Request Information</h3>
            <p><strong>Method:</strong> ${req.method}</p>
            <p><strong>URL:</strong> ${req.originalUrl || req.url}</p>
            <p><strong>IP:</strong> ${req.ip}</p>
            ${req.user ? `<p><strong>User:</strong> ${req.user.email || req.user._id}</p>` : ''}
          </div>
          ` : ''}

          ${Object.keys(additionalInfo).length > 0 ? `
          <div style="background: #fef3c7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Additional Information</h3>
            ${Object.entries(additionalInfo).map(([key, value]) =>
              `<p><strong>${key}:</strong> ${JSON.stringify(value)}</p>`
            ).join('')}
          </div>
          ` : ''}

          <div style="background: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0; font-family: monospace; font-size: 12px; overflow-x: auto;">
            <h3 style="margin-top: 0; font-family: Arial;">Stack Trace</h3>
            <pre style="margin: 0; white-space: pre-wrap;">${error.stack || 'No stack trace available'}</pre>
          </div>

          <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
            This is an automated error notification from MyArteLab production server.
          </p>
        </div>
      `;

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
