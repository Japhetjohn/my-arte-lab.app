const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');

let transporter = null;
let sendgridInitialized = false;

const initializeSendGrid = () => {
  if (!sendgridInitialized && process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    sendgridInitialized = true;
  }
};

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
  } else if (emailService === 'zoho') {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.zoho.com',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: true, // use SSL
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  } else if (emailService === 'smtp') {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  } else if (emailService === 'sendgrid') {
    initializeSendGrid();
    return null; // We don't need nodemailer for SendGrid
  } else {
    throw new Error(`Unsupported email service: ${emailService}`);
  }
};

const emailConfig = {
  from: process.env.EMAIL_FROM || 'MyArteLab <noreply@myartelab.com>',

  async sendEmail({ to, subject, html, text }) {
    try {
      const emailService = process.env.EMAIL_SERVICE || 'gmail';

      if (emailService === 'sendgrid') {
        initializeSendGrid();

        const msg = {
          to,
          from: this.from,
          subject,
          html,
          text: text || html.replace(/<[^>]*>?/gm, ''),
        };

        const info = await sgMail.send(msg);
        return info;
      } else {
        if (!transporter) {
          transporter = createTransporter();
        }

        const mailOptions = {
          from: this.from,
          to,
          subject,
          html,
          text: text || html.replace(/<[^>]*>?/gm, ''),
        };

        const info = await transporter.sendMail(mailOptions);
        return info;
      }
    } catch (error) {
      console.error('Email sending failed:', error.message);
      throw error;
    }
  },

  async verifyConnection() {
    try {
      const emailService = process.env.EMAIL_SERVICE || 'gmail';

      if (emailService === 'sendgrid') {
        initializeSendGrid();
        if (!process.env.SENDGRID_API_KEY) {
          throw new Error('SENDGRID_API_KEY is not set');
        }
        return true;
      } else {
        if (!transporter) {
          transporter = createTransporter();
        }
        await transporter.verify();
        return true;
      }
    } catch (error) {
      console.error('Email service connection failed:', error.message);
      return false;
    }
  }
};

module.exports = emailConfig;
