const { query } = require('../config/database');

const getProjectAnalytics = async (req, res, next) => {
  try {
    const projectStats = await query(`
      SELECT status, COUNT(*) as count, COALESCE(SUM(budget), 0) as total_budget,
      COALESCE(AVG(progress_percentage), 0) as avg_progress
      FROM projects GROUP BY status
    `);

    const monthlyProgress = await query(`
      SELECT DATE_FORMAT(created_at, '%Y-%m-01') as month, COUNT(*) as projects_created,
      COALESCE(AVG(progress_percentage), 0) as avg_progress
      FROM projects WHERE created_at > DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m-01') ORDER BY month
    `);

    const costAnalysis = await query(`
      SELECT p.name, p.budget, p.actual_cost,
      COALESCE((
        SELECT total_estimated_cost FROM cost_estimations
        WHERE project_id = p.id ORDER BY created_at DESC LIMIT 1
      ), 0) as estimated_cost
      FROM projects p
      WHERE p.status NOT IN ('archived') ORDER BY p.budget DESC LIMIT 10
    `);

    const riskSummary = await query(`
      SELECT risk_level, COUNT(*) as count FROM risk_predictions
      WHERE status != 'resolved' GROUP BY risk_level
    `);

    res.json({
      success: true,
      data: {
        projectStats: projectStats.rows,
        monthlyProgress: monthlyProgress.rows,
        costAnalysis: costAnalysis.rows,
        riskSummary: riskSummary.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

const getUserAnalytics = async (req, res, next) => {
  try {
    const roleDistribution = await query(`
      SELECT r.name, COUNT(u.id) as count FROM roles r
      LEFT JOIN users u ON r.id = u.role_id GROUP BY r.name
    `);

    const activityTrend = await query(`
      SELECT DATE(last_login) as date, COUNT(*) as logins
      FROM users WHERE last_login > DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(last_login) ORDER BY date
    `);

    res.json({
      success: true,
      data: { roleDistribution: roleDistribution.rows, activityTrend: activityTrend.rows },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getProjectAnalytics, getUserAnalytics };
