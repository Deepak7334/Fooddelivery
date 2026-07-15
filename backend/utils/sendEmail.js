const nodemailer = require('nodemailer');

/**
 * sendEmail — Brevo SMTP sender
 *
 * Uses Brevo (smtp-relay.brevo.com) for production.
 * Falls back to mock/log mode if credentials are not set.
 */
// Check if a value is a real credential (not a placeholder)
const isSet = (val) => val && !val.startsWith('your_');

const sendEmail = async ({ to, subject, html }) => {

  // ── Production: Brevo SMTP ────────────────────────────────────────────────
  if (isSet(process.env.BREVO_SMTP_USER) && isSet(process.env.BREVO_SMTP_KEY)) {
    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 465,
        secure: true,
        auth: {
          user: process.env.BREVO_SMTP_USER,   // your Brevo login email
          pass: process.env.BREVO_SMTP_KEY,    // your Brevo SMTP key
        },
      });

      const info = await transporter.sendMail({
        from: `"JDkart" <${process.env.BREVO_FROM_EMAIL || process.env.BREVO_SMTP_USER}>`,
        to,
        subject,
        html,
      });

      console.log('✅ Email sent via Brevo. MessageID:', info.messageId);
      return { success: true, messageId: info.messageId };

    } catch (err) {
      console.error('❌ Brevo SMTP error:', err.message);
      return { success: false, error: err.message };
    }
  }

  // ── Local Dev Fallback: Gmail SMTP ────────────────────────────────────────
  if (process.env.EMAIL_USER && process.env.EMAIL_USER !== 'your_email@gmail.com') {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const info = await transporter.sendMail({
        from: `"JDkart" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
      });

      console.log('✅ Email sent via Gmail (local). MessageID:', info.messageId);
      return { success: true, messageId: info.messageId };

    } catch (err) {
      console.error('❌ Gmail SMTP error:', err.message);
      return { success: false, error: err.message };
    }
  }

  // ── Mock Mode: No credentials set ────────────────────────────────────────
  console.log('📧 [EMAIL MOCK] To:', to, '| Subject:', subject);
  const otpMatch = html.match(/\d{6}/);
  if (otpMatch) console.log('🔐 OTP (mock):', otpMatch[0]);
  return { success: true, mock: true };
};

module.exports = sendEmail;
