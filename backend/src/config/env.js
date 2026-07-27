const path = require('path');

// Root .env (Docker / monorepo) then backend/.env (local overrides)
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const env = {
  appName: process.env.APP_NAME || 'BuildPlan AI',
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000',
  frontendUrls: (process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000,http://localhost:8081')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean),

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    database: process.env.DB_NAME || 'buildplan',
    user: process.env.DB_USER || 'buildplan_user',
    password: process.env.DB_PASSWORD || 'buildplan_pass',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-jwt-secret-change-me',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  groq: {
    apiKey: process.env.GROQ_API_KEY || '',
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    baseUrl: 'https://api.groq.com/openai/v1',
  },

  xai: {
    apiKey: process.env.XAI_API_KEY || '',
    imageModel: process.env.XAI_IMAGE_MODEL || 'grok-imagine-image-quality',
    baseUrl: 'https://api.x.ai/v1',
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
    imageModel: process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  },

  smtp: {
    enabled: process.env.MAIL_ENABLED !== 'false' && process.env.SMTP_ENABLED !== 'false',
    host: process.env.SMTP_HOST || process.env.MAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || process.env.MAIL_PORT, 10) || 587,
    user: process.env.SMTP_USER || process.env.MAIL_USER || '',
    pass: process.env.SMTP_PASS || process.env.MAIL_PASSWORD || '',
    from: process.env.SMTP_FROM || process.env.MAIL_FROM || 'noreply@buildplan.ai',
    fromName: process.env.MAIL_FROM_NAME || process.env.SMTP_FROM_NAME || process.env.APP_NAME || 'BuildPlan AI',
  },

  notifications: {
    adminEmail:
      process.env.NOTIFICATION_ADMIN_EMAIL
      || process.env.MAIL_USER
      || process.env.MAIL_FROM
      || '',
    /** When true (default), every in-app bell notification also sends SMTP to the user. */
    mirrorBellEmail: process.env.NOTIFICATION_MIRROR_BELL !== 'false',
  },

  sms: {
    enabled: process.env.APP_SMS_ENABLED !== 'false' && process.env.APP_SMS_ENABLED !== '0',
    accountSid: process.env.APP_SMS_TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.APP_SMS_TWILIO_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN || '',
    fromNumber: process.env.APP_SMS_TWILIO_FROM_NUMBER || process.env.TWILIO_FROM_NUMBER || '',
  },

  uploadDir: process.env.UPLOAD_DIR || 'uploads',
};

module.exports = env;
