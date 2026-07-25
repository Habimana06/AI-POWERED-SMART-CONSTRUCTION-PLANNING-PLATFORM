const auditLog = (action, entityType = null) => async (req, res, next) => {
  const originalJson = res.json.bind(res);
  const { recordAuditEvent } = require('../utils/audit');

  res.json = (body) => {
    if (res.statusCode < 400 && req.user) {
      const entityId =
        req.params.id
        || body?.data?.project?.id
        || body?.data?.design?.id
        || body?.data?.user?.id
        || body?.data?.id
        || null;
      const payload = body?.data?.project || body?.data?.design || body?.data?.user || body?.data || null;
      recordAuditEvent(
        {
          userId: req.user.id,
          action,
          entityType,
          entityId,
          newValues: payload,
        },
        req,
      ).catch((err) => console.error('Audit log error:', err.message));
    }
    return originalJson(body);
  };

  next();
};

module.exports = auditLog;
