const { query } = require('../config/database');
const env = require('../config/env');
const { sendNotificationEmail } = require('./emailService');

let io = null;

const init = (socketIo) => {
  io = socketIo;
};

function prefEmailEnabled(value) {
  if (value === null || value === undefined) return true;
  return value === 1 || value === true || value === '1';
}

async function loadUserDeliveryPrefs(userId) {
  const result = await query(
    `SELECT u.email, u.first_name, u.last_name, COALESCE(us.notify_email, 1) AS notify_email
     FROM users u
     LEFT JOIN user_security us ON us.user_id = u.id
     WHERE u.id = $1`,
    [userId],
  );
  return result.rows[0] || null;
}

async function loadActiveAdminUserIds() {
  const result = await query(
    `SELECT u.id, u.email FROM users u
     JOIN roles r ON r.id = u.role_id
     WHERE r.name = 'admin' AND (u.is_active = 1 OR u.is_active = TRUE)`,
  );
  return result.rows || [];
}

async function deliverNotificationChannels(userId, title, message, { adminCopy = true } = {}) {
  const user = await loadUserDeliveryPrefs(userId);
  if (!user) return;

  const emailOn = prefEmailEnabled(user.notify_email);
  const tasks = [];

  if (emailOn && user.email) {
    tasks.push(
      sendNotificationEmail(user.email, title, message).then((res) => {
        if (res?.mock || res?.success === false) {
          console.error(`Email notification not delivered to ${user.email} (check SMTP config)`);
        }
      }),
    );
  }

  const adminEmail = (env.notifications.adminEmail || '').trim().toLowerCase();
  const recipientEmail = (user.email || '').trim().toLowerCase();
  if (adminCopy && adminEmail && adminEmail !== recipientEmail) {
    tasks.push(
      sendNotificationEmail(
        env.notifications.adminEmail,
        `[Admin copy] ${title}`,
        `${user.first_name || ''} ${user.last_name || ''} (${user.email || userId})\n\n${message}`,
      ),
    );
  }

  await Promise.all(tasks);
}

const createNotification = async ({
  userId,
  title,
  message,
  type = 'info',
  category = 'general',
  referenceType = null,
  referenceId = null,
  metadata = {},
  adminEmailCopy = true,
  alsoNotifyAdmins = false,
}) => {
  const result = await query(
    `INSERT INTO notifications (user_id, title, message, type, category, reference_type, reference_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [userId, title, message, type, category, referenceType, referenceId, JSON.stringify(metadata)],
  );

  const notification = formatNotification(result.rows[0]);
  emitToUser(userId, 'notification', notification);

  deliverNotificationChannels(userId, title, message, { adminCopy: adminEmailCopy }).catch((err) =>
    console.error('Notification delivery failed:', err.message),
  );

  if (alsoNotifyAdmins) {
    const admins = await loadActiveAdminUserIds();
    for (const admin of admins) {
      if (admin.id === userId) continue;
      const adminResult = await query(
        `INSERT INTO notifications (user_id, title, message, type, category, reference_type, reference_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          admin.id,
          title,
          message,
          type,
          category,
          referenceType,
          referenceId,
          JSON.stringify(metadata),
        ],
      );
      emitToUser(admin.id, 'notification', formatNotification(adminResult.rows[0]));
      deliverNotificationChannels(admin.id, title, message, { adminCopy: false }).catch(() => {});
    }
  }

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
  deliverNotificationChannels,
};
