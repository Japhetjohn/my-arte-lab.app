const emailConfig = require('../config/email');

const ADMIN_EMAILS = [
  'japhetjohnk@gmail.com',
  'ebukaesiobu@gmail.com'
];

// Brand Colors
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

// Base admin email template
const adminTemplate = (title, content) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MyArteLab Admin - ${title}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: ${COLORS.backgroundLight};
        }
        table { border-collapse: collapse; }
        
        .wrapper {
            width: 100%;
            background-color: ${COLORS.backgroundLight};
            padding: 40px 20px;
        }
        
        .container {
            max-width: 700px;
            margin: 0 auto;
            background: ${COLORS.white};
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .header {
            background: ${COLORS.gradient};
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            color: ${COLORS.white};
            margin: 0;
            font-size: 24px;
            font-weight: 700;
        }
        
        .header p {
            color: rgba(255, 255, 255, 0.9);
            margin: 8px 0 0 0;
            font-size: 13px;
        }
        
        .content {
            padding: 32px;
        }
        
        .section {
            background: ${COLORS.backgroundLight};
            border-radius: 12px;
            padding: 24px;
            margin: 20px 0;
        }
        
        .section-title {
            font-size: 16px;
            font-weight: 600;
            color: ${COLORS.textDark};
            margin: 0 0 16px 0;
            padding-bottom: 12px;
            border-bottom: 2px solid ${COLORS.border};
        }
        
        .data-row {
            display: flex;
            justify-content: space-between;
            padding: 12px 0;
            border-bottom: 1px solid ${COLORS.border};
        }
        
        .data-row:last-child {
            border-bottom: none;
        }
        
        .data-label {
            font-weight: 600;
            color: ${COLORS.textDark};
            font-size: 14px;
        }
        
        .data-value {
            color: ${COLORS.textLight};
            font-size: 14px;
            text-align: right;
        }
        
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        
        .badge-success {
            background: rgba(16, 185, 129, 0.1);
            color: ${COLORS.success};
        }
        
        .badge-warning {
            background: rgba(245, 158, 11, 0.1);
            color: ${COLORS.warning};
        }
        
        .badge-info {
            background: rgba(59, 130, 246, 0.1);
            color: ${COLORS.info};
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            margin-top: 16px;
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
        
        .highlight-box {
            background: linear-gradient(135deg, rgba(151, 71, 255, 0.1) 0%, rgba(107, 70, 255, 0.1) 100%);
            border-left: 4px solid ${COLORS.primary};
            border-radius: 8px;
            padding: 16px 20px;
            margin: 16px 0;
        }
        
        .footer {
            background: ${COLORS.backgroundDark};
            color: ${COLORS.white};
            padding: 24px;
            text-align: center;
            font-size: 12px;
        }
        
        .amount {
            font-size: 20px;
            font-weight: 700;
            color: ${COLORS.primary};
        }
        
        .wallet-address {
            font-family: monospace;
            font-size: 11px;
            background: ${COLORS.backgroundLight};
            padding: 8px 12px;
            border-radius: 6px;
            word-break: break-all;
        }
    </style>
</head>
<body>
    <table class="wrapper" cellpadding="0" cellspacing="0" border="0">
        <tr>
            <td align="center">
                <table class="container" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td class="header">
                            <h1>🔔 ${title}</h1>
                            <p>MyArteLab Admin Notification</p>
                        </td>
                    </tr>
                    <tr>
                        <td class="content">
                            ${content}
                        </td>
                    </tr>
                    <tr>
                        <td class="footer">
                            <p>© ${new Date().getFullYear()} MyArteLab Admin System</p>
                            <p style="opacity: 0.7; margin-top: 8px;">This is an automated notification</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`;

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

      const content = `
        <div class="section">
            <div class="section-title">👤 User Details</div>
            <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Name</td>
                    <td class="data-value" style="padding: 10px 0; text-align: right;">${user.name}</td>
                </tr>
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Email</td>
                    <td class="data-value" style="padding: 10px 0; text-align: right;">${user.email}</td>
                </tr>
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Role</td>
                    <td class="data-value" style="padding: 10px 0; text-align: right;">
                        <span class="badge ${user.role === 'creator' ? 'badge-success' : 'badge-info'}">
                            ${user.role === 'creator' ? 'Creator' : 'Client'}
                        </span>
                    </td>
                </tr>
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Wallet Address</td>
                    <td class="data-value" style="padding: 10px 0; text-align: right;">
                        <div class="wallet-address">${user.wallet?.address || 'N/A'}</div>
                    </td>
                </tr>
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Network</td>
                    <td class="data-value" style="padding: 10px 0; text-align: right;">${user.wallet?.network || 'Solana'}</td>
                </tr>
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Location</td>
                    <td class="data-value" style="padding: 10px 0; text-align: right;">${user.location?.country || 'Not specified'}</td>
                </tr>
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Registered At</td>
                    <td class="data-value" style="padding: 10px 0; text-align: right;">${new Date(user.createdAt).toLocaleString()}</td>
                </tr>
                ${user.googleId ? `
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Sign-up Method</td>
                    <td class="data-value" style="padding: 10px 0; text-align: right;">
                        <span class="badge badge-info">Google OAuth</span>
                    </td>
                </tr>
                ` : ''}
            </table>
        </div>

        ${analytics ? `
        <div class="highlight-box">
            <div style="font-weight: 600; color: ${COLORS.primaryDark}; margin-bottom: 16px;">📊 Platform Analytics</div>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${analytics.users.total}</div>
                    <div class="stat-label">Total Users</div>
                    <div class="stat-sublabel">${analytics.users.creators} Creators · ${analytics.users.clients} Clients</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${analytics.bookings.total}</div>
                    <div class="stat-label">Total Bookings</div>
                    <div class="stat-sublabel">${analytics.bookings.completed} Completed · ${analytics.bookings.active} Active</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${analytics.transactions.total}</div>
                    <div class="stat-label">Transactions</div>
                    <div class="stat-sublabel">$${analytics.transactions.totalVolume.toFixed(2)} Volume</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">$${analytics.earnings.platform.toFixed(0)}</div>
                    <div class="stat-label">Platform Earnings</div>
                    <div class="stat-sublabel">${analytics.transactions.completed} Completed</div>
                </div>
            </div>
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid ${COLORS.border}; font-size: 12px; color: ${COLORS.textMuted};">
                <strong>Commission Rate:</strong> 10% · 
                <strong>Completed Volume:</strong> $${analytics.transactions.completedVolume.toFixed(2)}
            </div>
        </div>
        ` : ''}
      `;

      const html = adminTemplate('New User Registration', content);

      for (const adminEmail of ADMIN_EMAILS) {
        await emailConfig.sendEmail({
          to: adminEmail,
          subject: `👤 New User: ${user.name} (${user.role})`,
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

      const content = `
        <div class="section">
            <div class="section-title">📋 Booking Details</div>
            <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Booking ID</td>
                    <td class="data-value" style="padding: 10px 0; text-align: right; font-family: monospace;">${booking.bookingId}</td>
                </tr>
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Client</td>
                    <td class="data-value" style="padding: 10px 0; text-align: right;">${client.name}<br><span style="font-size: 12px; color: ${COLORS.textMuted};">${client.email}</span></td>
                </tr>
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Creator</td>
                    <td class="data-value" style="padding: 10px 0; text-align: right;">${creator.name}<br><span style="font-size: 12px; color: ${COLORS.textMuted};">${creator.email}</span></td>
                </tr>
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Service</td>
                    <td class="data-value" style="padding: 10px 0; text-align: right;">${booking.serviceDetails?.title || 'Custom Request'}</td>
                </tr>
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Amount</td>
                    <td class="data-value amount" style="padding: 10px 0; text-align: right;">${booking.currency} ${booking.amount.toFixed(2)}</td>
                </tr>
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Platform Fee (10%)</td>
                    <td class="data-value" style="padding: 10px 0; text-align: right; color: ${COLORS.success}; font-weight: 600;">$${booking.platformFee.toFixed(2)}</td>
                </tr>
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Creator Earnings</td>
                    <td class="data-value" style="padding: 10px 0; text-align: right; font-weight: 600;">$${booking.creatorAmount.toFixed(2)}</td>
                </tr>
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Status</td>
                    <td class="data-value" style="padding: 10px 0; text-align: right;">
                        <span class="badge badge-warning">${booking.status}</span>
                    </td>
                </tr>
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Payment Status</td>
                    <td class="data-value" style="padding: 10px 0; text-align: right;">
                        <span class="badge ${booking.paymentStatus === 'paid' ? 'badge-success' : 'badge-info'}">${booking.paymentStatus}</span>
                    </td>
                </tr>
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Date</td>
                    <td class="data-value" style="padding: 10px 0; text-align: right;">${new Date(booking.date).toLocaleDateString()}</td>
                </tr>
            </table>
        </div>

        ${booking.escrowWallet ? `
        <div class="highlight-box">
            <div style="font-weight: 600; color: ${COLORS.primaryDark}; margin-bottom: 8px;">🔒 Escrow Wallet Created</div>
            <div class="wallet-address">${booking.escrowWallet.address}</div>
            <p style="margin: 12px 0 0 0; font-size: 13px; color: ${COLORS.textMuted};">
                Network: ${booking.escrowWallet.network || 'Solana'} · Awaiting payment: ${booking.currency} ${booking.amount.toFixed(2)}
            </p>
        </div>
        ` : ''}

        ${analytics ? `
        <div class="highlight-box" style="border-left-color: ${COLORS.info}; background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(37, 99, 235, 0.05) 100%);">
            <div style="font-weight: 600; color: ${COLORS.info}; margin-bottom: 8px;">📊 Quick Stats</div>
            <p style="margin: 0; font-size: 14px; color: ${COLORS.textLight};">
                <strong>${analytics.bookings.total}</strong> total bookings 
                (<strong>${analytics.bookings.completed}</strong> completed, 
                <strong>${analytics.bookings.active}</strong> active) · 
                <strong>$${analytics.earnings.platform.toFixed(2)}</strong> platform earnings
            </p>
        </div>
        ` : ''}
      `;

      const html = adminTemplate('New Booking Created', content);

      for (const adminEmail of ADMIN_EMAILS) {
        await emailConfig.sendEmail({
          to: adminEmail,
          subject: `📋 New Booking: ${client.name} → ${creator.name} ($${booking.amount.toFixed(2)})`,
          html
        });
      }
    } catch (error) {
      console.error('Failed to send admin notification:', error.message);
    }
  }

  async notifyPaymentReceived(booking, transaction) {
    try {
      const content = `
        <div class="section">
            <div class="section-title">💰 Payment Details</div>
            <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Amount</td>
                    <td class="data-value amount" style="padding: 10px 0; text-align: right;">${booking.currency} ${booking.amount.toFixed(2)}</td>
                </tr>
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Booking ID</td>
                    <td class="data-value" style="padding: 10px 0; text-align: right; font-family: monospace;">${booking.bookingId}</td>
                </tr>
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Transaction Hash</td>
                    <td class="data-value" style="padding: 10px 0; text-align: right;">
                        <div class="wallet-address">${transaction.txHash || 'N/A'}</div>
                    </td>
                </tr>
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Network</td>
                    <td class="data-value" style="padding: 10px 0; text-align: right;">${booking.escrowWallet?.network || 'Solana'}</td>
                </tr>
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Received At</td>
                    <td class="data-value" style="padding: 10px 0; text-align: right;">${new Date().toLocaleString()}</td>
                </tr>
            </table>
        </div>

        <div class="highlight-box" style="border-left-color: ${COLORS.success}; background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%);">
            <div style="font-weight: 600; color: ${COLORS.success}; margin-bottom: 8px;">✅ Funds Secured in Escrow</div>
            <p style="margin: 0; font-size: 14px; color: ${COLORS.textLight};">
                Payment is now safely held in escrow and will be released to the creator upon successful completion of the booking.
            </p>
        </div>
      `;

      const html = adminTemplate('Payment Received', content);

      for (const adminEmail of ADMIN_EMAILS) {
        await emailConfig.sendEmail({
          to: adminEmail,
          subject: `💰 Payment Received: ${booking.currency} ${booking.amount.toFixed(2)}`,
          html
        });
      }
    } catch (error) {
      console.error('Failed to send admin notification:', error.message);
    }
  }

  async notifyWithdrawal(user, amount, currency) {
    try {
      const content = `
        <div class="section">
            <div class="section-title">💸 Withdrawal Request</div>
            <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td class="data-label" style="padding: 10px 0;">User</td>
                    <td class="data-value" style="padding: 10px 0; text-align: right;">${user.name}<br><span style="font-size: 12px; color: ${COLORS.textMuted};">${user.email}</span></td>
                </tr>
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Amount</td>
                    <td class="data-value amount" style="padding: 10px 0; text-align: right; color: ${COLORS.warning};">${currency} ${amount.toFixed(2)}</td>
                </tr>
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Requested At</td>
                    <td class="data-value" style="padding: 10px 0; text-align: right;">${new Date().toLocaleString()}</td>
                </tr>
            </table>
        </div>

        <div class="highlight-box" style="border-left-color: ${COLORS.warning}; background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%);">
            <div style="font-weight: 600; color: ${COLORS.warning}; margin-bottom: 8px;">⚠️ Action Required</div>
            <p style="margin: 0; font-size: 14px; color: ${COLORS.textLight};">
                Please review and process this withdrawal request through the admin dashboard.
            </p>
        </div>
      `;

      const html = adminTemplate('Withdrawal Request', content);

      for (const adminEmail of ADMIN_EMAILS) {
        await emailConfig.sendEmail({
          to: adminEmail,
          subject: `💸 Withdrawal: ${user.name} - ${currency} ${amount.toFixed(2)}`,
          html
        });
      }
    } catch (error) {
      console.error('Failed to send admin notification:', error.message);
    }
  }

  async sendDailySummary(stats) {
    try {
      const content = `
        <div class="highlight-box" style="border-left-color: ${COLORS.primary}; text-align: center;">
            <div style="font-size: 48px; font-weight: 700; color: ${COLORS.primary};">${new Date().toLocaleDateString()}</div>
            <div style="font-size: 14px; color: ${COLORS.textMuted}; margin-top: 8px;">Daily Summary Report</div>
        </div>

        <div class="section">
            <div class="section-title">📈 Today's Activity</div>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${stats.newUsers || 0}</div>
                    <div class="stat-label">New Users</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.newBookings || 0}</div>
                    <div class="stat-label">New Bookings</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">$${stats.revenue || 0}</div>
                    <div class="stat-label">Revenue</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.totalUsers || 0}</div>
                    <div class="stat-label">Total Users</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">📊 Platform Totals</div>
            <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Total Users</td>
                    <td class="data-value" style="padding: 10px 0; text-align: right; font-weight: 600;">${stats.totalUsers || 0}</td>
                </tr>
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Total Creators</td>
                    <td class="data-value" style="padding: 10px 0; text-align: right; font-weight: 600;">${stats.totalCreators || 0}</td>
                </tr>
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Total Bookings</td>
                    <td class="data-value" style="padding: 10px 0; text-align: right; font-weight: 600;">${stats.totalBookings || 0}</td>
                </tr>
            </table>
        </div>
      `;

      const html = adminTemplate('Daily Summary Report', content);

      for (const adminEmail of ADMIN_EMAILS) {
        await emailConfig.sendEmail({
          to: adminEmail,
          subject: `📊 Daily Summary - ${new Date().toLocaleDateString()}`,
          html
        });
      }
    } catch (error) {
      console.error('Failed to send daily summary:', error.message);
    }
  }

  async notifyAccumulatedFees(user, amount, totalAccumulated) {
    try {
      const canWithdraw = totalAccumulated >= 1;
      
      const content = `
        <div class="section">
            <div class="section-title">💰 Platform Fee Accumulated</div>
            <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Client</td>
                    <td class="data-value" style="padding: 10px 0; text-align: right;">${user.name}<br><span style="font-size: 12px; color: ${COLORS.textMuted};">${user.email}</span></td>
                </tr>
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Fee Amount</td>
                    <td class="data-value" style="padding: 10px 0; text-align: right; color: ${COLORS.success}; font-weight: 600;">${amount.toFixed(2)} USDC</td>
                </tr>
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Total Accumulated</td>
                    <td class="data-value amount" style="padding: 10px 0; text-align: right;">${totalAccumulated.toFixed(2)} USDC</td>
                </tr>
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Status</td>
                    <td class="data-value" style="padding: 10px 0; text-align: right;">
                        <span class="badge ${canWithdraw ? 'badge-success' : 'badge-warning'}">
                            ${canWithdraw ? '✅ Ready to Withdraw' : `⏳ Need ${(1 - totalAccumulated).toFixed(2)} more USDC`}
                        </span>
                    </td>
                </tr>
            </table>
        </div>

        ${canWithdraw ? `
        <div class="highlight-box" style="border-left-color: ${COLORS.success}; background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%);">
            <div style="font-weight: 600; color: ${COLORS.success}; margin-bottom: 8px;">✅ Withdrawal Threshold Reached!</div>
            <p style="margin: 0; font-size: 14px; color: ${COLORS.textLight};">
                The accumulated platform fees have reached the HostFi minimum withdrawal threshold (1 USDC).
                You can now withdraw these fees to the platform wallet.
            </p>
            <p style="margin: 12px 0 0 0; font-size: 13px; color: ${COLORS.textMuted};">
                Run the withdrawal script on the server or use the admin API.
            </p>
        </div>
        ` : `
        <div class="highlight-box" style="border-left-color: ${COLORS.warning}; background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%);">
            <div style="font-weight: 600; color: ${COLORS.warning}; margin-bottom: 8px;">⏳ Accumulating Fees</div>
            <p style="margin: 0; font-size: 14px; color: ${COLORS.textLight};">
                Platform fees are being accumulated until they reach the HostFi minimum (1 USDC).
                Current: <strong>${totalAccumulated.toFixed(2)} USDC</strong> / 1 USDC minimum
            </p>
        </div>
        `}
      `;

      const html = adminTemplate('Platform Fee Accumulated', content);

      for (const adminEmail of ADMIN_EMAILS) {
        await emailConfig.sendEmail({
          to: adminEmail,
          subject: `💰 Fee Accumulated: ${amount.toFixed(2)} USDC (Total: ${totalAccumulated.toFixed(2)} USDC)`,
          html
        });
      }

      console.log(`[AdminNotification] Accumulated fee notification sent: ${amount} USDC`);
    } catch (error) {
      console.error('Failed to send accumulated fee notification:', error.message);
    }
  }

  async notifyFeeWithdrawn(user, amount, reference) {
    try {
      const content = `
        <div class="highlight-box" style="border-left-color: ${COLORS.success}; background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%);">
            <div style="font-size: 24px; margin-bottom: 12px;">💸 PLATFORM FEES WITHDRAWN</div>
            <p style="margin: 0; color: ${COLORS.textMuted};">Accumulated platform fees have been withdrawn to the platform wallet.</p>
        </div>

        <div class="section">
            <div class="section-title">Withdrawal Details</div>
            <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Client</td>
                    <td class="data-value" style="padding: 10px 0; text-align: right;">${user.name}<br><span style="font-size: 12px; color: ${COLORS.textMuted};">${user.email}</span></td>
                </tr>
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Amount Withdrawn</td>
                    <td class="data-value amount" style="padding: 10px 0; text-align: right; color: ${COLORS.success};">${amount.toFixed(2)} USDC</td>
                </tr>
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Transaction Reference</td>
                    <td class="data-value" style="padding: 10px 0; text-align: right;">
                        <div class="wallet-address">${reference}</div>
                    </td>
                </tr>
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Destination Wallet</td>
                    <td class="data-value" style="padding: 10px 0; text-align: right;">
                        <div class="wallet-address">Bqc5Cf9UAr1rM27HgDDYERSHJAcgfzVH2MnBn7sSdkTg</div>
                    </td>
                </tr>
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Withdrawn At</td>
                    <td class="data-value" style="padding: 10px 0; text-align: right;">${new Date().toLocaleString()}</td>
                </tr>
            </table>
        </div>

        <div class="highlight-box">
            <div style="font-weight: 600; color: ${COLORS.primaryDark}; margin-bottom: 8px;">📊 Platform Wallet</div>
            <p style="margin: 0; font-size: 14px; color: ${COLORS.textLight};">
                Fees have been transferred to the platform wallet. Track on Solana explorer:
            </p>
            <p style="margin: 8px 0 0 0; font-size: 12px;">
                <a href="https://solscan.io/account/Bqc5Cf9UAr1rM27HgDDYERSHJAcgfzVH2MnBn7sSdkTg" style="color: ${COLORS.primary}; text-decoration: none;">
                    View on Solscan →
                </a>
            </p>
        </div>
      `;

      const html = adminTemplate('Platform Fees Withdrawn', content);

      for (const adminEmail of ADMIN_EMAILS) {
        await emailConfig.sendEmail({
          to: adminEmail,
          subject: `💸 Fees Withdrawn: ${amount.toFixed(2)} USDC to Platform Wallet`,
          html
        });
      }

      console.log(`[AdminNotification] Fee withdrawal notification sent: ${amount} USDC`);
    } catch (error) {
      console.error('Failed to send fee withdrawal notification:', error.message);
    }
  }

  async notifyNewDispute(booking, client, reason, details) {
    try {
      const content = `
        <div class="highlight-box" style="border-left-color: ${COLORS.danger};">
            <div style="font-size: 24px; margin-bottom: 12px;">🚨 NEW DISPUTE FILED</div>
            <p style="margin: 0; color: ${COLORS.textMuted};">A client has disputed a booking and requested a refund.</p>
        </div>

        <div class="section">
            <div class="section-title">Dispute Details</div>
            <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Booking ID</td>
                    <td class="data-value" style="padding: 10px 0; text-align: right; font-weight: 600;">${booking.bookingId}</td>
                </tr>
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Service</td>
                    <td class="data-value" style="padding: 10px 0; text-align: right;">${booking.serviceTitle}</td>
                </tr>
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Amount</td>
                    <td class="data-value" style="padding: 10px 0; text-align: right; color: ${COLORS.danger}; font-weight: 600;">$${booking.amount.toFixed(2)} ${booking.currency}</td>
                </tr>
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Issue Type</td>
                    <td class="data-value" style="padding: 10px 0; text-align: right;">
                        <span class="badge badge-danger">${reason.replace(/_/g, ' ').toUpperCase()}</span>
                    </td>
                </tr>
            </table>
        </div>

        <div class="section">
            <div class="section-title">Client Information</div>
            <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Name</td>
                    <td class="data-value" style="padding: 10px 0; text-align: right;">${client.name || client.firstName + ' ' + client.lastName}</td>
                </tr>
                <tr>
                    <td class="data-label" style="padding: 10px 0;">Email</td>
                    <td class="data-value" style="padding: 10px 0; text-align: right;">${client.email}</td>
                </tr>
            </table>
        </div>

        <div class="section">
            <div class="section-title">Dispute Description</div>
            <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; font-size: 14px; line-height: 1.6;">
                ${details.replace(/\n/g, '<br>')}
            </div>
        </div>

        <div class="section">
            <div class="section-title">Action Required</div>
            <ul style="margin: 0; padding-left: 20px; color: ${COLORS.textDark};">
                <li>Review the deliverables submitted by creator</li>
                <li>Contact both parties if needed</li>
                <li>Make a decision: Approve refund or reject dispute</li>
                <li>If approved, manually refund client via HostFi dashboard</li>
            </ul>
        </div>

        <div style="text-align: center; margin-top: 24px;">
            <a href="${ADMIN_BASE_URL}/bookings/${booking._id}" class="cta-button" style="background: ${COLORS.danger};">Review Dispute in Admin</a>
        </div>
      `;

      const html = adminTemplate('New Dispute Filed - Action Required', content);

      for (const adminEmail of ADMIN_EMAILS) {
        await emailConfig.sendEmail({
          to: adminEmail,
          subject: `🚨 DISPUTE: ${booking.bookingId} - ${reason.replace(/_/g, ' ').toUpperCase()}`,
          html
        });
      }

      console.log(`[AdminNotification] Dispute notification sent for booking ${booking.bookingId}`);
    } catch (error) {
      console.error('Failed to send dispute notification:', error.message);
    }
  }
}

module.exports = new AdminNotificationService();
