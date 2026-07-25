const os = require('os');
const { pool, query } = require('../config/database');
const env = require('../config/env');
const { AppError } = require('../middleware/errorHandler');

const getDashboardStats = async (req, res, next) => {
  try {
    const [users, projects, companies, reports, issues, auditLogs] = await Promise.all([
      query(`SELECT COUNT(*) as total,
             COUNT(*) FILTER (WHERE is_active = true) as active,
             COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_users
             FROM users`),
      query(`SELECT COUNT(*) as total,
             COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
             COUNT(*) FILTER (WHERE approval_status = 'pending') as pending,
             COALESCE(SUM(budget), 0) as total_budget
             FROM projects`),
      query('SELECT COUNT(*) as total FROM companies WHERE status = $1', ['active']),
      query('SELECT COUNT(*) as total FROM reports'),
      query(`SELECT COUNT(*) as total,
             COUNT(*) FILTER (WHERE status = 'open') as open_issues
             FROM issue_reports`),
      query('SELECT COUNT(*) as total FROM audit_logs WHERE created_at > NOW() - INTERVAL \'24 hours\''),
    ]);

    const usersByRole = await query(
      `SELECT r.name, COUNT(u.id) as count FROM roles r LEFT JOIN users u ON r.id = u.role_id GROUP BY r.name`
    );

    const recentActivity = await query(
      `SELECT al.*, u.email FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC LIMIT 10`
    );

    const projectChartResult = await query(
      `SELECT status as name, COUNT(*) as count FROM projects GROUP BY status ORDER BY count DESC`
    );

    const revenueChartResult = await query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') as monthKey, MONTH(created_at) as monthNum, COALESCE(SUM(budget), 0) as revenue
       FROM projects
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
       GROUP BY monthKey, monthNum
       ORDER BY monthKey ASC`
    );

    const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const activityTrend = await query(
      `SELECT DATE(created_at) AS day, COUNT(*) AS count FROM audit_logs
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
       GROUP BY day ORDER BY day ASC`,
    );

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers: +users.rows[0].total,
          activeUsers: +users.rows[0].active,
          newUsersThisMonth: +users.rows[0].new_users,
          activeProjects: +projects.rows[0].in_progress,
          pendingProjects: +projects.rows[0].pending,
          totalProjects: +projects.rows[0].total,
          totalCompanies: +companies.rows[0].total,
          totalBudget: parseFloat(projects.rows[0].total_budget),
          totalRevenue: parseFloat(projects.rows[0].total_budget),
          openIssues: +issues.rows[0].open_issues,
          users: {
            total: +users.rows[0].total,
            active: +users.rows[0].active,
            newThisMonth: +users.rows[0].new_users,
            byRole: usersByRole.rows,
          },
          projects: {
            total: +projects.rows[0].total,
            inProgress: +projects.rows[0].in_progress,
            pendingApproval: +projects.rows[0].pending,
            totalBudget: parseFloat(projects.rows[0].total_budget),
          },
          companies: { total: +companies.rows[0].total },
          reports: { total: +reports.rows[0].total },
          issues: { total: +issues.rows[0].total, open: +issues.rows[0].open_issues },
          auditLogsToday: +auditLogs.rows[0].total,
        },
        projectChart: projectChartResult.rows.map((r) => ({ name: r.name, count: +r.count })),
        revenueChart: revenueChartResult.rows.map((r) => ({
          month: MONTH_LABELS[(r.monthNum || 1) - 1] || r.monthKey,
          revenue: parseFloat(r.revenue),
        })),
        recentActivity: recentActivity.rows,
        activityTrend: activityTrend.rows.map((r) => ({
          day: String(r.day).slice(0, 10),
          events: +(r.count || 0),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

const getAuditUserSummaries = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id, u.first_name, u.last_name, u.email, r.name AS role,
              COUNT(al.id) AS event_count,
              MAX(al.created_at) AS last_activity
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN audit_logs al ON al.user_id = u.id
       GROUP BY u.id, u.first_name, u.last_name, u.email, r.name
       ORDER BY last_activity DESC, u.last_name, u.first_name`,
    );
    res.json({
      success: true,
      data: {
        users: result.rows.map((row) => ({
          id: row.id,
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          role: row.role,
          eventCount: +(row.event_count || 0),
          lastActivity: row.last_activity,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

const getAuditLogById = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT al.*, u.email, u.first_name, u.last_name FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id WHERE al.id = $1`,
      [req.params.id],
    );
    if (!result.rows.length) throw new AppError('Audit log not found', 404);
    res.json({ success: true, data: { log: result.rows[0] } });
  } catch (err) {
    next(err);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, action, entityType, userId, fromDate, toDate } = req.query;
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (action) { conditions.push(`al.action = $${idx++}`); params.push(action); }
    if (entityType) { conditions.push(`al.entity_type = $${idx++}`); params.push(entityType); }
    if (userId) { conditions.push(`al.user_id = $${idx++}`); params.push(userId); }
    if (fromDate) {
      conditions.push(`DATE(al.created_at) >= $${idx++}`);
      params.push(fromDate);
    }
    if (toDate) {
      conditions.push(`DATE(al.created_at) <= $${idx++}`);
      params.push(toDate);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countParams = [...params];
    const limitIdx = idx;
    params.push(limit, offset);

    const [countResult, result] = await Promise.all([
      query(`SELECT COUNT(*) as total FROM audit_logs al ${where}`, countParams),
      query(
        `SELECT al.*, u.email, u.first_name, u.last_name FROM audit_logs al
         LEFT JOIN users u ON al.user_id = u.id ${where}
         ORDER BY al.created_at DESC LIMIT $${limitIdx} OFFSET $${limitIdx + 1}`,
        params,
      ),
    ]);

    const total = +(countResult.rows[0]?.total ?? countResult.rows[0]?.['COUNT(*)'] ?? 0);

    res.json({
      success: true,
      data: {
        auditLogs: result.rows,
        pagination: { page: +page, limit: +limit, total },
      },
    });
  } catch (err) {
    next(err);
  }
};

const getSettings = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM settings ORDER BY category, `key`');
    const settings = {};
    for (const row of result.rows) {
      if (!settings[row.category]) settings[row.category] = {};
      settings[row.category][row.key] = { value: row.value, description: row.description, updatedAt: row.updated_at };
    }
    res.json({ success: true, data: { settings, raw: result.rows } });
  } catch (err) {
    next(err);
  }
};

const updateSetting = async (req, res, next) => {
  try {
    const { value } = req.body;
    if (value === undefined) throw new AppError('Value is required', 400);

    const result = await query(
      `UPDATE settings SET value = $1, updated_by = $2, updated_at = NOW() WHERE \`key\` = $3 RETURNING *`,
      [JSON.stringify(value), req.user.id, req.params.key]
    );

    if (result.rows.length === 0) {
      const created = await query(
        `INSERT INTO settings (\`key\`, value, updated_by) VALUES ($1, $2, $3) RETURNING *`,
        [req.params.key, JSON.stringify(value), req.user.id]
      );
      return res.json({ success: true, data: { setting: created.rows[0] } });
    }

    res.json({ success: true, data: { setting: result.rows[0] } });
  } catch (err) {
    next(err);
  }
};

const getSystemStatus = async (req, res, next) => {
  try {
    let dbStatus = 'healthy';
    let dbLatency = 0;
    const start = Date.now();
    try {
      await pool.query('SELECT 1');
      dbLatency = Date.now() - start;
    } catch {
      dbStatus = 'unhealthy';
    }

    res.json({
      success: true,
      data: {
        status: dbStatus === 'healthy' ? 'operational' : 'degraded',
        appName: env.appName,
        version: '1.0.0',
        environment: env.nodeEnv,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        services: {
          database: { status: dbStatus, latencyMs: dbLatency },
          ai: { status: env.groq.apiKey ? 'configured' : 'not_configured', model: env.groq.model },
          email: { status: env.smtp.user ? 'configured' : 'not_configured' },
        },
        system: {
          platform: os.platform(),
          nodeVersion: process.version,
          memoryUsage: process.memoryUsage(),
          cpuCount: os.cpus().length,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

const getMessageRecipients = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id, u.first_name, u.last_name, u.email, r.name AS role_name
       FROM users u JOIN roles r ON u.role_id = r.id
       WHERE u.is_active = true AND u.id != $1
       ORDER BY r.name, u.last_name, u.first_name`,
      [req.user.id],
    );
    res.json({
      success: true,
      data: {
        recipients: result.rows.map((row) => ({
          id: row.id,
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          role: row.role_name,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

const todayStr = () => new Date().toISOString().slice(0, 10);

const getProjectInsights = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const proj = await query('SELECT id, name, budget, progress_percentage FROM projects WHERE id = $1', [projectId]);
    if (!proj.rows.length) throw new AppError('Project not found', 404);
    const p = proj.rows[0];

    const [taskRows, matRows, logs] = await Promise.all([
      query(
        `SELECT title, progress_percentage, status, end_date FROM project_tasks
         WHERE project_id = $1 ORDER BY start_date ASC LIMIT 8`,
        [projectId],
      ),
      query(
        `SELECT status, COALESCE(SUM(total_cost), 0) AS total FROM materials WHERE project_id = $1 GROUP BY status`,
        [projectId],
      ),
      query(
        'SELECT materials_used FROM daily_logs WHERE project_id = $1 ORDER BY log_date DESC LIMIT 20',
        [projectId],
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
    logs.rows.forEach((row) => {
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

    const approved = matRows.rows.find((r) => r.status === 'approved');
    const requested = matRows.rows.find((r) => r.status === 'requested');
    const budget = parseFloat(p.budget) || 0;
    const approvedTotal = parseFloat(approved?.total) || 0;

    res.json({
      success: true,
      data: {
        scheduleChart,
        materialChart,
        incomeChart: [
          { name: 'Budget', value: budget },
          { name: 'Approved materials', value: approvedTotal },
          { name: 'Requested', value: parseFloat(requested?.total) || 0 },
        ],
        progressPercentage: parseFloat(p.progress_percentage) || 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

const getSystemReports = async (req, res, next) => {
  try {
    const end = req.query.endDate || todayStr();
    const start = req.query.startDate || (() => {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d.toISOString().slice(0, 10);
    })();

    const [summary, activityRows, projectRows, roleRows, messageRows, logRows, loginRows, issueRows] = await Promise.all([
      query(
        `SELECT
          (SELECT COUNT(*) FROM audit_logs WHERE DATE(created_at) BETWEEN $1 AND $2) AS audit_events,
          (SELECT COUNT(*) FROM projects WHERE DATE(created_at) BETWEEN $1 AND $2) AS new_projects,
          (SELECT COUNT(*) FROM messages WHERE DATE(created_at) BETWEEN $1 AND $2) AS messages_sent,
          (SELECT COUNT(*) FROM daily_logs WHERE DATE(log_date) BETWEEN $1 AND $2) AS work_logs,
          (SELECT COUNT(*) FROM users WHERE is_active = true) AS active_users,
          (SELECT COUNT(*) FROM projects WHERE status = 'in_progress') AS active_projects`,
        [start, end],
      ),
      query(
        `SELECT DATE(created_at) AS day, COUNT(*) AS count FROM audit_logs
         WHERE DATE(created_at) BETWEEN $1 AND $2 GROUP BY day ORDER BY day ASC`,
        [start, end],
      ),
      query(
        `SELECT DATE(created_at) AS day, COUNT(*) AS count FROM projects
         WHERE DATE(created_at) BETWEEN $1 AND $2 GROUP BY day ORDER BY day ASC`,
        [start, end],
      ),
      query(
        `SELECT r.name, COUNT(u.id) AS count FROM roles r LEFT JOIN users u ON r.id = u.role_id GROUP BY r.name`,
      ),
      query(
        `SELECT DATE(created_at) AS day, COUNT(*) AS count FROM messages
         WHERE DATE(created_at) BETWEEN $1 AND $2 GROUP BY day ORDER BY day ASC`,
        [start, end],
      ),
      query(
        `SELECT DATE(log_date) AS day, COUNT(*) AS count FROM daily_logs
         WHERE DATE(log_date) BETWEEN $1 AND $2 GROUP BY day ORDER BY day ASC`,
        [start, end],
      ),
      query(
        `SELECT DATE(created_at) AS day, COUNT(*) AS count FROM audit_logs
         WHERE action IN ('LOGIN', 'LOGOUT') AND DATE(created_at) BETWEEN $1 AND $2 GROUP BY day ORDER BY day ASC`,
        [start, end],
      ),
      query(
        `SELECT status, COUNT(*) AS count FROM issue_reports GROUP BY status`,
      ),
    ]);

    const s = summary.rows[0] || {};

    res.json({
      success: true,
      data: {
        range: { startDate: start, endDate: end },
        summary: {
          auditEvents: +(s.audit_events || 0),
          newProjects: +(s.new_projects || 0),
          messagesSent: +(s.messages_sent || 0),
          workLogs: +(s.work_logs || 0),
          activeUsers: +(s.active_users || 0),
          activeProjects: +(s.active_projects || 0),
        },
        activityChart: activityRows.rows.map((r) => ({
          day: String(r.day).slice(0, 10),
          events: +(r.count || 0),
        })),
        projectsChart: projectRows.rows.map((r) => ({
          day: String(r.day).slice(0, 10),
          projects: +(r.count || 0),
        })),
        usersByRole: roleRows.rows.map((r) => ({ name: r.name, count: +(r.count || 0) })),
        messagesChart: messageRows.rows.map((r) => ({
          day: String(r.day).slice(0, 10),
          messages: +(r.count || 0),
        })),
        workLogsChart: logRows.rows.map((r) => ({
          day: String(r.day).slice(0, 10),
          logs: +(r.count || 0),
        })),
        loginActivityChart: loginRows.rows.map((r) => ({
          day: String(r.day).slice(0, 10),
          logins: +(r.count || 0),
        })),
        issuesByStatus: issueRows.rows.map((r) => ({
          name: r.status || 'unknown',
          count: +(r.count || 0),
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboardStats,
  getAuditLogs,
  getAuditLogById,
  getAuditUserSummaries,
  getSettings,
  updateSetting,
  getSystemStatus,
  getMessageRecipients,
  getProjectInsights,
  getSystemReports,
};
