/**
 * Verify SMTP from backend/.env or repo root .env.
 * Usage: node scripts/test-smtp.js [recipient@email.com]
 */
const env = require('../src/config/env');
const nodemailer = require('nodemailer');

async function main() {
  const to = process.argv[2] || env.smtp.user;
  if (!env.smtp.user || !env.smtp.pass) {
    console.error('FAIL: SMTP_USER/MAIL_USER and SMTP_PASS/MAIL_PASSWORD are not set.');
    console.error('Add them to backend/.env or the repo root .env, then restart the API.');
    process.exit(1);
  }

  console.log('SMTP host:', env.smtp.host);
  console.log('SMTP port:', env.smtp.port);
  console.log('SMTP user:', env.smtp.user);
  console.log('Sending test to:', to);

  const transport = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
    ...(env.smtp.port === 587 ? { requireTLS: true } : {}),
  });

  try {
    await transport.verify();
    console.log('OK: SMTP connection verified');
  } catch (err) {
    console.error('FAIL: SMTP verify —', err.message);
    if (/535|534|Invalid login|authentication/i.test(err.message)) {
      console.error('Tip: For Gmail use an App Password (Google Account → Security → App passwords), not your normal password.');
    }
    process.exit(1);
  }

  try {
    const info = await transport.sendMail({
      from: `"${env.smtp.fromName}" <${env.smtp.from || env.smtp.user}>`,
      to,
      subject: `${env.appName} SMTP test`,
      text: `If you received this, SMTP is working at ${new Date().toISOString()}`,
      html: `<p>If you received this, <strong>${env.appName}</strong> SMTP is working.</p><p>${new Date().toISOString()}</p>`,
    });
    console.log('OK: Test email sent, messageId:', info.messageId);
  } catch (err) {
    console.error('FAIL: sendMail —', err.message);
    process.exit(1);
  }
}

main();
