const { recordAuditEvent } = require('./audit');

/** Log an activity for the authenticated user (exports, downloads, client-side actions). */
async function recordUserActivity(req, { action, entityType = 'activity', entityId = null, details = null }) {
  if (!req.user?.id) return;
  await recordAuditEvent(
    {
      userId: req.user.id,
      action,
      entityType,
      entityId,
      newValues: details,
    },
    req,
  );
}

module.exports = { recordUserActivity };
