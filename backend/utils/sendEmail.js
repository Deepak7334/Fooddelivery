const { Resend } = require('resend');
const nodemailer = require('nodemailer');

/**
 * sendEmail — unified email sender
 *
 * Priority order:
 *  1. Resend API  (production — works from any cloud host, no IP blocking)
 *  2. Nodemailer  (local dev fallback — only if RESEND_API_KEY is absent)
 *  3. Mock/log    (if neither is configured)
 */
const sendEmail = async ({ to, subject, html }) => {
  // ── 1. Resend (preferred for production) ─────────────────────────────────
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      // Use verified domain if set, otherwise fallback to onboarding address
      const fromAddress = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
      const { data, error } = await resend.emails.send({
        from: `JDkart <${fromAddress}>`,
        to,
        subject,
        html,
      });
      if (error) {
        console.error('Resend API error:', error);
        return { success: false, error: error.message || JSON.stringify(error) };
      }
      console.log('✅ Email sent via Resend. ID:', data?.id);
      return { success: true, messageId: data?.id };
    } catch (err) {
      console.error('Resend exception:', err.message);
      return { success: false, error: err.message };
    }
  }

  // ── 2. Nodemailer / Gmail SMTP (local dev fallback) ───────────────────────
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
      console.log('✅ Email sent via Nodemailer. ID:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error('Nodemailer error:', err.message);
      return { success: false, error: err.message };
    }
  }

  // ── 3. Mock / console log (neither configured) ───────────────────────────
  console.log('📧 [EMAIL MOCK] To:', to, '| Subject:', subject);
  const otpMatch = html.match(/\d{6}/);
  if (otpMatch) console.log('🔐 OTP (mock):', otpMatch[0]);
  return { success: true, mock: true };
};

module.exports = sendEmail;
