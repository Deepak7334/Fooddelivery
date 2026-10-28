/**
 * Clean, branded delivery OTP email template matching Image 1 with JDkart brand header.
 */
function getDeliveryOtpEmailHtml({ customerName, agentName, otp }) {
  const cleanName = (customerName || 'Customer').replace(/^[0-9.eE+]+\s+/, '').trim() || 'Customer';
  const cleanAgent = agentName ? `<strong>${agentName}</strong>` : 'our delivery agent';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 540px; margin: auto; padding: 32px 28px; border: 1px solid #e5e7eb; border-radius: 12px; background: #ffffff; box-shadow: 0 4px 16px rgba(0,0,0,0.04);">
      <div style="text-align: center; margin-bottom: 22px; padding-bottom: 16px; border-bottom: 1px solid #f3f4f6;">
        <h1 style="color: #F97316; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.5px;">JD<span style="color: #111827;">kart</span></h1>
        <h2 style="color: #F97316; margin: 6px 0 0; font-size: 18px; font-weight: 700;">Delivery Arrived!</h2>
      </div>

      <p style="font-size: 15px; color: #111827; margin: 0 0 14px 0;">Hi ${cleanName},</p>
      <p style="font-size: 14px; color: #374151; margin: 0 0 10px 0; line-height: 1.6;">Your delivery agent ${cleanAgent} has reached your location with your order.</p>
      <p style="font-size: 14px; color: #374151; margin: 0 0 24px 0; line-height: 1.6;">Please provide the following OTP to the agent to securely receive your order:</p>

      <div style="text-align: center; margin: 24px 0 28px 0;">
        <div style="display: inline-block; background: #f3f4f6; border-radius: 10px; padding: 14px 36px;">
          <span style="font-size: 34px; font-weight: 800; letter-spacing: 6px; color: #111827; font-family: Arial, sans-serif;">${otp}</span>
        </div>
      </div>

      <p style="color: #6b7280; font-size: 14px; margin: 0 0 28px 0; line-height: 1.5;">Do not share this OTP with anyone else. The agent needs it to mark your order as delivered.</p>

      <div style="border-top: 1px solid #f3f4f6; padding-top: 18px; margin-top: 20px;">
        <p style="font-size: 14px; color: #374151; margin: 0; line-height: 1.6;">Thank you for choosing us!<br><strong style="color: #111827;">The JDkart Team</strong></p>
      </div>
    </div>
  `;
}

module.exports = { getDeliveryOtpEmailHtml };
