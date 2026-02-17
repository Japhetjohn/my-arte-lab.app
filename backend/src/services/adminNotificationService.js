const emailConfig = require('../config/email');

const ADMIN_EMAILS = [
  'japhetjohnk@gmail.com',
  'ebukaesiobu@gmail.com'
];

class AdminNotificationService {
  async getPlatformAnalytics() {
    try {
      const User = require('../models/User');
      const Transaction = require('../models/Transaction');
      const Booking = require('../models/Booking');

      const totalUsers = await User.countDocuments();
      const totalCreators = await User.countDocuments({ role: 'creator' });
      const totalClients = await User.countDocuments({ role: 'client' });

      const totalBookings = await Booking.countDocuments();
      const completedBookings = await Booking.countDocuments({ status: 'completed' });
      const activeBookings = await Booking.countDocuments({ status: { $in: ['pending', 'in_progress', 'confirmed'] } });

      const transactionStats = await Transaction.aggregate([
        {
          $group: {
            _id: null,
            totalTransactions: { $sum: 1 },
            totalVolume: { $sum: '$amount' },
            completedTransactions: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            completedVolume: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0] }
            }
          }
        }
      ]);

      const platformEarnings = await Booking.aggregate([
        {
          $match: { status: 'completed' }
        },
        {
          $group: {
            _id: null,
            totalEarnings: { $sum: '$platformFee' }
          }
        }
      ]);

      const stats = transactionStats[0] || { totalTransactions: 0, totalVolume: 0, completedTransactions: 0, completedVolume: 0 };
      const earnings = platformEarnings[0] || { totalEarnings: 0 };

      return {
        users: {
          total: totalUsers,
          creators: totalCreators,
          clients: totalClients
        },
        bookings: {
          total: totalBookings,
          completed: completedBookings,
          active: activeBookings
        },
        transactions: {
          total: stats.totalTransactions,
          completed: stats.completedTransactions,
          totalVolume: stats.totalVolume,
          completedVolume: stats.completedVolume
        },
        earnings: {
          platform: earnings.totalEarnings
        }
      };
    } catch (error) {
      console.error('Failed to get analytics:', error.message);
      return null;
    }
  }

  async notifyNewUserRegistration(user) {
    try {
      const analytics = await this.getPlatformAnalytics();

      const subject = `New User Registration - ${user.name}`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
          <h2 style="color: #667eea;">New User Registered!</h2>

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
                <td style="padding: 8px 0;">${user.role === 'creator' ? 'Creator' : 'Client'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Wallet:</td>
                <td style="padding: 8px 0; font-family: monospace; font-size: 11px;">${user.wallet?.address || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Network:</td>
                <td style="padding: 8px 0;">${user.wallet?.network || 'N/A'} (Real Solana Wallet)</td>
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
                <td style="padding: 8px 0;">Google OAuth</td>
              </tr>
              ` : ''}
            </table>
          </div>

          ${analytics ? `
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; border-radius: 12px; margin: 20px 0; color: white;">
            <h3 style="margin-top: 0; color: white;">Platform Analytics Overview</h3>

            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 20px;">
              <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px;">
                <div style="font-size: 24px; font-weight: bold;">${analytics.users.total}</div>
                <div style="font-size: 12px; opacity: 0.9;">Total Users</div>
                <div style="font-size: 11px; margin-top: 5px;">
                  ${analytics.users.creators} Creators | ${analytics.users.clients} Clients
                </div>
              </div>

              <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px;">
                <div style="font-size: 24px; font-weight: bold;">${analytics.bookings.total}</div>
                <div style="font-size: 12px; opacity: 0.9;">Total Bookings</div>
                <div style="font-size: 11px; margin-top: 5px;">
                  ${analytics.bookings.completed} Completed | ${analytics.bookings.active} Active
                </div>
              </div>

              <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px;">
                <div style="font-size: 24px; font-weight: bold;">${analytics.transactions.total}</div>
                <div style="font-size: 12px; opacity: 0.9;">Total Transactions</div>
                <div style="font-size: 11px; margin-top: 5px;">
                  $${analytics.transactions.totalVolume.toFixed(2)} Volume
                </div>
              </div>

              <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px;">
                <div style="font-size: 24px; font-weight: bold;">$${analytics.earnings.platform.toFixed(2)}</div>
                <div style="font-size: 12px; opacity: 0.9;">Platform Earnings</div>
                <div style="font-size: 11px; margin-top: 5px;">
                  ${analytics.transactions.completed} Completed Txns
                </div>
              </div>
            </div>

            <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.3); font-size: 11px; opacity: 0.8;">
              <strong>Transaction Volume:</strong> $${analytics.transactions.completedVolume.toFixed(2)} completed |
              <strong>Commission Rate:</strong> 10%
            </div>
          </div>
          ` : ''}

          <p style="color: #666; font-size: 14px;">
            This is an automated notification from MyArteLab.
          </p>
        </div>
      `;

      for (const adminEmail of ADMIN_EMAILS) {
        await emailConfig.sendEmail({
          to: adminEmail,
          subject,
          html
        });
      }
    } catch (error) {
      console.error('Failed to send admin notification:', error.message);
    }
  }

  async notifyNewBooking(booking, client, creator) {
    try {
      const analytics = await this.getPlatformAnalytics();

      const subject = `New Booking - ${client.name} to ${creator.name}`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
          <h2 style="color: #667eea;">New Booking Created!</h2>

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
                <td style="padding: 8px 0; font-weight: bold;">Platform Fee (10%):</td>
                <td style="padding: 8px 0; color: #10b981;"><strong>$${booking.platformFee.toFixed(2)}</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold;">Creator Earnings:</td>
                <td style="padding: 8px 0;"><strong>$${booking.creatorAmount.toFixed(2)}</strong></td>
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
            </table>
          </div>

          ${booking.escrowWallet ? `
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Escrow Wallet Created (Real Solana):</strong></p>
            <p style="margin: 0; font-family: monospace; font-size: 11px; word-break: break-all;">
              ${booking.escrowWallet.address}
            </p>
            <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">
              Awaiting payment: ${booking.currency} ${booking.amount.toFixed(2)}
            </p>
          </div>
          ` : ''}

          ${analytics ? `
          <div style="background: #e0f2fe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0284c7;">
            <h4 style="margin-top: 0; color: #0c4a6e;">Quick Stats:</h4>
            <div style="font-size: 13px; color: #374151;">
              <strong>${analytics.bookings.total}</strong> total bookings
              (<strong>${analytics.bookings.completed}</strong> completed,
              <strong>${analytics.bookings.active}</strong> active) •
              <strong>$${analytics.earnings.platform.toFixed(2)}</strong> platform earnings
            </div>
          </div>
          ` : ''}

          <p style="color: #666; font-size: 14px;">
            This is an automated notification from MyArteLab.
          </p>
        </div>
      `;

      for (const adminEmail of ADMIN_EMAILS) {
        await emailConfig.sendEmail({
          to: adminEmail,
          subject,
          html
        });
      }
    } catch (error) {
      console.error('Failed to send admin notification:', error.message);
    }
  }

  async notifyPaymentReceived(booking, transaction) {
    try {
      const subject = `Payment Received - ${booking.currency} ${booking.amount}`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Payment Received!</h2>

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

      for (const adminEmail of ADMIN_EMAILS) {
        await emailConfig.sendEmail({
          to: adminEmail,
          subject,
          html
        });
      }
    } catch (error) {
      console.error('Failed to send admin notification:', error.message);
    }
  }

  async notifyWithdrawal(user, amount, currency) {
    try {
      const subject = `Withdrawal Request - ${currency} ${amount}`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f59e0b;">Withdrawal Request</h2>

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

      for (const adminEmail of ADMIN_EMAILS) {
        await emailConfig.sendEmail({
          to: adminEmail,
          subject,
          html
        });
      }
    } catch (error) {
      console.error('Failed to send admin notification:', error.message);
    }
  }

  async sendDailySummary(stats) {
    try {
      const subject = `MyArteLab Daily Summary - ${new Date().toLocaleDateString()}`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #667eea;">Daily Summary Report</h2>
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

      for (const adminEmail of ADMIN_EMAILS) {
        await emailConfig.sendEmail({
          to: adminEmail,
          subject,
          html
        });
      }
    } catch (error) {
      console.error('Failed to send daily summary:', error.message);
    }
  }
}

module.exports = new AdminNotificationService();
