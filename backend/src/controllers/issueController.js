const { query } = require('../config/database');
const { createNotification } = require('../services/notificationService');
const { AppError } = require('../middleware/errorHandler');

const getIssues = async (req, res, next) => {
  try {
    const { projectId, status, severity } = req.query;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (projectId) { conditions.push(`ir.project_id = $${idx++}`); params.push(projectId); }
    if (status) { conditions.push(`ir.status = $${idx++}`); params.push(status); }
    if (severity) { conditions.push(`ir.severity = $${idx++}`); params.push(severity); }

    if (req.user.role === 'contractor') {
      if (projectId) {
        conditions.push(`ir.project_id IN (
          SELECT a.project_id FROM assignments a
          JOIN contractors c ON c.id = a.contractor_id
          WHERE c.user_id = $${idx++} AND a.status = 'active'
        )`);
        params.push(req.user.id);
      } else {
        conditions.push(`ir.reported_by = $${idx++}`);
        params.push(req.user.id);
      }
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(
      `SELECT ir.*, u.first_name || ' ' || u.last_name as reported_by_name, p.name as project_name
       FROM issue_reports ir
       JOIN users u ON ir.reported_by = u.id
       JOIN projects p ON ir.project_id = p.id
       ${where} ORDER BY ir.created_at DESC`,
      params
    );

    res.json({ success: true, data: { issues: result.rows } });
  } catch (err) {
    next(err);
  }
};

const reportIssue = async (req, res, next) => {
  try {
    const { projectId, title, description, issueType, severity, location, photos, photoDataUri } = req.body;
    if (!projectId || !title || !description) {
      throw new AppError('projectId, title, and description are required', 400);
    }

    const needsPhoto = ['damage', 'safety', 'weather'].includes(String(issueType || '').toLowerCase())
      || /disaster|collapse|injury|hazard/i.test(description);
    let photoList = photos;
    if (typeof photoList === 'string') {
      try { photoList = JSON.parse(photoList); } catch { photoList = [photoList]; }
    }
    if (photoDataUri) {
      photoList = [...(Array.isArray(photoList) ? photoList : []), { name: 'site-photo', dataUri: photoDataUri }];
    }
    if (needsPhoto && (!photoList || !photoList.length)) {
      throw new AppError('This issue type requires a site photo — upload an image', 400);
    }

    const result = await query(
      `INSERT INTO issue_reports (project_id, reported_by, title, description, issue_type, severity, location, status, photos)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', $8) RETURNING *`,
      [projectId, req.user.id, title, description, issueType, severity || 'medium', location, JSON.stringify(photoList || [])]
    );

    const project = await query('SELECT created_by, name FROM projects WHERE id = $1', [projectId]);
    if (project.rows[0]?.created_by) {
      await createNotification({
        userId: project.rows[0].created_by,
        title: 'New Issue Reported',
        message: `${severity || 'medium'} severity issue: ${title}`,
        type: severity === 'critical' || severity === 'high' ? 'warning' : 'info',
        referenceType: 'issue',
        referenceId: result.rows[0].id,
      });
    }

    res.status(201).json({ success: true, data: { issue: result.rows[0] } });
  } catch (err) {
    next(err);
  }
};

const updateIssue = async (req, res, next) => {
  try {
    const { status, assignedTo, resolution, severity } = req.body;
    const result = await query(
      `UPDATE issue_reports SET status = COALESCE($1, status), assigned_to = COALESCE($2, assigned_to),
       resolution = COALESCE($3, resolution), severity = COALESCE($4, severity),
       resolved_at = CASE WHEN $1 = 'resolved' THEN NOW() ELSE resolved_at END, updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [status, assignedTo, resolution, severity, req.params.id]
    );

    if (result.rows.length === 0) throw new AppError('Issue not found', 404);

    if (result.rows[0].reported_by) {
      await createNotification({
        userId: result.rows[0].reported_by,
        title: 'Issue Updated',
        message: `Issue "${result.rows[0].title}" status: ${result.rows[0].status}`,
        type: 'info',
        referenceType: 'issue',
        referenceId: result.rows[0].id,
      });
    }

    res.json({ success: true, data: { issue: result.rows[0] } });
  } catch (err) {
    next(err);
  }
};

module.exports = { getIssues, reportIssue, updateIssue };
