const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  if (!env.smtp.user || !env.smtp.pass) {
    console.warn('SMTP not configured. Emails will be logged to console.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
  });

  return transporter;
};

const sendEmail = async ({ to, subject, html, text, bcc }) => {
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
    console.log('[Email Mock]', { to, subject });
    return { success: true, mock: true, messageId: `mock-${Date.now()}` };
  }

  const info = await transport.sendMail(mailOptions);
  return { success: true, messageId: info.messageId };
};

const sendVerificationEmail = async (email, token) => {
  const verifyUrl = `${env.frontendUrl}/verify-email?token=${token}`;
  return sendEmail({
    to: email,
    subject: `Verify your ${env.appName} account`,
    html: `
      <h2>Welcome to ${env.appName}!</h2>
      <p>Please verify your email address by clicking the link below:</p>
      <a href="${verifyUrl}">${verifyUrl}</a>
      <p>This link expires in 24 hours.</p>
    `,
  });
};

const sendPasswordResetEmail = async (email, token) => {
  const resetUrl = `${env.frontendUrl.split(',')[0]}/reset-password?token=${token}`;
  return sendEmail({
    to: email,
    subject: `Reset your ${env.appName} password`,
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
  return sendEmail({
    to: email,
    subject: `${env.appName}: ${title}`,
    html: `<h3>${title}</h3><p>${message}</p>`,
  });
};

const sendContactReplyEmail = async ({ to, name, subject, originalMessage, replyMessage }) => {
  const safeSubject = subject || 'Your message';
  return sendEmail({
    to,
    subject: `Re: ${safeSubject} — ${env.appName}`,
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
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordResetCodeEmail,
  sendNotificationEmail,
  sendContactReplyEmail,
};
