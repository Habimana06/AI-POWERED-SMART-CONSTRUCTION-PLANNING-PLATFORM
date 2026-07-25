const { query } = require('../config/database');
const { createNotification } = require('../services/notificationService');
const { AppError } = require('../middleware/errorHandler');

const getProgressUpdates = async (req, res, next) => {
  try {
    const { projectId } = req.query;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (projectId) { conditions.push(`project_id = $${idx++}`); params.push(projectId); }
    if (req.user.role === 'contractor') {
      conditions.push(`reported_by = $${idx++}`);
      params.push(req.user.id);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(
      `SELECT pu.*, u.first_name || ' ' || u.last_name as reported_by_name, p.name as project_name
       FROM progress_updates pu
       JOIN users u ON pu.reported_by = u.id
       JOIN projects p ON pu.project_id = p.id
       ${where} ORDER BY pu.created_at DESC`,
      params
    );

    res.json({ success: true, data: { progressUpdates: result.rows } });
  } catch (err) {
    next(err);
  }
};

const submitProgress = async (req, res, next) => {
  try {
    const {
      projectId, taskId, progressPercentage, description, workCompleted,
      workPlanned, hoursWorked, workersCount, weatherConditions,
    } = req.body;

    if (!projectId) throw new AppError('Project ID is required', 400);

    const result = await query(
      `INSERT INTO progress_updates (project_id, task_id, reported_by, progress_percentage, description,
       work_completed, work_planned, hours_worked, workers_count, weather_conditions, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'submitted') RETURNING *`,
      [projectId, taskId, req.user.id, progressPercentage, description,
       workCompleted, workPlanned, hoursWorked, workersCount, weatherConditions]
    );

    if (progressPercentage) {
      await query(
        'UPDATE projects SET progress_percentage = $1, updated_at = NOW() WHERE id = $2',
        [progressPercentage, projectId]
      );
    }

    const project = await query('SELECT created_by, name FROM projects WHERE id = $1', [projectId]);
    if (project.rows[0]?.created_by) {
      await createNotification({
        userId: project.rows[0].created_by,
        title: 'Progress Update',
        message: `New progress update submitted for ${project.rows[0].name}`,
        type: 'info',
        referenceType: 'progress',
        referenceId: result.rows[0].id,
      });
    }

    res.status(201).json({ success: true, data: { progressUpdate: result.rows[0] } });
  } catch (err) {
    next(err);
  }
};

const getDailyLogs = async (req, res, next) => {
  try {
    const { projectId, date } = req.query;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (projectId) { conditions.push(`dl.project_id = $${idx++}`); params.push(projectId); }
    if (date) { conditions.push(`dl.log_date = $${idx++}`); params.push(date); }
    if (req.user.role === 'contractor') {
      conditions.push(`dl.logged_by = $${idx++}`);
      params.push(req.user.id);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(
      `SELECT dl.*, p.name as project_name FROM daily_logs dl
       JOIN projects p ON dl.project_id = p.id ${where} ORDER BY dl.log_date DESC`,
      params
    );

    res.json({ success: true, data: { dailyLogs: result.rows } });
  } catch (err) {
    next(err);
  }
};

const createDailyLog = async (req, res, next) => {
  try {
    const {
      projectId, logDate, weather, temperature, workersOnSite,
      workSummary, issuesEncountered, safetyIncidents, equipmentUsed, materialsUsed,
    } = req.body;

    if (!projectId) throw new AppError('Project ID is required', 400);

    const contractor = await query('SELECT id FROM contractors WHERE user_id = $1', [req.user.id]);

    const result = await query(
      `INSERT INTO daily_logs (project_id, contractor_id, logged_by, log_date, weather, temperature,
       workers_on_site, work_summary, issues_encountered, safety_incidents, equipment_used, materials_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        projectId, contractor.rows[0]?.id, req.user.id, logDate || new Date().toISOString().split('T')[0],
        weather, temperature, workersOnSite, workSummary, issuesEncountered, safetyIncidents,
        JSON.stringify(equipmentUsed || []), JSON.stringify(materialsUsed || []),
      ]
    );

    res.status(201).json({ success: true, data: { dailyLog: result.rows[0] } });
  } catch (err) {
    next(err);
  }
};

module.exports = { getProgressUpdates, submitProgress, getDailyLogs, createDailyLog };
