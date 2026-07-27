const path = require('path');
const fs = require('fs');
const { query } = require('../config/database');
const { formatProject } = require('../utils/tokens');
const { createNotification } = require('../services/notificationService');
const env = require('../config/env');
const { scheduleExteriorRender, generateExteriorForDesign } = require('../services/designExteriorRenderService');
const { recordAuditEvent } = require('../utils/audit');
const { AppError } = require('../middleware/errorHandler');

async function assertCanViewProject(user, projectId) {
  if (user.role === 'admin') return;
  if (user.role === 'project_manager') {
    if (user.companyId) {
      const r = await query(
        'SELECT id FROM projects WHERE id = $1 AND (created_by = $2 OR company_id = $3)',
        [projectId, user.id, user.companyId],
      );
      if (!r.rows.length) throw new AppError('Project not found', 404);
    } else {
      const r = await query('SELECT id FROM projects WHERE id = $1 AND created_by = $2', [projectId, user.id]);
      if (!r.rows.length) throw new AppError('Project not found', 404);
    }
    return;
  }
  if (user.role === 'contractor') {
    const r = await query(
      `SELECT 1 FROM assignments a
       JOIN contractors c ON a.contractor_id = c.id
       WHERE a.project_id = $1 AND c.user_id = $2 AND a.status = 'active'`,
      [projectId, user.id],
    );
    if (!r.rows.length) throw new AppError('Project not found', 404);
  }
}

const getProjects = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, approvalStatus, search } = req.query;
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (req.user.role === 'contractor') {
      conditions.push(`p.id IN (
        SELECT a.project_id FROM assignments a
        JOIN contractors c ON a.contractor_id = c.id WHERE c.user_id = $${idx++} AND a.status = 'active'
      )`);
      params.push(req.user.id);
    } else if (req.user.role === 'project_manager') {
      if (req.user.companyId) {
        conditions.push(`(p.created_by = $${idx++} OR p.company_id = $${idx++})`);
        params.push(req.user.id, req.user.companyId);
      } else {
        conditions.push(`p.created_by = $${idx++}`);
        params.push(req.user.id);
      }
    }

    if (status) { conditions.push(`p.status = $${idx++}`); params.push(status); }
    if (approvalStatus) { conditions.push(`p.approval_status = $${idx++}`); params.push(approvalStatus); }
    if (search) {
      conditions.push(`(p.name ILIKE $${idx++} OR p.project_code ILIKE $${idx++})`);
      params.push(`%${search}%`, `%${search}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countResult = await query(`SELECT COUNT(*) FROM projects p ${where}`, params);

    params.push(limit, offset);
    const result = await query(
      `SELECT p.*, CONCAT(u.first_name, ' ', u.last_name) as created_by_name
       FROM projects p LEFT JOIN users u ON p.created_by = u.id ${where}
       ORDER BY p.created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      params
    );

    const total = countResult.rows[0]?.count ?? countResult.rows[0]?.['COUNT(*)'] ?? 0;

    res.json({
      success: true,
      data: {
        projects: result.rows.map(formatProject),
        pagination: { page: +page, limit: +limit, total: +total },
      },
    });
  } catch (err) {
    next(err);
  }
};

const getProjectById = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT p.*, CONCAT(pm.first_name, ' ', pm.last_name) AS pm_full_name, pm.email AS pm_email, pm.phone AS pm_phone
       FROM projects p LEFT JOIN users pm ON p.created_by = pm.id WHERE p.id = $1`,
      [req.params.id],
    );
    if (result.rows.length === 0) throw new AppError('Project not found', 404);
    await assertCanViewProject(req.user, req.params.id);

    const [tasks, files, images, assignments, materials] = await Promise.all([
      query('SELECT * FROM project_tasks WHERE project_id = $1 ORDER BY created_at', [req.params.id]),
      query('SELECT * FROM project_files WHERE project_id = $1 ORDER BY created_at DESC', [req.params.id]),
      query('SELECT * FROM project_images WHERE project_id = $1 ORDER BY created_at DESC', [req.params.id]),
      query(`SELECT a.*, c.specialty, u.first_name, u.last_name, u.email, u.phone FROM assignments a
             JOIN contractors c ON a.contractor_id = c.id JOIN users u ON c.user_id = u.id
             WHERE a.project_id = $1`, [req.params.id]),
      query('SELECT * FROM materials WHERE project_id = $1 ORDER BY created_at DESC', [req.params.id]),
    ]);

    res.json({
      success: true,
      data: {
        project: formatProject(result.rows[0]),
        tasks: tasks.rows,
        files: files.rows,
        images: images.rows,
        assignments: assignments.rows,
        materials: materials.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

const createProject = async (req, res, next) => {
  try {
    const {
      name, description, projectCode, priority, budget, startDate, endDate,
      location, projectType, buildingType, totalAreaSqft, floors, companyId,
      aiPrompt, requirements, roofType, topType, totalWindows, facadeType,
      parkingLevels, windowStyle, amenities,
    } = req.body;

    if (!name) throw new AppError('Project name is required', 400);

    if (req.user.role === 'project_manager' && !req.user.isVerified) {
      throw new AppError('Your account must be verified by an administrator before creating projects.', 403);
    }

    const metadata = JSON.stringify({
      aiPrompt: aiPrompt || requirements || '',
      requirements: requirements || '',
      roofType: roofType || topType || 'flat',
      topType: topType || roofType || 'flat',
      totalWindows: totalWindows != null ? Number(totalWindows) : null,
      facadeType: facadeType || 'glass',
      parkingLevels: parkingLevels != null ? Number(parkingLevels) : 0,
      windowStyle: windowStyle || 'standard',
      amenities: amenities || {},
      specsLocked: true,
      createdVia: aiPrompt ? 'prompt' : 'manual',
    });

    const result = await query(
      `INSERT INTO projects (name, description, project_code, priority, budget, start_date, end_date,
       location, project_type, building_type, total_area_sqft, floors, created_by, company_id, status, approval_status, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'in_progress','approved',$15) RETURNING *`,
      [name, description, projectCode || `PRJ-${Date.now()}`, priority, budget, startDate, endDate,
       location, projectType, buildingType, totalAreaSqft, floors, req.user.id, companyId || req.user.companyId, metadata]
    );

    res.status(201).json({ success: true, data: { project: formatProject(result.rows[0]) } });
  } catch (err) {
    if (err.code === '23505') return next(new AppError('Project code already exists', 409));
    next(err);
  }
};

const updateProject = async (req, res, next) => {
  try {
    const fields = ['name', 'description', 'priority', 'budget', 'start_date', 'end_date', 'location',
      'project_type', 'building_type', 'total_area_sqft', 'floors', 'status', 'progress_percentage'];
    const mapping = {
      startDate: 'start_date', endDate: 'end_date', projectType: 'project_type',
      buildingType: 'building_type', totalAreaSqft: 'total_area_sqft', progressPercentage: 'progress_percentage',
    };

    const updates = [];
    const params = [];
    let idx = 1;

    for (const [key, value] of Object.entries(req.body)) {
      const dbField = mapping[key] || key;
      if (fields.includes(dbField) && value !== undefined) {
        updates.push(`${dbField} = $${idx++}`);
        params.push(value);
      }
    }

    if (updates.length === 0) throw new AppError('No fields to update', 400);
    updates.push('updated_at = NOW()');
    params.push(req.params.id);

    const result = await query(
      `UPDATE projects SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    if (result.rows.length === 0) throw new AppError('Project not found', 404);
    res.json({ success: true, data: { project: formatProject(result.rows[0]) } });
  } catch (err) {
    next(err);
  }
};

const deleteProject = async (req, res, next) => {
  try {
    const result = await query('DELETE FROM projects WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) throw new AppError('Project not found', 404);
    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (err) {
    next(err);
  }
};

const approveProject = async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE projects SET approval_status = 'approved', status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [req.user.id, req.params.id]
    );
    if (result.rows.length === 0) throw new AppError('Project not found', 404);

    if (result.rows[0].created_by) {
      await createNotification({
        userId: result.rows[0].created_by,
        title: 'Project Approved',
        message: `Project "${result.rows[0].name}" has been approved.`,
        type: 'success',
        referenceType: 'project',
        referenceId: result.rows[0].id,
      });
    }

    res.json({ success: true, data: { project: formatProject(result.rows[0]) } });
  } catch (err) {
    next(err);
  }
};

const archiveProject = async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE projects SET status = 'archived', archived_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) throw new AppError('Project not found', 404);
    res.json({ success: true, data: { project: formatProject(result.rows[0]) } });
  } catch (err) {
    next(err);
  }
};

const uploadProjectFile = async (req, res, next) => {
  try {
    if (!req.file) throw new AppError('No file uploaded', 400);

    const result = await query(
      `INSERT INTO project_files (project_id, uploaded_by, file_name, original_name, file_path, file_type, file_size, category, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        req.params.id, req.user.id, req.file.filename, req.file.originalname,
        req.file.path, req.file.mimetype, req.file.size,
        req.body.category || 'general', req.body.description,
      ]
    );

    res.status(201).json({ success: true, data: { file: result.rows[0] } });
  } catch (err) {
    next(err);
  }
};

const assignContractor = async (req, res, next) => {
  try {
    if (req.user.role === 'project_manager' && !req.user.isVerified) {
      throw new AppError('Your account must be verified by an administrator before assigning contractors.', 403);
    }
    const { contractorId, roleOnProject, startDate, endDate, notes } = req.body;
    if (!contractorId) throw new AppError('Contractor ID required', 400);

    const result = await query(
      `INSERT INTO assignments (project_id, contractor_id, assigned_by, role_on_project, start_date, end_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON DUPLICATE KEY UPDATE role_on_project = VALUES(role_on_project), status = 'active', updated_at = NOW()
       RETURNING *`,
      [req.params.id, contractorId, req.user.id, roleOnProject, startDate, endDate, notes]
    );

    const contractor = await query(
      'SELECT user_id FROM contractors WHERE id = $1',
      [contractorId]
    );

    if (contractor.rows[0]) {
      await createNotification({
        userId: contractor.rows[0].user_id,
        title: 'New Project Assignment',
        message: 'You have been assigned to a new project.',
        type: 'info',
        referenceType: 'project',
        referenceId: req.params.id,
      });
    }

    res.status(201).json({ success: true, data: { assignment: result.rows[0] } });
  } catch (err) {
    next(err);
  }
};

const getPmDashboard = async (req, res, next) => {
  try {
    const stats = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status NOT IN ('archived', 'completed')) as active_projects,
        COUNT(*) FILTER (WHERE approval_status = 'pending') as pending_approval,
        COALESCE(SUM(budget), 0) as total_budget,
        COALESCE(AVG(progress_percentage), 0) as avg_progress
      FROM projects WHERE created_by = $1 OR company_id = $2
    `, [req.user.id, req.user.companyId]);

    const recentProjects = await query(
      `SELECT * FROM projects WHERE created_by = $1 OR company_id = $2 ORDER BY updated_at DESC LIMIT 5`,
      [req.user.id, req.user.companyId]
    );

    const upcomingTasks = await query(
      `SELECT pt.*, p.name as project_name FROM project_tasks pt
       JOIN projects p ON pt.project_id = p.id
       WHERE p.created_by = $1 AND pt.status != 'completed'
       ORDER BY pt.end_date ASC LIMIT 10`,
      [req.user.id]
    );

    const risks = await query(
      `SELECT risk_type, risk_level, description FROM risk_predictions
       WHERE project_id IN (SELECT id FROM projects WHERE created_by = $1)
       ORDER BY created_at DESC LIMIT 5`, [req.user.id]
    );

    res.json({
      success: true,
      data: {
        stats: {
          activeProjects: +stats.rows[0].active_projects,
          pendingApproval: +stats.rows[0].pending_approval,
          totalBudget: parseFloat(stats.rows[0].total_budget),
          avgProgress: parseFloat(stats.rows[0].avg_progress).toFixed(1),
          openRisks: risks.rows.length,
        },
        projects: recentProjects.rows.map(formatProject),
        recentProjects: recentProjects.rows.map(formatProject),
        upcomingTasks: upcomingTasks.rows,
        recommendations: risks.rows.map((r) => ({
          title: r.description || r.risk_type,
          priority: r.risk_level,
        })),
        progressChart: recentProjects.rows.slice(0, 6).map((p, i) => ({
          month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][i] || `M${i + 1}`,
          planned: Math.min(100, (+p.progress_percentage || 0) + 15),
          actual: +p.progress_percentage || 0,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

const getContractorDashboard = async (req, res, next) => {
  try {
    const contractor = await query('SELECT id FROM contractors WHERE user_id = $1', [req.user.id]);
    if (contractor.rows.length === 0) {
      return res.json({ success: true, data: { stats: {}, assignedProjects: [], recentLogs: [] } });
    }

    const contractorId = contractor.rows[0].id;

    const [stats, projects, logs, issues, tasks] = await Promise.all([
      query(`SELECT COUNT(DISTINCT a.project_id) as assigned_projects,
             SUM(CASE WHEN pt.status = 'in_progress' THEN 1 ELSE 0 END) as active_tasks
             FROM assignments a LEFT JOIN project_tasks pt ON pt.assigned_to = $1 AND pt.project_id = a.project_id
             WHERE a.contractor_id = $2 AND a.status = 'active'`, [req.user.id, contractorId]),
      query(`SELECT p.* FROM projects p JOIN assignments a ON p.id = a.project_id
             WHERE a.contractor_id = $1 AND a.status = 'active' ORDER BY p.updated_at DESC`, [contractorId]),
      query(`SELECT * FROM daily_logs WHERE contractor_id = $1 ORDER BY log_date DESC LIMIT 5`, [contractorId]),
      query(`SELECT * FROM issue_reports WHERE reported_by = $1 AND status = 'open' ORDER BY created_at DESC LIMIT 5`, [req.user.id]),
      query(`SELECT pt.*, p.name as project_name FROM project_tasks pt
             JOIN projects p ON pt.project_id = p.id
             JOIN assignments a ON a.project_id = p.id AND a.contractor_id = $1
             WHERE pt.assigned_to = $2 AND pt.status != 'completed'
             ORDER BY pt.end_date ASC LIMIT 10`, [contractorId, req.user.id]),
    ]);

    const pendingMaterials = await query(
      `SELECT COUNT(*) as total FROM materials m
       JOIN projects p ON m.project_id = p.id
       JOIN assignments a ON a.project_id = p.id
       WHERE a.contractor_id = $1 AND m.status = 'requested'`, [contractorId]
    );

    const approvedMaterialTotal = await query(
      `SELECT COALESCE(SUM(m.total_cost), 0) as total FROM materials m
       JOIN assignments a ON a.project_id = m.project_id
       WHERE a.contractor_id = $1 AND m.status = 'approved'`, [contractorId]
    );

    const scheduleChart = await query(
      `SELECT pt.title, pt.start_date, pt.end_date, pt.progress_percentage, pt.status, p.name as project_name
       FROM project_tasks pt
       JOIN projects p ON p.id = pt.project_id
       JOIN assignments a ON a.project_id = p.id AND a.contractor_id = $1 AND a.status = 'active'
       ORDER BY pt.start_date ASC LIMIT 12`, [contractorId]
    );

    res.json({
      success: true,
      data: {
        stats: {
          assignedProjects: +stats.rows[0].assigned_projects,
          activeTasks: +stats.rows[0].active_tasks,
          tasksToday: tasks.rows.length,
          pendingMaterials: +(pendingMaterials.rows[0]?.total ?? pendingMaterials.rows[0]?.['COUNT(*)'] ?? 0),
          openIssues: issues.rows.length,
          approvedMaterialTotal: parseFloat(approvedMaterialTotal.rows[0]?.total || 0),
        },
        projects: projects.rows.map(formatProject),
        assignedProjects: projects.rows.map(formatProject),
        todayTasks: tasks.rows.map((t) => ({
          id: t.id,
          title: t.title,
          project: t.project_name,
          priority: t.priority,
        })),
        deadlines: tasks.rows.slice(0, 5).map((t) => ({
          id: t.id,
          title: t.title,
          date: t.end_date,
          project: t.project_name,
        })),
        recentLogs: logs.rows,
        openIssues: issues.rows,
        scheduleChart: scheduleChart.rows.map((t, i) => ({
          label: t.title?.slice(0, 18) || `Task ${i + 1}`,
          planned: t.end_date ? 100 : 80,
          actual: parseFloat(t.progress_percentage) || (t.status === 'completed' ? 100 : 0),
          project: t.project_name,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

const saveDesign = async (req, res, next) => {
  try {
    const { name, designType, description, specifications, floorPlan } = req.body;
    const specs = specifications || {};
    const result = await query(
      `INSERT INTO building_designs (project_id, created_by, name, design_type, description, specifications, ai_generated, status)
       VALUES ($1, $2, $3, $4, $5, $6, false, 'draft') RETURNING *`,
      [
        req.params.id,
        req.user.id,
        name || 'Custom 3D Design',
        designType || 'custom',
        description || '',
        JSON.stringify(specs),
      ]
    );

    if (floorPlan || specs.placedItems) {
      await query(
        `INSERT INTO floor_plans (building_design_id, project_id, floor_number, name, layout_data)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          result.rows[0].id,
          req.params.id,
          specs.activeFloor && specs.activeFloor !== 'all' && specs.activeFloor !== 'roof' ? specs.activeFloor : 1,
          name || `Floor Plan — ${specs.floors || 1} floors`,
          JSON.stringify(floorPlan || { width: specs.width, depth: specs.depth, placedItems: specs.placedItems || [] }),
        ]
      );
    }

    res.status(201).json({ success: true, data: { design: result.rows[0] } });
    await recordAuditEvent(
      {
        userId: req.user.id,
        action: 'SAVE_DESIGN',
        entityType: 'building_design',
        entityId: result.rows[0].id,
        newValues: {
          projectId: req.params.id,
          name: name || 'Custom 3D Design',
          floors: specs.floors,
        },
      },
      req,
    );
    scheduleExteriorRender(req.params.id, result.rows[0].id);
  } catch (err) {
    next(err);
  }
};

const getProjectDesigns = async (req, res, next) => {
  try {
    await assertCanViewProject(req.user, req.params.id);
    const result = await query(
      'SELECT * FROM building_designs WHERE project_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json({ success: true, data: { designs: result.rows } });
  } catch (err) {
    next(err);
  }
};

const getProjectAssignments = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT a.*, c.specialty, c.id as contractor_id, u.first_name, u.last_name, u.email
       FROM assignments a
       JOIN contractors c ON a.contractor_id = c.id
       JOIN users u ON c.user_id = u.id
       WHERE a.project_id = $1 ORDER BY a.created_at DESC`,
      [req.params.id]
    );
    const assignments = result.rows.map((row) => ({
      id: row.id,
      contractorId: row.contractor_id,
      contractorName: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
      roleOnProject: row.role_on_project,
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status,
      specialty: row.specialty,
      email: row.email,
    }));
    res.json({ success: true, data: { assignments } });
  } catch (err) {
    next(err);
  }
};

const getProjectFloorPlans = async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM floor_plans WHERE project_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json({ success: true, data: { floorPlans: result.rows } });
  } catch (err) {
    next(err);
  }
};

const getContractors = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT c.*, u.first_name, u.last_name, u.email, u.is_active
       FROM contractors c JOIN users u ON c.user_id = u.id
       WHERE u.is_active = true ORDER BY c.rating DESC`
    );
    const contractors = result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      specialty: row.specialty,
      experienceYears: row.experience_years,
      hourlyRate: parseFloat(row.hourly_rate) || 0,
      rating: parseFloat(row.rating) || 0,
      availability: row.availability,
    }));
    res.json({ success: true, data: { contractors } });
  } catch (err) {
    next(err);
  }
};

function parseDataUri(dataUri) {
  if (!dataUri || typeof dataUri !== 'string') return null;
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mime: match[1], buffer: Buffer.from(match[2], 'base64') };
}

const saveDesignAiRender = async (req, res, next) => {
  try {
    const { id: projectId, designId } = req.params;
    const {
      mode = 'exterior',
      imageDataUri,
      designKey,
      provider,
    } = req.body;

    if (!imageDataUri || !designKey) {
      throw new AppError('imageDataUri and designKey are required', 400);
    }

    const designResult = await query(
      'SELECT * FROM building_designs WHERE id = $1 AND project_id = $2',
      [designId, projectId],
    );
    if (!designResult.rows.length) throw new AppError('Design not found', 404);

    const parsed = parseDataUri(imageDataUri);
    if (!parsed) throw new AppError('Invalid image data', 400);

    const ext = parsed.mime.includes('png') ? '.png' : '.jpg';
    const relDir = path.join('projects', projectId);
    const absDir = path.join(process.cwd(), env.uploadDir, relDir);
    fs.mkdirSync(absDir, { recursive: true });

    const filename = `${mode}-${designId}${ext}`;
    const absPath = path.join(absDir, filename);
    fs.writeFileSync(absPath, parsed.buffer);

    const publicUrl = `/uploads/${relDir.replace(/\\/g, '/')}/${filename}`;

    let specs = {};
    try {
      specs = typeof designResult.rows[0].specifications === 'string'
        ? JSON.parse(designResult.rows[0].specifications)
        : designResult.rows[0].specifications || {};
    } catch {
      specs = {};
    }

    specs.aiRenders = specs.aiRenders || {};
    specs.aiRenders[mode] = {
      url: publicUrl,
      designKey,
      provider: provider || 'flux',
      generatedAt: new Date().toISOString(),
    };

    await query(
      'UPDATE building_designs SET specifications = $1 WHERE id = $2 AND project_id = $3',
      [JSON.stringify(specs), designId, projectId],
    );

    await recordAuditEvent(
      {
        userId: req.user.id,
        action: 'SAVE_HOUSE_RENDER',
        entityType: 'building_design',
        entityId: designId,
        newValues: { projectId, mode, provider: provider || 'flux' },
      },
      req,
    );

    res.json({
      success: true,
      data: {
        render: specs.aiRenders[mode],
      },
    });
  } catch (err) {
    next(err);
  }
};

const generateDesignExterior = async (req, res, next) => {
  try {
    const { id: projectId, designId } = req.params;
    await assertCanViewProject(req.user, projectId);
    if (req.user.role === 'contractor') {
      throw new AppError('Not authorized', 403);
    }
    const result = await generateExteriorForDesign(projectId, designId, {
      force: req.body?.force === true,
      preferredProvider: req.body?.preferredProvider || 'auto',
    });
    if (result.error) {
      throw new AppError(
        result.message || 'Could not generate house image. Free Pollinations may be rate-limited — retry in a minute or add GEMINI_API_KEY in .env.',
        503,
      );
    }
    await recordAuditEvent(
      {
        userId: req.user.id,
        action: 'GENERATE_HOUSE_IMAGE',
        entityType: 'building_design',
        entityId: designId,
        newValues: { projectId, skipped: !!result.skipped, provider: result.render?.provider },
      },
      req,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProjects, getProjectById, createProject, updateProject, deleteProject,
  approveProject, archiveProject, uploadProjectFile, assignContractor, saveDesign,
  saveDesignAiRender, generateDesignExterior,
  getPmDashboard, getContractorDashboard, getProjectDesigns, getProjectAssignments,
  getProjectFloorPlans, getContractors,
};
