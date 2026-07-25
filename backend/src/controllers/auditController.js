const { recordAuditEvent } = require('../utils/audit');
const { recordUserActivity } = require('../utils/auditUserActivity');
const { AppError } = require('../middleware/errorHandler');

const recordClientEvent = async (req, res, next) => {
  try {
    const { action, entityType, entityId, details } = req.body;
    if (!action || typeof action !== 'string') {
      throw new AppError('action is required', 400);
    }
    await recordUserActivity(req, {
      action: action.slice(0, 100),
      entityType: entityType || 'activity',
      entityId: entityId || null,
      details: details || null,
    });
    res.json({ success: true, message: 'Activity recorded' });
  } catch (err) {
    next(err);
  }
};

module.exports = { recordClientEvent };
