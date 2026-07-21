import nodemailer from 'nodemailer';

const APP_NAME = 'Readers';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

function getTransporter() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return null;
}

async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) {
    console.log(`[Email - Dev Mode] To: ${to} | Subject: ${subject}`);
    console.log(`[Email - Dev Mode] Link preview in HTML body`);
    return true;
  }
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || `"${APP_NAME}" <noreply@readers.africa>`,
      to,
      subject,
      html
    });
    return true;
  } catch (err) {
    console.error('Email send error:', err);
    return false;
  }
}

function emailTemplate(title: string, body: string, ctaUrl?: string, ctaText?: string): string {
  return `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #FFF8E7; border-radius: 16px; overflow: hidden;">
      <div style="background: #6F4E37; padding: 24px; text-align: center;">
        <h1 style="color: #FFF8E7; margin: 0; font-family: Georgia, serif;">${APP_NAME}</h1>
      </div>
      <div style="padding: 32px; color: #2E1E12;">
        <h2 style="color: #6F4E37;">${title}</h2>
        ${body}
        ${ctaUrl ? `<p style="margin-top: 24px;"><a href="${ctaUrl}" style="background: #6F4E37; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">${ctaText || 'Continue'}</a></p>` : ''}
        <p style="margin-top: 32px; font-size: 12px; color: #8B5A2B;">Africa's largest online reading, writing and publishing community.</p>
      </div>
    </div>
  `;
}

export const EmailService = {
  sendVerification: (email: string, username: string, token: string) =>
    sendMail(email, `Verify your ${APP_NAME} account`, emailTemplate(
      `Welcome, ${username}!`,
      `<p>Thank you for joining ${APP_NAME}. Please verify your email address to access all features.</p>`,
      `${APP_URL}/auth/verify-email?token=${token}`,
      'Verify Email'
    )),

  sendPasswordReset: (email: string, username: string, token: string) =>
    sendMail(email, `Reset your ${APP_NAME} password`, emailTemplate(
      `Password Reset`,
      `<p>Hi ${username}, we received a request to reset your password. This link expires in 1 hour.</p>`,
      `${APP_URL}/auth/reset-password?token=${token}`,
      'Reset Password'
    )),

  sendUploadReceived: (email: string, username: string, contentType: string, title: string) =>
    sendMail(email, `Submission received: ${title}`, emailTemplate(
      'Submission Received',
      `<p>Hi ${username}, your ${contentType} "<strong>${title}</strong>" has been received and is pending review.</p>`
    )),

  sendPaymentReceived: (email: string, username: string, amount: number, receiptId: string) =>
    sendMail(email, `Payment confirmed - KES ${amount}`, emailTemplate(
      'Payment Confirmed',
      `<p>Hi ${username}, your payment of <strong>KES ${amount}</strong> was successful.</p><p>Receipt ID: <code>${receiptId}</code></p>`
    )),

  sendUploadApproved: (email: string, username: string, contentType: string, title: string, url: string) =>
    sendMail(email, `Approved: ${title}`, emailTemplate(
      'Content Approved!',
      `<p>Hi ${username}, your ${contentType} "<strong>${title}</strong>" has been approved and is now live.</p>`,
      url,
      'View Now'
    )),

  sendUploadRejected: (email: string, username: string, contentType: string, title: string, reason?: string) =>
    sendMail(email, `Update on: ${title}`, emailTemplate(
      'Submission Not Approved',
      `<p>Hi ${username}, your ${contentType} "<strong>${title}</strong>" was not approved.${reason ? ` Reason: ${reason}` : ''}</p>`
    )),

  sendNewFollower: (email: string, username: string, followerName: string) =>
    sendMail(email, `${followerName} started following you`, emailTemplate(
      'New Follower',
      `<p>Hi ${username}, <strong>${followerName}</strong> is now following you on ${APP_NAME}.</p>`,
      `${APP_URL}/dashboard`,
      'View Dashboard'
    )),

  sendCommentNotification: (email: string, username: string, commenter: string, contentTitle: string, url: string) =>
    sendMail(email, `New comment on ${contentTitle}`, emailTemplate(
      'New Comment',
      `<p>Hi ${username}, <strong>${commenter}</strong> commented on "${contentTitle}".</p>`,
      url,
      'View Comment'
    ))
};
