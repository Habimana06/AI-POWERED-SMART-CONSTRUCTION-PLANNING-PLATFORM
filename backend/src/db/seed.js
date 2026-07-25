const bcrypt = require('bcrypt');
const { pool, query } = require('../config/database');

async function seed() {
  console.log('Seeding database...');

  try {
    // Roles
    await query(`
      INSERT IGNORE INTO roles (name, description, permissions) VALUES
      ('admin', 'System Administrator', '["*"]'),
      ('project_manager', 'Project Manager', '["projects:*", "reports:*", "ai:*"]'),
      ('contractor', 'Contractor', '["projects:read", "progress:*", "materials:request"]')
    `);

    const roles = await query('SELECT id, name FROM roles');
    const roleMap = Object.fromEntries(roles.rows.map((r) => [r.name, r.id]));

    // Company
    let companyId;
    const existingCompany = await query(
      'SELECT id FROM companies WHERE name = $1 LIMIT 1',
      ['BuildPlan Construction Co.']
    );
    if (existingCompany.rows.length > 0) {
      companyId = existingCompany.rows[0].id;
    } else {
      await query(
        `INSERT INTO companies (name, registration_number, address, city, country, phone, email, website, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          'BuildPlan Construction Co.',
          'BPC-2024-001',
          '123 Construction Ave',
          'New York',
          'USA',
          '+1-555-0100',
          'info@buildplan.ai',
          'https://buildplan.ai',
          'active',
        ]
      );
      const companyResult = await query(
        'SELECT id FROM companies WHERE name = $1 LIMIT 1',
        ['BuildPlan Construction Co.']
      );
      companyId = companyResult.rows[0].id;
    }

    // Users
    const users = [
      {
        email: 'admin@buildplan.ai',
        password: 'Admin@123',
        firstName: 'System',
        lastName: 'Admin',
        role: 'admin',
      },
      {
        email: 'pm@buildplan.ai',
        password: 'PM@123',
        firstName: 'Sarah',
        lastName: 'Johnson',
        role: 'project_manager',
      },
      {
        email: 'contractor@buildplan.ai',
        password: 'Contractor@123',
        firstName: 'Mike',
        lastName: 'Rodriguez',
        role: 'contractor',
      },
    ];

    const userIds = {};
    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 12);
      await query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role_id, company_id, is_verified, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true, true)
         ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
        [u.email, hash, u.firstName, u.lastName, roleMap[u.role], companyId]
      );
      const userResult = await query('SELECT id, email FROM users WHERE email = $1', [u.email]);
      userIds[u.email] = userResult.rows[0].id;
    }

    const pmId = userIds['pm@buildplan.ai'];
    const contractorUserId = userIds['contractor@buildplan.ai'];
    const adminId = userIds['admin@buildplan.ai'];

    // Contractor profile
    let contractorId;
    const existingContractor = await query('SELECT id FROM contractors WHERE user_id = $1', [contractorUserId]);
    if (existingContractor.rows.length > 0) {
      contractorId = existingContractor.rows[0].id;
    } else {
      await query(
        `INSERT INTO contractors (user_id, company_id, specialty, license_number, experience_years, hourly_rate, rating, availability, bio)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          contractorUserId,
          companyId,
          'General Construction',
          'GC-NY-789012',
          12,
          75.0,
          4.8,
          'available',
          'Experienced general contractor specializing in commercial and residential projects.',
        ]
      );
      const contractorResult = await query('SELECT id FROM contractors WHERE user_id = $1', [contractorUserId]);
      contractorId = contractorResult.rows[0].id;
    }

    // Sample Project
    await query(
      `INSERT INTO projects (name, description, project_code, status, approval_status, priority, budget, start_date, end_date, location, project_type, building_type, total_area_sqft, floors, progress_percentage, created_by, company_id, approved_by, approved_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW())
       ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      [
        'Downtown Office Tower',
        'A 15-story modern office building with sustainable design features and smart building systems.',
        'PRJ-2024-001',
        'in_progress',
        'approved',
        'high',
        2500000.0,
        '2024-06-01',
        '2025-12-31',
        '456 Main Street, New York, NY',
        'commercial',
        'office',
        150000.0,
        15,
        35.5,
        pmId,
        companyId,
        adminId,
      ]
    );

    const existingProject = await query("SELECT id FROM projects WHERE project_code = 'PRJ-2024-001'");
    const projectId = existingProject.rows[0]?.id;

    if (projectId) {
      // Assignment
      await query(
        `INSERT IGNORE INTO assignments (project_id, contractor_id, assigned_by, role_on_project, status, start_date)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [projectId, contractorId, pmId, 'Lead Contractor', 'active', '2024-06-01']
      );

      // Tasks
      const tasks = [
        { title: 'Foundation Work', status: 'completed', progress: 100, priority: 'high' },
        { title: 'Structural Steel Frame', status: 'in_progress', progress: 60, priority: 'high' },
        { title: 'Electrical Rough-in', status: 'pending', progress: 0, priority: 'medium' },
        { title: 'HVAC Installation', status: 'pending', progress: 0, priority: 'medium' },
      ];

      for (const task of tasks) {
        const taskExists = await query(
          'SELECT 1 FROM project_tasks WHERE project_id = $1 AND title = $2',
          [projectId, task.title]
        );
        if (taskExists.rows.length === 0) {
          await query(
            `INSERT INTO project_tasks (project_id, title, status, progress_percentage, priority, assigned_to, created_by, start_date, end_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, '2024-06-01', '2025-06-30')`,
            [projectId, task.title, task.status, task.progress, task.priority, contractorUserId, pmId]
          );
        }
      }

      // Materials
      const materialExists = await query(
        'SELECT 1 FROM materials WHERE project_id = $1 AND name = $2',
        [projectId, 'Structural Steel Beams']
      );
      if (materialExists.rows.length === 0) {
        await query(
          `INSERT INTO materials (project_id, requested_by, name, category, quantity, unit, unit_cost, total_cost, supplier, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [projectId, contractorUserId, 'Structural Steel Beams', 'structural', 500, 'tons', 850.0, 425000.0, 'SteelCorp Inc.', 'approved']
        );
      }

      // Cost estimation
      const costExists = await query(
        'SELECT 1 FROM cost_estimations WHERE project_id = $1 AND title = $2',
        [projectId, 'Initial Cost Estimate v1']
      );
      if (costExists.rows.length === 0) {
        await query(
          `INSERT INTO cost_estimations (project_id, created_by, title, total_estimated_cost, labor_cost, material_cost, equipment_cost, contingency_cost, overhead_cost, breakdown, ai_generated, confidence_score, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false, 92.5, 'approved')`,
          [
            projectId,
            pmId,
            'Initial Cost Estimate v1',
            2450000.0,
            980000.0,
            1100000.0,
            180000.0,
            122500.0,
            67500.0,
            JSON.stringify([
              { category: 'Foundation', cost: 320000 },
              { category: 'Structure', cost: 850000 },
              { category: 'MEP Systems', cost: 480000 },
              { category: 'Finishes', cost: 350000 },
            ]),
          ]
        );
      }

      // Risk predictions
      const riskExists = await query(
        'SELECT 1 FROM risk_predictions WHERE project_id = $1 AND risk_type = $2',
        [projectId, 'Weather Delay']
      );
      if (riskExists.rows.length === 0) {
        await query(
          `INSERT INTO risk_predictions (project_id, created_by, risk_type, risk_level, probability, impact_score, description, mitigation_plan, ai_generated, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, 'identified')`,
          [
            projectId,
            pmId,
            'Weather Delay',
            'medium',
            45.0,
            6.5,
            'Potential delays due to winter weather conditions affecting exterior work.',
            'Schedule critical exterior work for spring/summer months. Maintain buffer in timeline.',
          ]
        );
      }

      // Building design
      let designId;
      const designExists = await query(
        'SELECT id FROM building_designs WHERE project_id = $1 AND name = $2',
        [projectId, 'Modern Office Tower Design']
      );
      if (designExists.rows.length > 0) {
        designId = designExists.rows[0].id;
      } else {
        await query(
          `INSERT INTO building_designs (project_id, created_by, name, design_type, description, specifications, ai_generated, status)
           VALUES ($1, $2, $3, $4, $5, $6, true, 'approved')`,
          [
            projectId,
            pmId,
            'Modern Office Tower Design',
            'commercial',
            'LEED Gold certified office tower with glass curtain wall facade.',
            JSON.stringify({ floors: 15, parkingLevels: 3, greenRoof: true, solarPanels: true }),
          ]
        );
        const designResult = await query(
          'SELECT id FROM building_designs WHERE project_id = $1 AND name = $2',
          [projectId, 'Modern Office Tower Design']
        );
        designId = designResult.rows[0].id;
      }

      if (designId) {
        const floorExists = await query(
          'SELECT 1 FROM floor_plans WHERE building_design_id = $1 AND floor_number = $2',
          [designId, 1]
        );
        if (floorExists.rows.length === 0) {
          await query(
            `INSERT INTO floor_plans (building_design_id, project_id, floor_number, name, area_sqft, rooms)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              designId,
              projectId,
              1,
              'Ground Floor - Lobby & Retail',
              10000.0,
              JSON.stringify([{ name: 'Lobby', area: 3000 }, { name: 'Retail Unit A', area: 3500 }]),
            ]
          );
        }

        const blueprintExists = await query(
          'SELECT 1 FROM blueprints WHERE project_id = $1 AND name = $2',
          [projectId, 'Structural Blueprint v1.0']
        );
        if (blueprintExists.rows.length === 0) {
          await query(
            `INSERT INTO blueprints (project_id, building_design_id, created_by, name, blueprint_type, version, description, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [projectId, designId, pmId, 'Structural Blueprint v1.0', 'structural', '1.0', 'Main structural blueprint for tower foundation and frame', 'active']
          );
        }
      }

      // Progress update
      const progressExists = await query(
        'SELECT 1 FROM progress_updates WHERE project_id = $1 AND description = $2',
        [projectId, 'Weekly progress report - Steel frame installation']
      );
      if (progressExists.rows.length === 0) {
        await query(
          `INSERT INTO progress_updates (project_id, reported_by, progress_percentage, description, work_completed, work_planned, hours_worked, workers_count, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            projectId,
            contractorUserId,
            35.5,
            'Weekly progress report - Steel frame installation',
            'Completed floors 1-5 steel frame installation. Foundation curing complete.',
            'Continue steel frame for floors 6-8. Begin electrical rough-in on lower floors.',
            320.0,
            25,
            'submitted',
          ]
        );
      }

      // Daily log
      const logExists = await query(
        'SELECT 1 FROM daily_logs WHERE project_id = $1 AND log_date = CURRENT_DATE',
        [projectId]
      );
      if (logExists.rows.length === 0) {
        await query(
          `INSERT INTO daily_logs (project_id, contractor_id, logged_by, log_date, weather, workers_on_site, work_summary, equipment_used)
           VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6, $7)`,
          [
            projectId,
            contractorId,
            contractorUserId,
            'Partly Cloudy, 72°F',
            22,
            'Steel frame installation on floor 6. Crane operations completed safely.',
            JSON.stringify(['Tower Crane', 'Welding Equipment', 'Scaffolding']),
          ]
        );
      }

      // Issue report
      const issueExists = await query(
        'SELECT 1 FROM issue_reports WHERE project_id = $1 AND title = $2',
        [projectId, 'Delayed Steel Delivery']
      );
      if (issueExists.rows.length === 0) {
        await query(
          `INSERT INTO issue_reports (project_id, reported_by, title, description, issue_type, severity, status, location)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            projectId,
            contractorUserId,
            'Delayed Steel Delivery',
            'Steel beam delivery delayed by 3 days due to supplier logistics issues.',
            'supply_chain',
            'medium',
            'open',
            'Loading Dock B',
          ]
        );
      }

      // Message
      const messageExists = await query(
        'SELECT 1 FROM messages WHERE project_id = $1 AND subject = $2',
        [projectId, 'Schedule Update Required']
      );
      if (messageExists.rows.length === 0) {
        await query(
          `INSERT INTO messages (project_id, sender_id, recipient_id, subject, body)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            projectId,
            pmId,
            contractorUserId,
            'Schedule Update Required',
            'Please review the updated timeline for floors 6-10 and confirm resource availability.',
          ]
        );
      }

      // Report
      const reportExists = await query(
        'SELECT 1 FROM reports WHERE project_id = $1 AND title = $2',
        [projectId, 'Monthly Progress Report - June 2024']
      );
      if (reportExists.rows.length === 0) {
        await query(
          `INSERT INTO reports (project_id, created_by, title, report_type, content, summary, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            projectId,
            pmId,
            'Monthly Progress Report - June 2024',
            'progress',
            JSON.stringify({ overallProgress: 35.5, tasksCompleted: 1, tasksInProgress: 1, budgetUsed: 875000 }),
            'Project is on track with 35.5% completion. Foundation work complete, steel frame 60% done.',
            'published',
          ]
        );
      }
    }

    // Settings
    const settings = [
      { key: 'app_name', value: { value: 'BuildPlan AI' }, description: 'Application name', category: 'general' },
      { key: 'maintenance_mode', value: { enabled: false }, description: 'Maintenance mode toggle', category: 'system' },
      { key: 'max_upload_size_mb', value: { value: 50 }, description: 'Maximum file upload size in MB', category: 'uploads' },
      { key: 'ai_enabled', value: { enabled: true }, description: 'Enable AI features', category: 'ai' },
      { key: 'notification_email', value: { enabled: true }, description: 'Send email notifications', category: 'notifications' },
    ];

    for (const s of settings) {
      await query(
        `INSERT IGNORE INTO settings (\`key\`, value, description, category, updated_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [s.key, JSON.stringify(s.value), s.description, s.category, adminId]
      );
    }

    // Sample notifications
    for (const [userId, title, message, type] of [
      [pmId, 'Project Approved', 'Downtown Office Tower has been approved by admin.', 'success'],
      [contractorUserId, 'New Assignment', 'You have been assigned to Downtown Office Tower project.', 'info'],
      [adminId, 'System Ready', 'BuildPlan AI platform is ready for use.', 'info'],
    ]) {
      const notifExists = await query(
        'SELECT 1 FROM notifications WHERE user_id = $1 AND title = $2',
        [userId, title]
      );
      if (notifExists.rows.length === 0) {
        await query(
          `INSERT INTO notifications (user_id, title, message, type, category)
           VALUES ($1, $2, $3, $4, 'system')`,
          [userId, title, message, type]
        );
      }
    }

    console.log('Seed completed successfully.');
    console.log('Default users:');
    console.log('  admin@buildplan.ai / Admin@123 (admin)');
    console.log('  pm@buildplan.ai / PM@123 (project_manager)');
    console.log('  contractor@buildplan.ai / Contractor@123 (contractor)');
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
