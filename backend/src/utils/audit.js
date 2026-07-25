const { query } = require('../config/database');

async function recordAuditEvent(
  {
    userId,
    action,
    entityType = null,
    entityId = null,
    newValues = null,
    oldValues = null,
  },
  req,
  client = null,
) {
  const run = client ? client.query.bind(client) : query;
  try {
    await run(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId || null,
        action,
        entityType,
        entityId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        req?.ip || req?.connection?.remoteAddress || null,
        req?.get?.('user-agent') || null,
      ],
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

module.exports = { recordAuditEvent };
