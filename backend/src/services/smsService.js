const env = require('../config/env');
const { sendNotificationEmail } = require('./emailService');

let twilioClient = null;

function getTwilioClient() {
  if (!env.sms.enabled) return null;
  if (!env.sms.accountSid || !env.sms.authToken) return null;
  if (twilioClient) return twilioClient;
  try {
    // eslint-disable-next-line global-require
    const twilio = require('twilio');
    twilioClient = twilio(env.sms.accountSid, env.sms.authToken);
    return twilioClient;
  } catch (err) {
    console.warn('Twilio SDK unavailable:', err.message);
    return null;
  }
}

async function sendSms(to, body) {
  if (!env.sms.enabled) return { success: false, skipped: true, reason: 'disabled' };
  const client = getTwilioClient();
  if (!client || !env.sms.fromNumber) {
    console.log('[SMS Mock]', { to, body: body.slice(0, 120) });
    return { success: true, mock: true };
  }
  const normalized = String(to || '').trim();
  if (!normalized) return { success: false, reason: 'no_phone' };

  const msg = await client.messages.create({
    body: body.slice(0, 1500),
    from: env.sms.fromNumber,
    to: normalized,
  });
  return { success: true, sid: msg.sid };
}

module.exports = { sendSms, sendNotificationEmail };
