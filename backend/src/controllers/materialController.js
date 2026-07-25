const { query } = require('../config/database');
const aiService = require('../services/aiService');
const { createNotification } = require('../services/notificationService');
const { AppError } = require('../middleware/errorHandler');

const getMaterials = async (req, res, next) => {
  try {
    const { projectId, status } = req.query;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (req.user.role === 'contractor') {
      if (projectId) {
        conditions.push(`project_id = $${idx++}`);
        params.push(projectId);
        conditions.push(`requested_by = $${idx++}`);
        params.push(req.user.id);
      } else {
        conditions.push(`requested_by = $${idx++}`);
        params.push(req.user.id);
      }
    } else if (projectId) {
      conditions.push(`project_id = $${idx++}`);
      params.push(projectId);
    }
    if (status) { conditions.push(`status = $${idx++}`); params.push(status); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(`SELECT * FROM materials ${where} ORDER BY created_at DESC`, params);

    res.json({ success: true, data: { materials: result.rows } });
  } catch (err) {
    next(err);
  }
};

const requestMaterial = async (req, res, next) => {
  try {
    const {
      projectId, name, description, category, quantity, unit, unitCost, supplier, deliveryDate, notes,
      plannedQty, usedQty, aiReview,
    } = req.body;
    if (!projectId || !name || !quantity || !unit) {
      throw new AppError('projectId, name, quantity, and unit are required', 400);
    }

    const totalCost = unitCost ? quantity * unitCost : null;
    const project = await query('SELECT created_by, name FROM projects WHERE id = $1', [projectId]);

    let review = aiReview;
    if (!review) {
      review = aiService.reviewMaterialRequest({
        projectName: project.rows[0]?.name,
        materialName: name,
        quantity,
        unit,
        plannedQty,
        usedQty,
        contractorNotes: notes || description,
      });
    }

    const aiBlock = `[AI_CONTRACTOR] ${review.contractorMessage}\n[AI_PM] ${review.pmMessage}`;
    const mergedNotes = [notes, aiBlock].filter(Boolean).join('\n\n');

    const result = await query(
      `INSERT INTO materials (project_id, requested_by, name, description, category, quantity, unit, unit_cost, total_cost, supplier, delivery_date, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'requested') RETURNING *`,
      [projectId, req.user.id, name, description, category, quantity, unit, unitCost, totalCost, supplier, deliveryDate, mergedNotes]
    );

    if (project.rows[0]?.created_by) {
      await createNotification({
        userId: project.rows[0].created_by,
        title: 'Material Request',
        message: `New material request: ${name} for project ${project.rows[0].name}`,
        type: 'info',
        referenceType: 'material',
        referenceId: result.rows[0].id,
      });
    }

    res.status(201).json({ success: true, data: { material: result.rows[0], review } });
  } catch (err) {
    next(err);
  }
};

const updateMaterialStatus = async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    if (!status) throw new AppError('Status is required', 400);

    const result = await query(
      `UPDATE materials SET status = $1, notes = COALESCE($2, notes), updated_at = NOW() WHERE id = $3 RETURNING *`,
      [status, notes, req.params.id]
    );

    if (result.rows.length === 0) throw new AppError('Material not found', 404);

    if (result.rows[0].requested_by) {
      await createNotification({
        userId: result.rows[0].requested_by,
        title: 'Material Request Updated',
        message: `Your material request "${result.rows[0].name}" is now ${status}.`,
        type: status === 'approved' ? 'success' : 'info',
        referenceType: 'material',
        referenceId: result.rows[0].id,
      });
    }

    res.json({ success: true, data: { material: result.rows[0] } });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMaterials, requestMaterial, updateMaterialStatus };
