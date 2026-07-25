const { query } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

const getReports = async (req, res, next) => {
  try {
    const { projectId, reportType, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (projectId) { conditions.push(`project_id = $${idx++}`); params.push(projectId); }
    if (reportType) { conditions.push(`report_type = $${idx++}`); params.push(reportType); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);

    const result = await query(
      `SELECT r.*, u.first_name || ' ' || u.last_name as created_by_name, p.name as project_name
       FROM reports r LEFT JOIN users u ON r.created_by = u.id LEFT JOIN projects p ON r.project_id = p.id
       ${where} ORDER BY r.created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      params
    );

    res.json({ success: true, data: { reports: result.rows } });
  } catch (err) {
    next(err);
  }
};

const getReportById = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT r.*, u.first_name || ' ' || u.last_name as created_by_name FROM reports r
       LEFT JOIN users u ON r.created_by = u.id WHERE r.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) throw new AppError('Report not found', 404);
    res.json({ success: true, data: { report: result.rows[0] } });
  } catch (err) {
    next(err);
  }
};

const createReport = async (req, res, next) => {
  try {
    const { projectId, title, reportType, content, summary, status } = req.body;
    if (!title || !reportType) throw new AppError('Title and reportType are required', 400);

    const result = await query(
      `INSERT INTO reports (project_id, created_by, title, report_type, content, summary, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [projectId, req.user.id, title, reportType, JSON.stringify(content || {}), summary, status || 'draft']
    );

    res.status(201).json({ success: true, data: { report: result.rows[0] } });
  } catch (err) {
    next(err);
  }
};

const updateReport = async (req, res, next) => {
  try {
    const { title, content, summary, status } = req.body;
    const result = await query(
      `UPDATE reports SET title = COALESCE($1, title), content = COALESCE($2, content),
       summary = COALESCE($3, summary), status = COALESCE($4, status), updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [title, content ? JSON.stringify(content) : null, summary, status, req.params.id]
    );

    if (result.rows.length === 0) throw new AppError('Report not found', 404);
    res.json({ success: true, data: { report: result.rows[0] } });
  } catch (err) {
    next(err);
  }
};

const deleteReport = async (req, res, next) => {
  try {
    const result = await query('DELETE FROM reports WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) throw new AppError('Report not found', 404);
    res.json({ success: true, message: 'Report deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getReports, getReportById, createReport, updateReport, deleteReport };
