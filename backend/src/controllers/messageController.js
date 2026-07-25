const { query } = require('../config/database');
const { createNotification } = require('../services/notificationService');
const { AppError } = require('../middleware/errorHandler');

const getMessages = async (req, res, next) => {
  try {
    const { projectId, page = 1, limit = 30 } = req.query;
    const offset = (page - 1) * limit;
    const conditions = ['(sender_id = $1 OR recipient_id = $1)'];
    const params = [req.user.id];
    let idx = 2;

    if (projectId) { conditions.push(`project_id = $${idx++}`); params.push(projectId); }

    const where = `WHERE ${conditions.join(' AND ')}`;
    params.push(limit, offset);

    const result = await query(
      `SELECT m.*, s.first_name as sender_first_name, s.last_name as sender_last_name,
       r.first_name as recipient_first_name, r.last_name as recipient_last_name
       FROM messages m
       JOIN users s ON m.sender_id = s.id
       LEFT JOIN users r ON m.recipient_id = r.id
       ${where} ORDER BY m.created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      params
    );

    res.json({ success: true, data: { messages: result.rows } });
  } catch (err) {
    next(err);
  }
};

const sendMessage = async (req, res, next) => {
  try {
    const { projectId, recipientId, subject, body } = req.body;
    if (!body) throw new AppError('Message body is required', 400);

    const result = await query(
      `INSERT INTO messages (project_id, sender_id, recipient_id, subject, body)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [projectId, req.user.id, recipientId, subject, body]
    );

    if (recipientId) {
      await createNotification({
        userId: recipientId,
        title: subject || 'New Message',
        message: body.substring(0, 200),
        type: 'info',
        category: 'message',
        referenceType: 'message',
        referenceId: result.rows[0].id,
      });
    }

    res.status(201).json({ success: true, data: { message: result.rows[0] } });
  } catch (err) {
    next(err);
  }
};

const markMessageRead = async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE messages SET is_read = true, read_at = NOW()
       WHERE id = $1 AND recipient_id = $2 RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) throw new AppError('Message not found', 404);
    res.json({ success: true, data: { message: result.rows[0] } });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMessages, sendMessage, markMessageRead };
