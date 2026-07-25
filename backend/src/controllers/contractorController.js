const { query } = require('../config/database');
const env = require('../config/env');
const { createNotification } = require('../services/notificationService');
const { AppError } = require('../middleware/errorHandler');

async function getContractorId(userId) {
  const r = await query('SELECT id FROM contractors WHERE user_id = $1', [userId]);
  return r.rows[0]?.id || null;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function parseTaskMeta(description = '') {
  const text = String(description || '');
  const requiresDocument = /\[requires[_-]?doc\]/i.test(text) || /upload (proof|document|photo)/i.test(text);
  const requiresPhoto = /\[requires[_-]?photo\]/i.test(text) || /(damage|disaster|safety).*photo/i.test(text)
    || /photo required/i.test(text);
  return { requiresDocument, requiresPhoto };
}

async function recalcProjectProgress(projectId) {
  const avg = await query(
    `SELECT COALESCE(AVG(progress_percentage), 0) as avg_p FROM project_tasks WHERE project_id = $1 AND status != 'cancelled'`,
    [projectId],
  );
  const pct = Math.min(100, Math.round(parseFloat(avg.rows[0]?.avg_p || 0)));
  await query('UPDATE projects SET progress_percentage = $1, updated_at = NOW() WHERE id = $2', [pct, projectId]);
  return pct;
}

function getWeekBounds(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const sun = new Date(d);
  sun.setDate(d.getDate() - d.getDay());
  const sat = new Date(sun);
  sat.setDate(sun.getDate() + 6);
  const fmt = (x) => x.toISOString().slice(0, 10);
  return { start: fmt(sun), end: fmt(sat) };
}

async function loadTaskDailyLogs(taskIds) {
  if (!taskIds.length) return {};
  const placeholders = taskIds.map((_, i) => `$${i + 1}`).join(',');
  const result = await query(
    `SELECT task_id, description FROM progress_updates
     WHERE task_id IN (${placeholders}) AND description LIKE 'Daily update (%'`,
    taskIds,
  );
  const map = {};
  for (const row of result.rows) {
    const m = String(row.description || '').match(/^Daily update \((\d{4}-\d{2}-\d{2})\):/);
    if (!m) continue;
    const tid = row.task_id;
    if (!map[tid]) map[tid] = [];
    if (!map[tid].includes(m[1])) map[tid].push(m[1]);
  }
  return map;
}

const getMyTasks = async (req, res, next) => {
  try {
    const contractorId = await getContractorId(req.user.id);
    if (!contractorId) {
      return res.json({ success: true, data: { tasks: [] } });
    }

    const result = await query(
      `SELECT pt.*, p.name as project_name, p.id as project_id
       FROM project_tasks pt
       JOIN projects p ON pt.project_id = p.id
       JOIN assignments a ON a.project_id = p.id AND a.contractor_id = $1 AND a.status = 'active'
       WHERE pt.status != 'completed' AND pt.status != 'cancelled'
       ORDER BY pt.start_date ASC, pt.end_date ASC, pt.created_at ASC`,
      [contractorId],
    );

    const today = todayStr();
    const { start: weekStart, end: weekEnd } = getWeekBounds();
    const dailyByTask = await loadTaskDailyLogs(result.rows.map((t) => t.id));

    const tasks = result.rows.map((t) => {
      const meta = parseTaskMeta(t.description);
      const startOk = !t.start_date || String(t.start_date).slice(0, 10) <= today;
      const endStr = t.end_date ? String(t.end_date).slice(0, 10) : null;
      const isOverdue = !!endStr && endStr < today;
      return {
        id: t.id,
        projectId: t.project_id,
        projectName: t.project_name,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        startDate: t.start_date,
        endDate: t.end_date,
        progressPercentage: parseFloat(t.progress_percentage) || 0,
        assignedTo: t.assigned_to,
        canComplete: startOk,
        isOverdue,
        overdueFlag: isOverdue ? 'AI flagged: deadline passed — not completed' : null,
        startsOn: t.start_date,
        weekStart,
        weekEnd,
        dailyLogDates: dailyByTask[t.id] || [],
        submittedToday: (dailyByTask[t.id] || []).includes(today),
        ...meta,
      };
    });

    const overdue = tasks.filter((t) => t.isOverdue);

    res.json({ success: true, data: { tasks, overdue } });
  } catch (err) {
    next(err);
  }
};

const completeTask = async (req, res, next) => {
  try {
    const contractorId = await getContractorId(req.user.id);
    if (!contractorId) throw new AppError('Contractor profile not found', 404);

    const { taskId } = req.params;
    const {
      workCompleted, hoursWorked, workersCount, weatherConditions,
      documentName, materialsUsed,
    } = req.body;

    if (!workCompleted || String(workCompleted).trim().length < 10) {
      throw new AppError('Describe work completed (at least 10 characters)', 400);
    }

    const taskResult = await query(
      `SELECT pt.*, p.name as project_name, p.created_by
       FROM project_tasks pt
       JOIN projects p ON pt.project_id = p.id
       JOIN assignments a ON a.project_id = p.id AND a.contractor_id = $1 AND a.status = 'active'
       WHERE pt.id = $2`,
      [contractorId, taskId],
    );
    if (!taskResult.rows.length) throw new AppError('Task not found or not on your assignment', 404);
    const task = taskResult.rows[0];
    const meta = parseTaskMeta(task.description);

    const today = todayStr();
    if (task.start_date && String(task.start_date).slice(0, 10) > today) {
      throw new AppError('This task cannot be completed before its scheduled start date', 403);
    }
    if (meta.requiresDocument && !documentName) {
      throw new AppError('This task requires an uploaded document — attach a file', 400);
    }

    const materialsJson = Array.isArray(materialsUsed) ? materialsUsed : [];
    const workBlock = `${workCompleted}${documentName ? `\n[Document: ${documentName}]` : ''}`;

    await query(
      `UPDATE project_tasks SET status = 'completed', progress_percentage = 100, actual_hours = COALESCE($1, actual_hours), updated_at = NOW()
       WHERE id = $2`,
      [hoursWorked || null, taskId],
    );

    const projectPct = await recalcProjectProgress(task.project_id);

    const progressResult = await query(
      `INSERT INTO progress_updates (project_id, task_id, reported_by, progress_percentage, description,
       work_completed, hours_worked, workers_count, weather_conditions, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'submitted') RETURNING *`,
      [
        task.project_id,
        taskId,
        req.user.id,
        projectPct,
        `Task completed: ${task.title}`,
        workBlock,
        hoursWorked || null,
        workersCount || null,
        weatherConditions || null,
      ],
    );

    await query(
      `INSERT INTO daily_logs (project_id, contractor_id, logged_by, log_date, work_summary, materials_used, workers_on_site)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        task.project_id,
        contractorId,
        req.user.id,
        today,
        `Task: ${task.title} — ${workCompleted.slice(0, 500)}`,
        JSON.stringify(materialsJson),
        workersCount || 0,
      ],
    );

    if (task.created_by) {
      await createNotification({
        userId: task.created_by,
        title: 'Task completed',
        message: `${task.title} marked complete on ${task.project_name}`,
        type: 'success',
        referenceType: 'progress',
        referenceId: progressResult.rows[0].id,
      });
    }

    res.json({
      success: true,
      data: {
        task: { id: taskId, status: 'completed' },
        projectProgress: projectPct,
        progressUpdate: progressResult.rows[0],
      },
    });
  } catch (err) {
    next(err);
  }
};

const submitDailyTaskUpdate = async (req, res, next) => {
  try {
    const contractorId = await getContractorId(req.user.id);
    if (!contractorId) throw new AppError('Contractor profile not found', 404);

    const { taskId } = req.params;
    const {
      workCompleted, hoursWorked, workersCount, weatherConditions,
      documentName, materialsUsed, logDate,
    } = req.body;

    if (!workCompleted || String(workCompleted).trim().length < 10) {
      throw new AppError('Describe today\'s work (at least 10 characters)', 400);
    }

    const taskResult = await query(
      `SELECT pt.*, p.name as project_name, p.created_by
       FROM project_tasks pt
       JOIN projects p ON pt.project_id = p.id
       JOIN assignments a ON a.project_id = p.id AND a.contractor_id = $1 AND a.status = 'active'
       WHERE pt.id = $2 AND pt.status != 'completed' AND pt.status != 'cancelled'`,
      [contractorId, taskId],
    );
    if (!taskResult.rows.length) throw new AppError('Task not found or not on your assignment', 404);
    const task = taskResult.rows[0];

    const entryDate = (logDate && String(logDate).slice(0, 10)) || todayStr();
    const startStr = task.start_date ? String(task.start_date).slice(0, 10) : null;
    const endStr = task.end_date ? String(task.end_date).slice(0, 10) : null;
    if (startStr && entryDate < startStr) {
      throw new AppError('Daily log cannot be before task start date', 403);
    }
    if (endStr && entryDate > endStr) {
      throw new AppError('Daily log cannot be after task end date', 403);
    }

    const dup = await query(
      `SELECT id FROM progress_updates WHERE task_id = $1 AND description = $2 LIMIT 1`,
      [taskId, `Daily update (${entryDate}): ${task.title}`],
    );
    if (dup.rows.length) {
      throw new AppError('You already submitted a daily update for this task on this date', 409);
    }

    const materialsJson = Array.isArray(materialsUsed) ? materialsUsed : [];
    const workBlock = `${workCompleted}${documentName ? `\n[Document: ${documentName}]` : ''}`;

    const start = startStr || entryDate;
    const end = endStr || entryDate;
    const totalDays = Math.max(1, Math.ceil((new Date(end) - new Date(start)) / (86400000)) + 1);
    const dayIndex = Math.max(1, Math.ceil((new Date(entryDate) - new Date(start)) / (86400000)) + 1);
    const taskPct = Math.min(99, Math.round((dayIndex / totalDays) * 100));

    await query(
      `UPDATE project_tasks SET progress_percentage = GREATEST(progress_percentage, $1), status = 'in_progress', updated_at = NOW()
       WHERE id = $2`,
      [taskPct, taskId],
    );

    const projectPct = await recalcProjectProgress(task.project_id);

    const progressResult = await query(
      `INSERT INTO progress_updates (project_id, task_id, reported_by, progress_percentage, description,
       work_completed, hours_worked, workers_count, weather_conditions, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'daily') RETURNING *`,
      [
        task.project_id,
        taskId,
        req.user.id,
        taskPct,
        `Daily update (${entryDate}): ${task.title}`,
        workBlock,
        hoursWorked || null,
        workersCount || null,
        weatherConditions || null,
      ],
    );

    await query(
      `INSERT INTO daily_logs (project_id, contractor_id, logged_by, log_date, work_summary, materials_used, workers_on_site, weather)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        task.project_id,
        contractorId,
        req.user.id,
        entryDate,
        `[${task.title}] ${workCompleted.slice(0, 500)}`,
        JSON.stringify(materialsJson),
        workersCount || 0,
        weatherConditions || null,
      ],
    );

    if (task.created_by) {
      await createNotification({
        userId: task.created_by,
        title: 'Daily task update',
        message: `${task.title} — daily log for ${entryDate} on ${task.project_name}`,
        type: 'info',
        referenceType: 'progress',
        referenceId: progressResult.rows[0].id,
      });
    }

    res.json({
      success: true,
      data: {
        task: { id: taskId, progressPercentage: taskPct, status: 'in_progress' },
        projectProgress: projectPct,
        logDate: entryDate,
      },
    });
  } catch (err) {
    next(err);
  }
};

const getMessageRecipients = async (req, res, next) => {
  try {
    const contractorId = await getContractorId(req.user.id);
    if (!contractorId) {
      return res.json({ success: true, data: { recipients: [] } });
    }

    const result = await query(
      `SELECT DISTINCT u.id, u.first_name, u.last_name, u.email, p.name as project_name
       FROM assignments a
       JOIN projects p ON p.id = a.project_id
       JOIN users u ON u.id = p.created_by
       WHERE a.contractor_id = $1 AND a.status = 'active'`,
      [contractorId],
    );

    res.json({
      success: true,
      data: {
        recipients: result.rows.map((r) => ({
          id: r.id,
          firstName: r.first_name,
          lastName: r.last_name,
          email: r.email,
          projectName: r.project_name,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

const updateContractorProfile = async (req, res, next) => {
  try {
    const {
      specialty, licenseNumber, experienceYears, hourlyRate, availability, bio,
    } = req.body;

    const contractorId = await getContractorId(req.user.id);
    if (!contractorId) throw new AppError('Contractor profile not found', 404);

    await query(
      `UPDATE contractors SET
        specialty = COALESCE($1, specialty),
        license_number = COALESCE($2, license_number),
        experience_years = COALESCE($3, experience_years),
        hourly_rate = COALESCE($4, hourly_rate),
        availability = COALESCE($5, availability),
        bio = COALESCE($6, bio),
        updated_at = NOW()
       WHERE id = $7`,
      [specialty, licenseNumber, experienceYears, hourlyRate, availability, bio, contractorId],
    );

    const result = await query('SELECT c.* FROM contractors c WHERE c.user_id = $1', [req.user.id]);
    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        contractor: row ? {
          specialty: row.specialty,
          licenseNumber: row.license_number,
          experienceYears: row.experience_years,
          hourlyRate: parseFloat(row.hourly_rate) || 0,
          rating: parseFloat(row.rating) || 0,
          availability: row.availability,
          bio: row.bio,
          companyName: env.appName,
        } : null,
      },
    });
  } catch (err) {
    next(err);
  }
};

const getContractorReports = async (req, res, next) => {
  try {
    const contractorId = await getContractorId(req.user.id);
    if (!contractorId) {
      return res.json({ success: true, data: { projects: [] } });
    }

    const projects = await query(
      `SELECT p.* FROM projects p
       JOIN assignments a ON a.project_id = p.id
       WHERE a.contractor_id = $1 AND a.status = 'active'`,
      [contractorId],
    );

    const summaries = [];
    for (const p of projects.rows) {
      const [tasks, materials, issues, logs, taskRows, logMaterials] = await Promise.all([
        query('SELECT status, COUNT(*) as c FROM project_tasks WHERE project_id = $1 GROUP BY status', [p.id]),
        query(`SELECT status, COALESCE(SUM(total_cost), 0) as total FROM materials WHERE project_id = $1 GROUP BY status`, [p.id]),
        query(`SELECT status, COUNT(*) as c FROM issue_reports WHERE project_id = $1 GROUP BY status`, [p.id]),
        query('SELECT COUNT(*) as c FROM daily_logs WHERE project_id = $1 AND contractor_id = $2', [p.id, contractorId]),
        query(
          `SELECT title, progress_percentage, status, end_date FROM project_tasks
           WHERE project_id = $1 ORDER BY start_date ASC LIMIT 8`, [p.id],
        ),
        query(
          `SELECT materials_used FROM daily_logs WHERE project_id = $1 AND contractor_id = $2 ORDER BY log_date DESC LIMIT 14`,
          [p.id, contractorId],
        ),
      ]);

      const today = todayStr();
      const scheduleChart = taskRows.rows.map((t) => ({
        label: (t.title || '').slice(0, 14),
        planned: 100,
        actual: t.status === 'completed' ? 100 : parseFloat(t.progress_percentage) || 0,
        overdue: t.end_date && String(t.end_date).slice(0, 10) < today && t.status !== 'completed',
      }));

      const usedMap = {};
      logMaterials.rows.forEach((row) => {
        let arr = row.materials_used;
        if (typeof arr === 'string') {
          try { arr = JSON.parse(arr); } catch { arr = []; }
        }
        (arr || []).forEach((m) => {
          const k = m.name || m.material || 'Other';
          usedMap[k] = (usedMap[k] || 0) + (Number(m.quantity) || 0);
        });
      });
      const materialChart = Object.entries(usedMap).slice(0, 8).map(([name, qty]) => ({
        name: name.slice(0, 12),
        used: qty,
      }));

      summaries.push({
        projectId: p.id,
        projectName: p.name,
        progressPercentage: parseFloat(p.progress_percentage) || 0,
        taskStats: tasks.rows,
        materialTotals: materials.rows,
        issueStats: issues.rows,
        workLogCount: +(logs.rows[0]?.c ?? logs.rows[0]?.['COUNT(*)'] ?? 0),
        scheduleChart,
        materialChart,
      });
    }

    res.json({ success: true, data: { projects: summaries } });
  } catch (err) {
    next(err);
  }
};

const getProjectTasks = async (req, res, next) => {
  try {
    const contractorId = await getContractorId(req.user.id);
    if (!contractorId) throw new AppError('Not a contractor', 403);
    const { projectId } = req.params;
    const assign = await query(
      'SELECT 1 FROM assignments WHERE contractor_id = $1 AND project_id = $2 AND status = $3',
      [contractorId, projectId, 'active'],
    );
    if (!assign.rows.length) throw new AppError('Project not assigned', 403);
    const result = await query(
      `SELECT * FROM project_tasks WHERE project_id = $1 ORDER BY start_date ASC`,
      [projectId],
    );
    res.json({ success: true, data: { tasks: result.rows } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyTasks,
  completeTask,
  submitDailyTaskUpdate,
  getMessageRecipients,
  updateContractorProfile,
  getContractorReports,
  getProjectTasks,
};
