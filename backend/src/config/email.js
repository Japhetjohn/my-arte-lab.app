const nodemailer = require('nodemailer');

/**
 * Email Service Configuration
 * Supports Gmail and SendGrid
 */

let transporter = null;

const createTransporter = () => {
  const emailService = process.env.EMAIL_SERVICE || 'gmail';

  if (emailService === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  } else if (emailService === 'sendgrid') {
    return nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY,
      },
    });
  } else {
    throw new Error(`Unsupported email service: ${emailService}`);
  }
};

const emailConfig = {
  from: process.env.EMAIL_FROM || 'MyArteLab <noreply@myartelab.com>',

  async sendEmail({ to, subject, html, text }) {
    try {
      if (!transporter) {
        transporter = createTransporter();
      }

      const mailOptions = {
        from: this.from,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>?/gm, ''), // Strip HTML for text version
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent to ${to}: ${info.messageId}`);
      return info;
    } catch (error) {
      console.error(`❌ Email sending failed:`, error.message);
      throw error;
    }
  },

  async verifyConnection() {
    try {
      if (!transporter) {
        transporter = createTransporter();
      }
      await transporter.verify();
      console.log('✅ Email service connected and ready');
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error.message);
      return false;
    }
  }
};

module.exports = emailConfig;
