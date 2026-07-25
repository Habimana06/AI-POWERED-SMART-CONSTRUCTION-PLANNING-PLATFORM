const { query } = require('../config/database');
const { sendContactReplyEmail } = require('../services/emailService');

const listContactMessages = async (req, res, next) => {
  try {
    const status = req.query.status;
    let sql = `SELECT cm.*, u.email AS replied_by_email,
                      CONCAT(u.first_name, ' ', u.last_name) AS replied_by_name
               FROM contact_messages cm
               LEFT JOIN users u ON u.id = cm.replied_by`;
    const params = [];
    if (status && status !== 'all') {
      sql += ' WHERE cm.status = $1';
      params.push(status);
    }
    sql += ' ORDER BY cm.created_at DESC LIMIT 200';

    const { rows } = await query(sql, params);
    res.json({ success: true, data: { messages: rows } });
  } catch (err) {
    next(err);
  }
};

const replyToContactMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const replyMessage = String(req.body?.replyMessage || req.body?.reply || '').trim();

    if (replyMessage.length < 5) {
      return res.status(400).json({ success: false, message: 'Reply must be at least 5 characters.' });
    }

    const { rows: [row] } = await query('SELECT * FROM contact_messages WHERE id = $1', [id]);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    await query(
      `UPDATE contact_messages
       SET status = 'replied', admin_reply = $1, replied_at = NOW(), replied_by = $2
       WHERE id = $3`,
      [replyMessage.slice(0, 10000), req.user.id, id],
    );

    let emailResult = { mock: true };
    try {
      emailResult = await sendContactReplyEmail({
        to: row.email,
        name: row.name,
        subject: row.subject,
        originalMessage: row.message,
        replyMessage,
      });
    } catch (mailErr) {
      console.error('Contact reply email failed:', mailErr.message);
    }

    res.json({
      success: true,
      message: emailResult.mock
        ? 'Reply saved. Configure SMTP to send email to the contact.'
        : `Reply sent to ${row.email}`,
      data: { emailSent: !emailResult.mock },
    });
  } catch (err) {
    next(err);
  }
};

const deleteContactMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM contact_messages WHERE id = $1', [id]);
    res.json({ success: true, message: 'Message deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listContactMessages,
  replyToContactMessage,
  deleteContactMessage,
};
