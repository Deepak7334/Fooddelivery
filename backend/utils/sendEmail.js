const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  // In development/test mode, just log to console
  if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your_email@gmail.com') {
    console.log('📧 [EMAIL MOCK] To:', to, '| Subject:', subject);
    const otpMatch = html.match(/\d{6}/);
    if (otpMatch) console.log('🔐 OTP:', otpMatch[0]);
    return { success: true, mock: true };
  }

  try {
    const info = await transporter.sendMail({
      from: `"JDkart" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('Email send error:', err.message);
    return { success: false, error: err.message };
  }
};

module.exports = sendEmail;
