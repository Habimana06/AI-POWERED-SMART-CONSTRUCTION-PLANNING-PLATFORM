/**
 * Trigger forgot-password email (same logic as POST /api/auth/forgot-password).
 * Usage: node scripts/test-forgot-password.js user@example.com
 */
const env = require('../src/config/env');
const { query } = require('../src/config/database');
const { sendPasswordResetCodeEmail, isSmtpConfigured } = require('../src/services/emailService');

async function main() {
  const email = (process.argv[2] || '').toLowerCase().trim();
  if (!email) {
    console.error('Usage: node scripts/test-forgot-password.js user@example.com');
    process.exit(1);
  }

  if (!isSmtpConfigured()) {
    console.error('FAIL: SMTP not configured (SMTP_USER/SMTP_PASS in .env)');
    process.exit(1);
  }

  console.log('Testing forgot-password for:', email);

  const result = await query('SELECT id, first_name, email FROM users WHERE email = $1', [email]);
  if (!result.rows.length) {
    console.error('FAIL: No user in database with this email.');
    console.error('Register this email in the app first, or update the user row in MySQL.');
    process.exit(1);
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expires = new Date(Date.now() + 15 * 60 * 1000);
  await query(
    'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE email = $3',
    [code, expires, email],
  );

  const mail = await sendPasswordResetCodeEmail(email, code);
  if (!mail.success) {
    console.error('FAIL: Email not sent —', mail.error || 'unknown');
    process.exit(1);
  }

  console.log('OK: Reset code email sent to', email);
  console.log('OK: messageId:', mail.messageId);
  if (process.argv.includes('--show-code')) {
    console.log('(Dev) Code in DB:', code);
  } else {
    console.log('Check inbox/spam for subject:', `${env.appName} password reset code`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('FAIL:', err.message);
    process.exit(1);
  });
