const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { query, getClient } = require('../config/database');
const { generateToken, hashToken, parseDuration, formatUser } = require('../utils/tokens');
const { recordAuditEvent } = require('../utils/audit');
const { recordUserActivity } = require('../utils/auditUserActivity');

async function auditAuthAttempt(req, { userId = null, email, action, reason, extra = {} }) {
  await recordAuditEvent(
    {
      userId,
      action,
      entityType: 'auth',
      newValues: {
        email: email ? String(email).toLowerCase() : undefined,
        reason,
        ...extra,
      },
    },
    req,
  );
}
const { sendVerificationEmail, sendPasswordResetEmail, sendPasswordResetCodeEmail } = require('../services/emailService');
const { generateSecret, verifyToken, keyUri, qrDataUrl } = require('../services/totpService');
const { AppError } = require('../middleware/errorHandler');

async function getUserSecurity(userId) {
  try {
    const r = await query('SELECT * FROM user_security WHERE user_id = $1', [userId]);
    return r.rows[0] || null;
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') return null;
    throw err;
  }
}

async function issueAuthTokens(user, req, client) {
  const sessionResult = await client.query(
    `INSERT INTO sessions (user_id, ip_address, user_agent, expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '7 days') RETURNING id`,
    [user.id, req.ip, req.get('user-agent')]
  );
  const sessionId = sessionResult.rows[0].id;
  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id, sessionId);
  await client.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, session_id, expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '7 days')`,
    [user.id, hashToken(refreshToken), sessionId]
  );
  await client.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
  await recordAuditEvent(
    {
      userId: user.id,
      action: 'LOGIN',
      entityType: 'session',
      entityId: sessionId,
      newValues: { email: user.email, role: user.role },
    },
    req,
    client,
  );
  return { accessToken, refreshToken };
}

const generateAccessToken = (userId) =>
  jwt.sign({ userId }, env.jwt.secret, { expiresIn: env.jwt.expiresIn });

const generateRefreshToken = (userId, sessionId) =>
  jwt.sign({ userId, sessionId }, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpiresIn });

const register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, phone, role = 'project_manager', companyId } = req.body;

    if (!email || !password || !firstName || !lastName) {
      throw new AppError('Email, password, first name, and last name are required', 400);
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      throw new AppError('Email already registered', 409);
    }

    const roleResult = await query('SELECT id FROM roles WHERE name = $1', [role]);
    if (roleResult.rows.length === 0) {
      throw new AppError('Invalid role', 400);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const verificationToken = generateToken();

    const result = await query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, role_id, company_id, email_verification_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [email.toLowerCase(), passwordHash, firstName, lastName, phone, roleResult.rows[0].id, companyId, verificationToken]
    );

    await sendVerificationEmail(email, verificationToken);

    await recordAuditEvent(
      {
        userId: result.rows[0].id,
        action: 'REGISTER',
        entityType: 'user',
        entityId: result.rows[0].id,
        newValues: { email: email.toLowerCase(), role, firstName, lastName },
      },
      req,
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your email.',
      data: { user: formatUser({ ...result.rows[0], role }) },
    });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  const client = await getClient();
  try {
    const { email, password } = req.body;
    if (!email || !password) throw new AppError('Email and password are required', 400);

    const emailNorm = email.toLowerCase();

    const result = await client.query(
      `SELECT u.*, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.email = $1`,
      [emailNorm]
    );

    if (result.rows.length === 0) {
      await auditAuthAttempt(req, { email: emailNorm, action: 'LOGIN_FAILED', reason: 'unknown_email' });
      throw new AppError('Invalid credentials', 401);
    }
    const user = result.rows[0];

    if (!user.is_active) {
      await auditAuthAttempt(req, {
        userId: user.id,
        email: emailNorm,
        action: 'LOGIN_FAILED',
        reason: 'account_deactivated',
      });
      throw new AppError('Account is deactivated', 403);
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      await auditAuthAttempt(req, {
        userId: user.id,
        email: emailNorm,
        action: 'LOGIN_FAILED',
        reason: 'invalid_password',
      });
      throw new AppError('Invalid credentials', 401);
    }

    const security = await getUserSecurity(user.id);
    if (security?.totp_enabled && security?.totp_secret) {
      await auditAuthAttempt(req, {
        userId: user.id,
        email: emailNorm,
        action: 'LOGIN_2FA_REQUIRED',
        reason: 'totp_challenge',
      });
      const twoFactorToken = jwt.sign(
        { userId: user.id, scope: '2fa' },
        env.jwt.secret,
        { expiresIn: '5m' },
      );
      return res.json({
        success: true,
        message: 'Two-factor authentication required',
        data: { requires2FA: true, twoFactorToken },
      });
    }

    await client.query('BEGIN');
    const tokens = await issueAuthTokens(user, req, client);
    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: formatUser(user),
        tokens: {
          ...tokens,
          expiresIn: env.jwt.expiresIn,
        },
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await query(
        'UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1',
        [hashToken(refreshToken)]
      );
    }
    if (req.user?.id) {
      await recordAuditEvent(
        { userId: req.user.id, action: 'LOGOUT', entityType: 'session' },
        req,
      );
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) throw new AppError('Refresh token required', 400);

    const decoded = jwt.verify(token, env.jwt.refreshSecret);
    const tokenHash = hashToken(token);

    const result = await query(
      `SELECT rt.*, u.is_active FROM refresh_tokens rt
       JOIN users u ON rt.user_id = u.id
       WHERE rt.token_hash = $1 AND rt.revoked = false AND rt.expires_at > NOW()`,
      [tokenHash]
    );

    if (result.rows.length === 0) throw new AppError('Invalid refresh token', 401);
    if (!result.rows[0].is_active) throw new AppError('Account deactivated', 403);

    await query('UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1', [tokenHash]);

    const accessToken = generateAccessToken(decoded.userId);
    const newRefreshToken = generateRefreshToken(decoded.userId, decoded.sessionId);

    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, session_id, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '7 days')`,
      [decoded.userId, hashToken(newRefreshToken), decoded.sessionId]
    );

    res.json({
      success: true,
      data: { accessToken, refreshToken: newRefreshToken, expiresIn: env.jwt.expiresIn },
    });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new AppError('Invalid refresh token', 401));
    }
    next(err);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) throw new AppError('Email is required', 400);
    const normalized = email.toLowerCase().trim();

    const result = await query('SELECT id, first_name FROM users WHERE email = $1', [normalized]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No account found with this email address.' });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expires = new Date(Date.now() + 15 * 60 * 1000);
    await query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE email = $3',
      [code, expires, normalized],
    );
    await sendPasswordResetCodeEmail(normalized, code);
    await recordAuditEvent(
      {
        userId: result.rows[0].id,
        action: 'PASSWORD_RESET_REQUEST',
        entityType: 'auth',
        newValues: { email: normalized, method: 'email_code' },
      },
      req,
    );

    res.json({ success: true, message: 'Verification code sent to your email.' });
  } catch (err) {
    next(err);
  }
};

const verifyForgotPasswordCode = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) throw new AppError('Email and verification code are required', 400);
    const normalized = email.toLowerCase().trim();

    const result = await query(
      `SELECT id FROM users WHERE email = $1 AND password_reset_token = $2 AND password_reset_expires > NOW()`,
      [normalized, String(code).trim()],
    );
    if (result.rows.length === 0) {
      throw new AppError('Invalid or expired verification code', 400);
    }

    const resetToken = jwt.sign(
      { userId: result.rows[0].id, purpose: 'password_reset' },
      env.jwt.secret,
      { expiresIn: '15m' },
    );

    res.json({ success: true, data: { resetToken } });
  } catch (err) {
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, resetToken, password, email, code } = req.body;
    if (!password) throw new AppError('New password is required', 400);
    if (password.length < 8) throw new AppError('Password must be at least 8 characters', 400);

    let userId = null;

    if (resetToken) {
      const payload = jwt.verify(resetToken, env.jwt.secret);
      if (payload.purpose !== 'password_reset') throw new AppError('Invalid reset session', 400);
      userId = payload.userId;
    } else if (email && code) {
      const normalized = email.toLowerCase().trim();
      const result = await query(
        `SELECT id FROM users WHERE email = $1 AND password_reset_token = $2 AND password_reset_expires > NOW()`,
        [normalized, String(code).trim()],
      );
      if (result.rows.length === 0) throw new AppError('Invalid or expired verification code', 400);
      userId = result.rows[0].id;
    } else if (token) {
      const result = await query(
        `SELECT id FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()`,
        [token],
      );
      if (result.rows.length === 0) throw new AppError('Invalid or expired reset token', 400);
      userId = result.rows[0].id;
    } else {
      throw new AppError('Reset token or verification code is required', 400);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await query(
      `UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2`,
      [passwordHash, userId],
    );

    await query('UPDATE refresh_tokens SET revoked = true WHERE user_id = $1', [userId]);

    await recordAuditEvent(
      {
        userId,
        action: 'PASSWORD_RESET_COMPLETE',
        entityType: 'auth',
      },
      req,
    );

    res.json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new AppError('Reset session expired — request a new code', 400));
    }
    next(err);
  }
};

const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) throw new AppError('Verification token required', 400);

    const result = await query(
      'SELECT id FROM users WHERE email_verification_token = $1',
      [token]
    );

    if (result.rows.length === 0) throw new AppError('Invalid verification token', 400);

    await query(
      `UPDATE users SET is_verified = true, email_verification_token = NULL WHERE id = $1`,
      [result.rows[0].id]
    );

    await recordAuditEvent(
      {
        userId: result.rows[0].id,
        action: 'EMAIL_VERIFIED',
        entityType: 'user',
        entityId: result.rows[0].id,
      },
      req,
    );

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (err) {
    next(err);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.*, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1`,
      [req.user.id]
    );
    const user = formatUser(result.rows[0]);
    let contractor = null;
    const sec = await getUserSecurity(req.user.id);

    if (user.role === 'contractor') {
      const contractorResult = await query(
        'SELECT c.* FROM contractors c WHERE c.user_id = $1',
        [req.user.id]
      );
      if (contractorResult.rows[0]) {
        const row = contractorResult.rows[0];
        contractor = {
          specialty: row.specialty,
          licenseNumber: row.license_number,
          experienceYears: row.experience_years,
          hourlyRate: parseFloat(row.hourly_rate) || 0,
          rating: parseFloat(row.rating) || 0,
          availability: row.availability,
          bio: row.bio,
          companyName: env.appName,
          totalProjects: row.total_projects,
        };
      }
    }

    res.json({
      success: true,
      data: {
        user: {
          ...user,
          totpEnabled: !!sec?.totp_enabled,
          notifyEmail: sec ? sec.notify_email !== 0 : true,
          notifySms: !!sec?.notify_sms,
        },
        contractor,
      },
    });
  } catch (err) {
    next(err);
  }
};

const verify2FALogin = async (req, res, next) => {
  const client = await getClient();
  try {
    const { twoFactorToken, code } = req.body;
    if (!twoFactorToken || !code) throw new AppError('2FA token and code are required', 400);
    let payload;
    try {
      payload = jwt.verify(twoFactorToken, env.jwt.secret);
    } catch {
      await auditAuthAttempt(req, { action: 'LOGIN_2FA_FAILED', reason: 'expired_token' });
      throw new AppError('2FA session expired — sign in again', 401);
    }
    if (payload.scope !== '2fa') throw new AppError('Invalid 2FA token', 401);

    const result = await client.query(
      `SELECT u.*, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1`,
      [payload.userId],
    );
    if (result.rows.length === 0) throw new AppError('User not found', 404);
    const user = result.rows[0];
    const security = await getUserSecurity(user.id);
    if (!security?.totp_enabled || !security?.totp_secret) {
      throw new AppError('2FA is not enabled', 400);
    }
    if (!verifyToken(security.totp_secret, code)) {
      await auditAuthAttempt(req, {
        userId: user.id,
        email: user.email,
        action: 'LOGIN_2FA_FAILED',
        reason: 'invalid_code',
      });
      throw new AppError('Invalid authentication code', 401);
    }

    await client.query('BEGIN');
    const tokens = await issueAuthTokens(user, req, client);
    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: formatUser(user),
        tokens: { ...tokens, expiresIn: env.jwt.expiresIn },
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

const setup2FA = async (req, res, next) => {
  try {
    const { rows: userRows } = await query('SELECT email FROM users WHERE id = $1', [req.user.id]);
    const email = userRows[0]?.email || req.user.email;
    if (!email) {
      throw new AppError('User email not found', 400);
    }

    const secret = generateSecret();
    await query(
      `INSERT INTO user_security (user_id, totp_secret, totp_enabled)
       VALUES ($1, $2, 0)
       ON DUPLICATE KEY UPDATE totp_secret = VALUES(totp_secret), totp_enabled = 0, updated_at = NOW()`,
      [req.user.id, secret],
    );

    const otpauth = keyUri(email, secret);
    const qr = await qrDataUrl(otpauth);
    res.json({
      success: true,
      data: { qrDataUrl: qr, manualKey: secret, otpauthUrl: otpauth },
    });
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE' || /user_security/i.test(err.message || '')) {
      return next(new AppError('Security table missing — run: node src/db/ensure-user-security.js', 503));
    }
    next(err);
  }
};

const enable2FA = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) throw new AppError('Authentication code is required', 400);
    const security = await getUserSecurity(req.user.id);
    if (!security?.totp_secret) throw new AppError('Scan QR code first (setup 2FA)', 400);
    if (!verifyToken(security.totp_secret, code)) {
      throw new AppError('Invalid code — use code from your authenticator app', 400);
    }
    await query(
      'UPDATE user_security SET totp_enabled = 1, updated_at = NOW() WHERE user_id = $1',
      [req.user.id],
    );
    await recordUserActivity(req, { action: 'ENABLE_2FA', entityType: 'security' });
    res.json({ success: true, message: 'Two-factor authentication enabled' });
  } catch (err) {
    next(err);
  }
};

const disable2FA = async (req, res, next) => {
  try {
    const { code, password } = req.body;
    const userRow = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const valid = await bcrypt.compare(password, userRow.rows[0].password_hash);
    if (!valid) throw new AppError('Password incorrect', 401);
    const security = await getUserSecurity(req.user.id);
    if (security?.totp_secret && !verifyToken(security.totp_secret, code)) {
      throw new AppError('Invalid authentication code', 401);
    }
    await query(
      'UPDATE user_security SET totp_enabled = 0, totp_secret = NULL, updated_at = NOW() WHERE user_id = $1',
      [req.user.id],
    );
    await recordUserActivity(req, { action: 'DISABLE_2FA', entityType: 'security' });
    res.json({ success: true, message: 'Two-factor authentication disabled' });
  } catch (err) {
    next(err);
  }
};

const updateNotificationPrefs = async (req, res, next) => {
  try {
    const { notifyEmail, notifySms } = req.body;
    try {
      await query(
        `INSERT INTO user_security (user_id, notify_email, notify_sms)
         VALUES ($1, $2, $3)
         ON DUPLICATE KEY UPDATE notify_email = VALUES(notify_email), notify_sms = VALUES(notify_sms), updated_at = NOW()`,
        [req.user.id, notifyEmail !== false ? 1 : 0, notifySms ? 1 : 0],
      );
    } catch (dbErr) {
      if (dbErr.code === 'ER_NO_SUCH_TABLE') {
        throw new AppError('Notification preferences unavailable — restart API after database setup', 503);
      }
      throw dbErr;
    }
    await recordUserActivity(req, {
      action: 'UPDATE_NOTIFICATION_PREFS',
      entityType: 'user',
      details: { notifyEmail, notifySms },
    });
    res.json({ success: true, message: 'Notification preferences saved' });
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, phone, email, avatarUrl, jobTitle, department } = req.body;
    if (avatarUrl !== undefined && avatarUrl !== null && String(avatarUrl).length > 600000) {
      throw new AppError('Avatar image is too large — use a smaller file or pick a character', 400);
    }
    const avatarValue = avatarUrl === '' ? null : (avatarUrl !== undefined ? avatarUrl : undefined);
    if (email && email !== req.user.email) {
      const taken = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, req.user.id]);
      if (taken.rows.length) throw new AppError('Email already in use', 409);
      await query(
        `UPDATE users SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name),
         phone = COALESCE($3, phone), email = $4,
         job_title = COALESCE($5, job_title), department = COALESCE($6, department),
         avatar_url = ${avatarValue !== undefined ? '$7' : 'avatar_url'},
         updated_at = NOW() WHERE id = $${avatarValue !== undefined ? '8' : '7'}`,
        avatarValue !== undefined
          ? [firstName, lastName, phone, email, jobTitle ?? null, department ?? null, avatarValue, req.user.id]
          : [firstName, lastName, phone, email, jobTitle ?? null, department ?? null, req.user.id],
      );
    } else {
      const sets = [
        'first_name = COALESCE($1, first_name)',
        'last_name = COALESCE($2, last_name)',
        'phone = COALESCE($3, phone)',
        'job_title = COALESCE($4, job_title)',
        'department = COALESCE($5, department)',
      ];
      const params = [firstName, lastName, phone, jobTitle ?? null, department ?? null];
      let idx = 6;
      if (avatarValue !== undefined) {
        sets.push(`avatar_url = $${idx++}`);
        params.push(avatarValue);
      }
      sets.push('updated_at = NOW()');
      params.push(req.user.id);
      await query(
        `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx}`,
        params,
      );
    }
    const user = await query(
      `SELECT u.*, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1`,
      [req.user.id]
    );
    await recordUserActivity(req, {
      action: 'UPDATE_PROFILE',
      entityType: 'user',
      entityId: req.user.id,
      details: {
        firstName,
        lastName,
        phone,
        email: email || req.user.email,
        avatarUpdated: avatarValue !== undefined,
      },
    });
    res.json({ success: true, data: { user: formatUser(user.rows[0]) } });
  } catch (err) {
    next(err);
  }
};

const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) throw new AppError('Current and new password required', 400);
    if (newPassword.length < 8) throw new AppError('Password must be at least 8 characters', 400);

    const user = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const valid = await bcrypt.compare(currentPassword, user.rows[0].password_hash);
    if (!valid) throw new AppError('Current password is incorrect', 400);

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, req.user.id]);
    await query('UPDATE refresh_tokens SET revoked = true WHERE user_id = $1', [req.user.id]);

    await recordUserActivity(req, {
      action: 'CHANGE_PASSWORD',
      entityType: 'auth',
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register, login, logout, refreshToken, forgotPassword, verifyForgotPasswordCode, resetPassword, verifyEmail,
  getProfile, updateProfile, updatePassword,
  verify2FALogin, setup2FA, enable2FA, disable2FA, updateNotificationPrefs,
};
