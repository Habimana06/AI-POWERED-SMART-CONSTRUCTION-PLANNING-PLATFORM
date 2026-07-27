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
  sendContactReplyEmail,
};
