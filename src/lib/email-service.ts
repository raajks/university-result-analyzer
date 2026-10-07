import nodemailer from 'nodemailer';

export interface SendOtpResult {
  success: boolean;
  messageId?: string;
  error?: string;
  isDevFallback?: boolean;
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

  // If no SMTP configured yet, fallback to server console log
  if (!transporter) {
    console.log('\n======================================================');
    console.log(`🔐 [EMAIL OTP LOGIN] Recipient: ${toEmail}`);
    console.log(`🔢 [VERIFICATION CODE]: >>> ${otp} <<<`);
    console.log(`⏳ Code is valid for 10 minutes`);
    console.log('💡 To enable real Gmail delivery, set SMTP_USER and SMTP_PASS in .env');
    console.log('======================================================\n');

    return {
      success: true,
      isDevFallback: true,
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
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { background: #4338ca; padding: 28px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
        .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
        .body { padding: 32px 28px; text-align: center; }
        .otp-box { display: inline-block; background: #f1f5f9; border: 2px dashed #6366f1; border-radius: 12px; padding: 18px 32px; font-size: 34px; font-weight: 800; letter-spacing: 10px; color: #312e81; margin: 24px 0; font-family: monospace; }
        .info-text { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px; }
        .footer { padding: 20px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; background: #e0e7ff; color: #4338ca; font-size: 12px; font-weight: 600; margin-bottom: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>University Result Analyzer</h1>
          <p>Academic Operations & Result Management Portal</p>
        </div>
        <div class="body">
          <div class="badge">Security Authentication</div>
          <h2 style="font-size: 18px; margin: 0 0 10px; color: #0f172a;">One-Time Login Code</h2>
          <p class="info-text">
            Hello, a login request was made for <strong>${toEmail}</strong>. Use the verification code below to securely sign into the Result Analyzer dashboard.
          </p>
          <div class="otp-box">${otp}</div>
          <p class="info-text" style="font-size: 13px; color: #64748b;">
            This OTP is valid for <strong>10 minutes</strong>. Do not share this code with anyone.
          </p>
        </div>
        <div class="footer">
          If you did not request this OTP, you can safely ignore this email.<br/>
          &copy; ${new Date().getFullYear()} University Result Analyzer. Protected Academic System.
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
      isDevFallback: false,
    };
  } catch (error: any) {
    console.error('[EMAIL ERROR] Failed to send email via SMTP:', error);
    // Even if SMTP failed (e.g. incorrect password), log to console so admin is not locked out
    console.log('\n======================================================');
    console.log(`⚠️ [FALLBACK EMAIL OTP] Recipient: ${toEmail}`);
    console.log(`🔢 [VERIFICATION CODE]: >>> ${otp} <<<`);
    console.log('======================================================\n');

    return {
      success: true, // Allow fallback code use
      error: error?.message || 'SMTP delivery failed',
      isDevFallback: true,
    };
  }
}
