import nodemailer from 'nodemailer';

export interface SendOtpResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Creates nodemailer transport based on environment variables.
 */
function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = process.env.SMTP_SECURE !== 'false';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Sends a 6-digit OTP email to the specified recipient.
 */
export async function sendOtpEmail(toEmail: string, otp: string): Promise<SendOtpResult> {
  const transporter = createTransporter();

  if (!transporter) {
    return {
      success: false,
      error: 'SMTP mail credentials are not configured in .env',
    };
  }

  const senderEmail = process.env.SMTP_FROM || `University Result Analyzer <${process.env.SMTP_USER}>`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Login Verification Code</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #090d16; margin: 0; padding: 24px; color: #f8fafc; }
        .container { max-width: 520px; margin: 0 auto; background: #0f172a; border-radius: 16px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
        .header { background: #4338ca; padding: 28px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
        .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
        .body { padding: 32px 28px; text-align: center; }
        .otp-box { display: inline-block; background: #1e1b4b; border: 2px dashed #6366f1; border-radius: 12px; padding: 18px 32px; font-size: 34px; font-weight: 800; letter-spacing: 10px; color: #c7d2fe; margin: 24px 0; font-family: monospace; }
        .info-text { font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 0 0 16px; }
        .footer { padding: 20px 24px; background: #090d16; border-top: 1px solid #1e293b; font-size: 12px; color: #64748b; text-align: center; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; background: #312e81; color: #a5b4fc; font-size: 12px; font-weight: 600; margin-bottom: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>University Result Analyzer</h1>
          <p>Academic Operations & Result Management Portal</p>
        </div>
        <div class="body">
          <div class="badge">Security Verification</div>
          <h2 style="font-size: 18px; margin: 0 0 10px; color: #ffffff;">Your One-Time Password (OTP)</h2>
          <p class="info-text">
            A login verification request was made for <strong>${toEmail}</strong>. Please enter the verification code below to securely sign into the ERP portal.
          </p>
          <div class="otp-box">${otp}</div>
          <p class="info-text" style="font-size: 13px; color: #94a3b8;">
            This OTP is valid for <strong>10 minutes</strong>. Do not share this OTP with anyone.
          </p>
        </div>
        <div class="footer">
          If you did not request this OTP, you can ignore this email.<br/>
          &copy; ${new Date().getFullYear()} University Result Analyzer. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: senderEmail,
      to: toEmail,
      subject: `🔐 ${otp} - Your Result Analyzer Login OTP`,
      text: `Your University Result Analyzer verification code is: ${otp}. This code is valid for 10 minutes.`,
      html: htmlContent,
    });

    console.log(`[EMAIL SENT] MessageId: ${info.messageId} to ${toEmail}`);
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error('[EMAIL ERROR] Failed to send email via SMTP:', error);
    return {
      success: false,
      error: error?.message || 'SMTP delivery failed',
    };
  }
}
