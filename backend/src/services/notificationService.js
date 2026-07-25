const { query } = require('../config/database');
const env = require('../config/env');
const { sendNotificationEmail } = require('./emailService');
const { sendSms } = require('./smsService');

let io = null;

const init = (socketIo) => {
  io = socketIo;
};

async function loadUserDeliveryPrefs(userId) {
  const result = await query(
    `SELECT u.email, u.phone, COALESCE(us.notify_email, 1) AS notify_email, COALESCE(us.notify_sms, 0) AS notify_sms
     FROM users u
     LEFT JOIN user_security us ON us.user_id = u.id
     WHERE u.id = $1`,
    [userId],
  );
  return result.rows[0] || null;
}

async function deliverNotificationChannels(userId, title, message) {
  const user = await loadUserDeliveryPrefs(userId);
  if (!user) return;

  const emailOn = user.notify_email === 1 || user.notify_email === true;
  const smsOn = env.sms.enabled && (user.notify_sms === 1 || user.notify_sms === true);

  const tasks = [];

  if (emailOn && user.email) {
    tasks.push(
      sendNotificationEmail(user.email, title, message).catch((err) =>
        console.error('User email notification failed:', err.message),
      ),
    );
  }

  if (smsOn && user.phone) {
    tasks.push(
      sendSms(user.phone, `${title}: ${message}`.slice(0, 320)).catch((err) =>
        console.error('SMS notification failed:', err.message),
      ),
    );
  }

  const adminEmail = env.notifications.adminEmail;
  if (adminEmail) {
    tasks.push(
      sendNotificationEmail(
        adminEmail,
        `[Admin copy] ${title}`,
        `User ID: ${userId}\n\n${message}`,
      ).catch((err) => console.error('Admin notification email failed:', err.message)),
    );
  }

  await Promise.all(tasks);
}

const createNotification = async ({
  userId, title, message, type = 'info', category = 'general', referenceType = null, referenceId = null, metadata = {},
}) => {
  const result = await query(
    `INSERT INTO notifications (user_id, title, message, type, category, reference_type, reference_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [userId, title, message, type, category, referenceType, referenceId, JSON.stringify(metadata)],
  );

  const notification = formatNotification(result.rows[0]);
  emitToUser(userId, 'notification', notification);

  deliverNotificationChannels(userId, title, message).catch((err) =>
    console.error('Notification delivery failed:', err.message),
  );

  return notification;
};

const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

const emitToProject = (projectId, event, data) => {
  if (io) {
    io.to(`project:${projectId}`).emit(event, data);
  }
};

const broadcast = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

const notifyAndEmail = async (userId, email, title, message, type = 'info') => {
  return createNotification({ userId, title, message, type });
};

const formatNotification = (row) => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  message: row.message,
  type: row.type,
  category: row.category,
  referenceType: row.reference_type,
  referenceId: row.reference_id,
  isRead: row.is_read,
  readAt: row.read_at,
  metadata: row.metadata,
  createdAt: row.created_at,
});

module.exports = {
  init,
  createNotification,
  emitToUser,
  emitToProject,
  broadcast,
  notifyAndEmail,
  formatNotification,
};
