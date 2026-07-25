const { query } = require('../config/database');
const { formatNotification } = require('../services/notificationService');
const { AppError } = require('../middleware/errorHandler');

const getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const offset = (page - 1) * limit;

    const conditions = ['user_id = $1'];
    const params = [req.user.id];
    let idx = 2;

    if (unreadOnly === 'true') {
      conditions.push('is_read = false');
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const countResult = await query(`SELECT COUNT(*) FROM notifications ${where}`, params);

    params.push(limit, offset);
    const result = await query(
      `SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      params
    );

    res.json({
      success: true,
      data: {
        notifications: result.rows.map(formatNotification),
        unreadCount: unreadOnly === 'true' ? +countResult.rows[0].count : undefined,
        pagination: { page: +page, limit: +limit, total: +countResult.rows[0].count },
      },
    });
  } catch (err) {
    next(err);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE notifications SET is_read = true, read_at = NOW()
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) throw new AppError('Notification not found', 404);
    res.json({ success: true, data: { notification: formatNotification(result.rows[0]) } });
  } catch (err) {
    next(err);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    await query(
      'UPDATE notifications SET is_read = true, read_at = NOW() WHERE user_id = $1 AND is_read = false',
      [req.user.id]
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const result = await query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
      [req.user.id]
    );
    res.json({ success: true, data: { unreadCount: +result.rows[0].count } });
  } catch (err) {
    next(err);
  }
};

module.exports = { getNotifications, markAsRead, markAllAsRead, getUnreadCount };
