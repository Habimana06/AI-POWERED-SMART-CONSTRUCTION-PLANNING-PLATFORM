const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

function isSmtpConfigured() {
  return (
    env.smtp.enabled
    && Boolean(env.smtp.user)
    && Boolean(env.smtp.pass)
    && Boolean(env.smtp.host)
  );
}

const getTransporter = () => {
  if (transporter) return transporter;

  if (!isSmtpConfigured()) {
    console.warn(
      '[Email] SMTP not configured — set MAIL_USER/SMTP_USER and MAIL_PASSWORD/SMTP_PASS in backend/.env (or root .env).',
    );
    return null;
  }

  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
    ...(env.smtp.port === 587 ? { requireTLS: true } : {}),
  });

  return transporter;
};

const sendEmail = async ({ to, subject, html, text, bcc, requireDelivery = false }) => {
  const mailOptions = {
    from: `"${env.smtp.fromName}" <${env.smtp.from || env.smtp.user}>`,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ''),
  };
  if (bcc) mailOptions.bcc = bcc;

  const transport = getTransporter();
  if (!transport) {
    const errMsg = 'SMTP is not configured on the server';
    console.error('[Email Mock — not sent]', { to, subject });
    if (requireDelivery) {
      const err = new Error(errMsg);
      err.code = 'SMTP_NOT_CONFIGURED';
      throw err;
    }
    return { success: false, mock: true, messageId: null };
  }

  try {
    const info = await transport.sendMail(mailOptions);
    console.log('[Email sent]', { to, subject, messageId: info.messageId });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[Email failed]', { to, subject, error: err.message });
    if (requireDelivery) throw err;
    return { success: false, error: err.message };
  }
};

const sendVerificationEmail = async (email, token) => {
  const verifyUrl = `${env.frontendUrl.split(',')[0].trim()}/verify-email?token=${token}`;
  return sendEmail({
    to: email,
    subject: `Verify your ${env.appName} account`,
    requireDelivery: true,
    html: `
      <h2>Welcome to ${env.appName}!</h2>
      <p>Please verify your email address by clicking the link below:</p>
      <a href="${verifyUrl}">${verifyUrl}</a>
      <p>This link expires in 24 hours.</p>
    `,
  });
};

const sendPasswordResetEmail = async (email, token) => {
  const resetUrl = `${env.frontendUrl.split(',')[0].trim()}/reset-password?token=${token}`;
  return sendEmail({
    to: email,
    subject: `Reset your ${env.appName} password`,
    requireDelivery: true,
    html: `
      <h2>Password Reset Request</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>This link expires in 1 hour. If you did not request this, ignore this email.</p>
    `,
  });
};

const sendPasswordResetCodeEmail = async (email, code) => {
  return sendEmail({
    to: email,
    subject: `${env.appName} password reset code`,
    requireDelivery: true,
    html: `
      <h2>Password reset verification</h2>
      <p>Use this code on the forgot password page (valid 15 minutes):</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:6px;color:#E67E22;">${code}</p>
      <p>If you did not request this, ignore this email.</p>
    `,
    text: `Your ${env.appName} reset code: ${code}`,
  });
};

const sendNotificationEmail = async (email, title, message) => {
  if (!email) return { success: false, skipped: true };
  return sendEmail({
    to: email,
    subject: `${env.appName}: ${title}`,
    html: `<h3>${title}</h3><p>${message.replace(/\n/g, '<br>')}</p>`,
  });
};

/** Same content as the in-app bell — branded HTML mirror via SMTP. */
const sendBellNotificationEmail = async (email, { title, message, type = 'info', category = 'general' }) => {
  if (!email) return { success: false, skipped: true };
  const appUrl = env.frontendUrl.split(',')[0].trim();
  const typeColors = { info: '#3498DB', success: '#27AE60', warning: '#F39C12', error: '#E74C3C' };
  const accent = typeColors[type] || typeColors.info;
  const safeTitle = String(title || 'Notification').replace(/</g, '&lt;');
  const safeBody = String(message || '').replace(/</g, '&lt;').replace(/\n/g, '<br>');

  return sendEmail({
    to: email,
    subject: `${env.appName} — ${title}`,
    text: `${title}\n\n${message}\n\nOpen the app: ${appUrl}`,
    html: `
      <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;">
        <div style="background:#1E293B;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0;">
          <p style="margin:0;font-size:12px;color:#FB923C;text-transform:uppercase;letter-spacing:1px;">In-app alert (also in your bell)</p>
          <h2 style="margin:8px 0 0;font-size:20px;">${safeTitle}</h2>
        </div>
        <div style="border:1px solid #E2E8F0;border-top:none;padding:20px;border-radius:0 0 8px 8px;">
          <p style="margin:0 0 12px;color:#334155;line-height:1.5;">${safeBody}</p>
          <p style="margin:0;font-size:12px;color:#64748B;">
            Type: <span style="color:${accent};font-weight:600;">${type}</span>
            · Category: ${category}
          </p>
          <p style="margin:16px 0 0;">
            <a href="${appUrl}" style="display:inline-block;background:#E67E22;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-weight:600;">
              Open ${env.appName}
            </a>
          </p>
        </div>
        <p style="font-size:11px;color:#94A3B8;margin-top:12px;text-align:center;">
          You receive this because bell notifications are mirrored to email. Change this in Profile → Notifications.
        </p>
      </div>
    `,
  });
};

const sendContactReplyEmail = async ({ to, name, subject, originalMessage, replyMessage }) => {
  const safeSubject = subject || 'Your message';
  return sendEmail({
    to,
    subject: `Re: ${safeSubject} — ${env.appName}`,
    requireDelivery: true,
    html: `
      <p>Hi ${name || 'there'},</p>
      <p>Thank you for contacting ${env.appName}. Here is our reply:</p>
      <blockquote style="border-left:3px solid #e67e22;padding-left:12px;margin:16px 0;color:#333;">
        ${replyMessage.replace(/\n/g, '<br>')}
      </blockquote>
      <p style="color:#666;font-size:13px;">Your original message:</p>
      <p style="color:#666;font-size:13px;">${String(originalMessage || '').replace(/\n/g, '<br>')}</p>
      <p>— ${env.appName} Support</p>
    `,
    text: `Hi ${name || 'there'},\n\n${replyMessage}\n\n— ${env.appName} Support`,
  });
};

module.exports = {
  isSmtpConfigured,
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordResetCodeEmail,
  sendNotificationEmail,
  sendBellNotificationEmail,
  sendContactReplyEmail,
};
