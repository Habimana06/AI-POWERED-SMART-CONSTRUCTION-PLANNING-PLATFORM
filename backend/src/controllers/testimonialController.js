const { query } = require('../config/database');

const listTestimonials = async (req, res, next) => {
  try {
    const status = req.query.status;
    let sql = `SELECT id, author_name, author_role, quote, email, status, created_at, approved_at, rejected_at
               FROM testimonials`;
    const params = [];
    if (status && status !== 'all') {
      sql += ' WHERE status = $1';
      params.push(status);
    }
    sql += ' ORDER BY created_at DESC LIMIT 200';

    const { rows } = await query(sql, params);
    res.json({ success: true, data: { testimonials: rows } });
  } catch (err) {
    next(err);
  }
};

const approveTestimonial = async (req, res, next) => {
  try {
    const { id } = req.params;
    await query(
      `UPDATE testimonials
       SET status = 'approved', approved_at = NOW(), rejected_at = NULL
       WHERE id = $1`,
      [id],
    );
    res.json({ success: true, message: 'Testimonial approved' });
  } catch (err) {
    next(err);
  }
};

const rejectTestimonial = async (req, res, next) => {
  try {
    const { id } = req.params;
    await query(
      `UPDATE testimonials SET status = 'rejected', rejected_at = NOW() WHERE id = $1`,
      [id],
    );
    res.json({ success: true, message: 'Testimonial rejected' });
  } catch (err) {
    next(err);
  }
};

const deleteTestimonial = async (req, res, next) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM testimonials WHERE id = $1', [id]);
    res.json({ success: true, message: 'Testimonial deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listTestimonials,
  approveTestimonial,
  rejectTestimonial,
  deleteTestimonial,
};
