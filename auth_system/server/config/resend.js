const { Resend } = require('resend');
const config = require('./config');

// Initialize Resend with API key
const resend = new Resend(config.resendApiKey);

// Send email function
exports.sendEmail = async ({ to, subject, html }) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Auth System <noreply@authsystem.com>',
      to: to,
      subject: subject,
      html: html
    });

    if (error) {
      console.error('Resend API error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
};