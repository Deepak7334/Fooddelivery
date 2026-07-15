const nodemailer = require('nodemailer');

/**
 * sendEmail — Brevo REST API sender
 *
 * Uses Brevo's HTTP API for production.
 * This completely bypasses Render's firewall and SMTP blocking.
 */
// Check if a value is a real credential (not a placeholder)
const isSet = (val) => val && !val.startsWith('your_');

const sendEmail = async ({ to, subject, html }) => {

  // ── Production: Brevo REST API (HTTPS port 443 - never blocked) ──────────
  if (isSet(process.env.BREVO_API_KEY)) {
    try {
      const fromEmail = process.env.BREVO_FROM_EMAIL || 'supportjdkart@gmail.com';
      
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': process.env.BREVO_API_KEY,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: "JDkart", email: fromEmail },
          to: [{ email: to }],
          subject: subject,
          htmlContent: html
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(JSON.stringify(errorData));
      }

      const data = await response.json();
      console.log('✅ Email sent via Brevo API. MessageID:', data.messageId);
      return { success: true, messageId: data.messageId };

    } catch (err) {
      console.error('❌ Brevo API error:', err.message);
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
