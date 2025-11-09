const emailConfig = require('../config/email');

/**
 * Admin Notification Service
 * Sends email notifications to admin for important events
 */

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'japhetjohnk@gmail.com';

class AdminNotificationService {
  /**
   * Send notification when a new user registers
   */
  async notifyNewUserRegistration(user) {
    try {
      const subject = `🎉 New User Registration - ${user.name}`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #667eea;">🎉 New User Registered!</h2>

          <div style="background: #f5f7fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">User Details:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Name:</td>
                <td style="padding: 8px 0;">${user.name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Email:</td>
                <td style="padding: 8px 0;">${user.email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Role:</td>
                <td style="padding: 8px 0;">${user.role === 'creator' ? '🎨 Creator' : '👤 Client'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Wallet:</td>
                <td style="padding: 8px 0; font-family: monospace; font-size: 12px;">${user.wallet?.address || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Network:</td>
                <td style="padding: 8px 0;">${user.wallet?.network || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Registration Time:</td>
                <td style="padding: 8px 0;">${new Date(user.createdAt).toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Location:</td>
                <td style="padding: 8px 0;">${user.location?.country || 'Not specified'}</td>
              </tr>
              ${user.googleId ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Sign-up Method:</td>
                <td style="padding: 8px 0;">✅ Google OAuth</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <div style="background: #e0e7ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Total Users:</strong> Check your database for current count</p>
          </div>

          <p style="color: #666; font-size: 14px;">
            This is an automated notification from MyArteLab.
          </p>
        </div>
      `;

      await emailConfig.sendEmail({
        to: ADMIN_EMAIL,
        subject,
        html
      });

      console.log(`✅ Admin notified of new user: ${user.email}`);
    } catch (error) {
      console.error('❌ Failed to send admin notification:', error.message);
      // Don't throw - notification failure shouldn't break registration
    }
  }

  /**
   * Send notification when a new booking is created
   */
  async notifyNewBooking(booking, client, creator) {
    try {
      const subject = `💼 New Booking - ${client.name} → ${creator.name}`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #667eea;">💼 New Booking Created!</h2>

          <div style="background: #f5f7fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Booking Details:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Booking ID:</td>
                <td style="padding: 8px 0;">${booking.bookingId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Client:</td>
                <td style="padding: 8px 0;">${client.name} (${client.email})</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Creator:</td>
                <td style="padding: 8px 0;">${creator.name} (${creator.email})</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Service:</td>
                <td style="padding: 8px 0;">${booking.serviceDetails?.title || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Amount:</td>
                <td style="padding: 8px 0; font-size: 18px; color: #667eea;"><strong>${booking.currency} ${booking.amount.toFixed(2)}</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Status:</td>
                <td style="padding: 8px 0;">${booking.status}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Payment Status:</td>
                <td style="padding: 8px 0;">${booking.paymentStatus}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Date:</td>
                <td style="padding: 8px 0;">${new Date(booking.date).toLocaleDateString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Created:</td>
                <td style="padding: 8px 0;">${new Date(booking.createdAt).toLocaleString()}</td>
              </tr>
            </table>
          </div>

          ${booking.escrowWallet ? `
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>💰 Escrow Wallet Created:</strong></p>
            <p style="margin: 0; font-family: monospace; font-size: 12px; word-break: break-all;">
              ${booking.escrowWallet.address}
            </p>
            <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">
              Awaiting payment: ${booking.currency} ${booking.amount.toFixed(2)}
            </p>
          </div>
          ` : ''}

          <p style="color: #666; font-size: 14px;">
            This is an automated notification from MyArteLab.
          </p>
        </div>
      `;

      await emailConfig.sendEmail({
        to: ADMIN_EMAIL,
        subject,
        html
      });

      console.log(`✅ Admin notified of new booking: ${booking.bookingId}`);
    } catch (error) {
      console.error('❌ Failed to send admin notification:', error.message);
    }
  }

  /**
   * Send notification when payment is received
   */
  async notifyPaymentReceived(booking, transaction) {
    try {
      const subject = `💰 Payment Received - ${booking.currency} ${booking.amount}`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">💰 Payment Received!</h2>

          <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #059669;">Payment Details:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Amount:</td>
                <td style="padding: 8px 0; font-size: 20px; color: #059669;"><strong>${booking.currency} ${booking.amount.toFixed(2)}</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Booking ID:</td>
                <td style="padding: 8px 0;">${booking.bookingId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Transaction Hash:</td>
                <td style="padding: 8px 0; font-family: monospace; font-size: 11px; word-break: break-all;">${transaction.txHash || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Network:</td>
                <td style="padding: 8px 0;">${booking.escrowWallet?.network || 'Solana'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Time:</td>
                <td style="padding: 8px 0;">${new Date().toLocaleString()}</td>
              </tr>
            </table>
          </div>

          <p style="color: #666; font-size: 14px;">
            Funds are now in escrow. Will be released upon booking completion.
          </p>
        </div>
      `;

      await emailConfig.sendEmail({
        to: ADMIN_EMAIL,
        subject,
        html
      });

      console.log(`✅ Admin notified of payment: ${booking.bookingId}`);
    } catch (error) {
      console.error('❌ Failed to send admin notification:', error.message);
    }
  }

  /**
   * Send notification when funds are withdrawn
   */
  async notifyWithdrawal(user, amount, currency) {
    try {
      const subject = `💸 Withdrawal Request - ${currency} ${amount}`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f59e0b;">💸 Withdrawal Request</h2>

          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Withdrawal Details:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">User:</td>
                <td style="padding: 8px 0;">${user.name} (${user.email})</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Amount:</td>
                <td style="padding: 8px 0; font-size: 20px; color: #f59e0b;"><strong>${currency} ${amount.toFixed(2)}</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Time:</td>
                <td style="padding: 8px 0;">${new Date().toLocaleString()}</td>
              </tr>
            </table>
          </div>

          <p style="color: #666; font-size: 14px;">
            This is an automated notification from MyArteLab.
          </p>
        </div>
      `;

      await emailConfig.sendEmail({
        to: ADMIN_EMAIL,
        subject,
        html
      });

      console.log(`✅ Admin notified of withdrawal: ${user.email}`);
    } catch (error) {
      console.error('❌ Failed to send admin notification:', error.message);
    }
  }

  /**
   * Send daily summary email
   */
  async sendDailySummary(stats) {
    try {
      const subject = `📊 MyArteLab Daily Summary - ${new Date().toLocaleDateString()}`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #667eea;">📊 Daily Summary Report</h2>
          <p style="color: #666;">${new Date().toLocaleDateString()}</p>

          <div style="background: #f5f7fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Platform Statistics:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 12px 0; font-weight: bold;">New Users Today:</td>
                <td style="padding: 12px 0; font-size: 24px; color: #667eea;"><strong>${stats.newUsers || 0}</strong></td>
              </tr>
              <tr>
                <td style="padding: 12px 0; font-weight: bold;">New Bookings Today:</td>
                <td style="padding: 12px 0; font-size: 24px; color: #667eea;"><strong>${stats.newBookings || 0}</strong></td>
              </tr>
              <tr>
                <td style="padding: 12px 0; font-weight: bold;">Revenue Today:</td>
                <td style="padding: 12px 0; font-size: 24px; color: #10b981;"><strong>USDT ${stats.revenue || 0}</strong></td>
              </tr>
              <tr>
                <td style="padding: 12px 0; font-weight: bold;">Total Users:</td>
                <td style="padding: 12px 0;"><strong>${stats.totalUsers || 0}</strong></td>
              </tr>
              <tr>
                <td style="padding: 12px 0; font-weight: bold;">Total Creators:</td>
                <td style="padding: 12px 0;"><strong>${stats.totalCreators || 0}</strong></td>
              </tr>
            </table>
          </div>

          <p style="color: #666; font-size: 14px;">
            This is an automated daily report from MyArteLab.
          </p>
        </div>
      `;

      await emailConfig.sendEmail({
        to: ADMIN_EMAIL,
        subject,
        html
      });

      console.log('✅ Daily summary sent to admin');
    } catch (error) {
      console.error('❌ Failed to send daily summary:', error.message);
    }
  }
}

module.exports = new AdminNotificationService();
