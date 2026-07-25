const { query } = require('../config/database');
const aiService = require('../services/aiService');
const { AppError } = require('../middleware/errorHandler');

function addDays(dateStr, days) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function addWeeks(dateStr, weeks) {
  return addDays(dateStr, (weeks || 0) * 7);
}

const generateSchedule = async (req, res, next) => {
  try {
    const { projectId, startDate, endDate, tasks, teamSize } = req.body;

    let projectName = 'Construction Project';
    if (projectId) {
      const project = await query('SELECT name, start_date, end_date FROM projects WHERE id = $1', [projectId]);
      if (project.rows[0]) {
        projectName = project.rows[0].name;
        if (!startDate) req.body.startDate = project.rows[0].start_date;
        if (!endDate) req.body.endDate = project.rows[0].end_date;
      }
    }

    let taskList = tasks;
    if (!taskList && projectId) {
      const dbTasks = await query('SELECT title, start_date, end_date, status FROM project_tasks WHERE project_id = $1', [projectId]);
      taskList = dbTasks.rows.map((t) => t.title);
    }

    const aiResult = await aiService.generateSchedule({
      projectName,
      startDate: startDate || req.body.startDate,
      endDate: endDate || req.body.endDate,
      tasks: taskList,
      teamSize,
    });

    const projectStart = startDate || req.body.startDate;
    const projectEnd = endDate || req.body.endDate;

    if (projectId && aiResult.schedule.phases) {
      for (const phase of aiResult.schedule.phases) {
        const phaseStart = phase.startDate || addWeeks(projectStart, phase.startWeek || 0);
        const phaseEnd = phase.endDate || addWeeks(projectStart, (phase.startWeek || 0) + (phase.durationWeeks || 4));
        for (const taskTitle of phase.tasks || []) {
          const exists = await query(
            'SELECT id FROM project_tasks WHERE project_id = $1 AND title = $2',
            [projectId, taskTitle]
          );
          if (exists.rows.length === 0) {
            await query(
              `INSERT INTO project_tasks (project_id, title, start_date, end_date, created_by, status, description)
               VALUES ($1, $2, $3, $4, $5, 'pending', $6)`,
              [
                projectId,
                taskTitle,
                phaseStart || projectStart || null,
                phaseEnd || projectEnd || null,
                req.user.id,
                `Phase: ${phase.name || 'Construction'}`,
              ]
            );
          }
        }
      }
    }

    res.json({
      success: true,
      data: {
        schedule: aiResult.schedule,
        mock: aiResult.mock,
        saved: !!projectId,
        message: projectId ? 'Schedule generated and tasks saved to project' : 'Schedule generated',
      },
    });
  } catch (err) {
    next(err);
  }
};

const getProjectTasks = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT pt.*, CONCAT(u.first_name, ' ', u.last_name) as assigned_to_name
       FROM project_tasks pt LEFT JOIN users u ON pt.assigned_to = u.id
       WHERE pt.project_id = $1 ORDER BY pt.start_date, pt.created_at`,
      [req.params.projectId]
    );
    res.json({ success: true, data: { tasks: result.rows } });
  } catch (err) {
    next(err);
  }
};

const createTask = async (req, res, next) => {
  try {
    const { title, description, status, priority, startDate, endDate, assignedTo, estimatedHours } = req.body;
    if (!title) throw new AppError('Task title is required', 400);

    const result = await query(
      `INSERT INTO project_tasks (project_id, title, description, status, priority, start_date, end_date, assigned_to, estimated_hours, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [req.params.projectId, title, description, status || 'pending', priority || 'medium',
       startDate, endDate, assignedTo, estimatedHours, req.user.id]
    );

    res.status(201).json({ success: true, data: { task: result.rows[0] } });
  } catch (err) {
    next(err);
  }
};

const updateTask = async (req, res, next) => {
  try {
    const fields = {
      title: 'title', description: 'description', status: 'status', priority: 'priority',
      startDate: 'start_date', endDate: 'end_date', assignedTo: 'assigned_to',
      estimatedHours: 'estimated_hours', progressPercentage: 'progress_percentage',
    };
    const updates = [];
    const params = [];
    let idx = 1;

    for (const [key, dbField] of Object.entries(fields)) {
      if (req.body[key] !== undefined) {
        updates.push(`${dbField} = $${idx++}`);
        params.push(req.body[key]);
      }
    }

    if (updates.length === 0) throw new AppError('No fields to update', 400);
    updates.push('updated_at = NOW()');
    params.push(req.params.taskId);

    const result = await query(
      `UPDATE project_tasks SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    if (result.rows.length === 0) throw new AppError('Task not found', 404);
    res.json({ success: true, data: { task: result.rows[0] } });
  } catch (err) {
    next(err);
  }
};

const deleteTask = async (req, res, next) => {
  try {
    const result = await query('DELETE FROM project_tasks WHERE id = $1 RETURNING id', [req.params.taskId]);
    if (result.rows.length === 0) throw new AppError('Task not found', 404);
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (err) {
    next(err);
  }
};

const getBlueprints = async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM blueprints WHERE project_id = $1 ORDER BY created_at DESC',
      [req.params.projectId]
    );
    res.json({ success: true, data: { blueprints: result.rows } });
  } catch (err) {
    next(err);
  }
};

const createBlueprint = async (req, res, next) => {
  try {
    const { name, blueprintType, version, description, buildingDesignId } = req.body;
    if (!name) throw new AppError('Blueprint name is required', 400);

    const result = await query(
      `INSERT INTO blueprints (project_id, building_design_id, created_by, name, blueprint_type, version, description, file_path)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        req.params.projectId, buildingDesignId, req.user.id, name,
        blueprintType || 'general', version || '1.0', description,
        req.file?.path || null,
      ]
    );

    res.status(201).json({ success: true, data: { blueprint: result.rows[0] } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  generateSchedule, getProjectTasks, createTask, updateTask, deleteTask, getBlueprints, createBlueprint,
};
