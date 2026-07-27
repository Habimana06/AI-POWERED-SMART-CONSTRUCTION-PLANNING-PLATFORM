const { query } = require('../config/database');
const env = require('../config/env');
const { sendNotificationEmail } = require('../services/emailService');
const { createNotification, loadActiveAdminUserIds } = require('../services/notificationService');

function parseSpecs(raw) {
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw || {};
  } catch {
    return {};
  }
}

function pickExteriorUrl(specs, previewUrl) {
  const url = specs?.aiRenders?.exterior?.url;
  if (url) return url;
  return previewUrl || null;
}

const getLandingStats = async (_req, res, next) => {
  try {
    const { rows: projectRows } = await query(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(budget), 0) AS total_budget,
              COALESCE(AVG(progress_percentage), 0) AS avg_progress
       FROM projects
       WHERE archived_at IS NULL`,
    );
    const projectRow = projectRows[0];
    const { rows: userRows } = await query(
      `SELECT COUNT(*) AS active_users FROM users WHERE is_active = true OR is_active = 1`,
    );
    const userRow = userRows[0];
    const { rows: designRows } = await query('SELECT COUNT(*) AS design_count FROM building_designs');
    const designRow = designRows[0];

    res.json({
      success: true,
      data: {
        projectCount: Number(projectRow?.total || 0),
        totalBudget: Number(projectRow?.total_budget || 0),
        avgProgress: Number(projectRow?.avg_progress || 0),
        activeUsers: Number(userRow?.active_users || 0),
        designCount: Number(designRow?.design_count || 0),
      },
    });
  } catch (err) {
    next(err);
  }
};

const getShowcaseProjects = async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT p.id, p.name, p.status, p.progress_percentage, p.budget, p.location, p.building_type,
              bd.specifications, bd.preview_url
       FROM projects p
       INNER JOIN building_designs bd ON bd.id = (
         SELECT id FROM building_designs WHERE project_id = p.id ORDER BY updated_at DESC LIMIT 1
       )
       WHERE p.archived_at IS NULL
       ORDER BY p.updated_at DESC
       LIMIT 12`,
    );

    const projects = rows.map((row) => {
      const specs = parseSpecs(row.specifications);
      return {
        id: row.id,
        name: row.name,
        status: row.status,
        progressPercentage: Number(row.progress_percentage || 0),
        budget: row.budget != null ? Number(row.budget) : null,
        location: row.location,
        buildingType: row.building_type,
        imageUrl: pickExteriorUrl(specs, row.preview_url),
      };
    });

    const withRender = projects.filter((p) => p.imageUrl);
    const showcase = (withRender.length >= 4 ? withRender : projects).slice(0, 4);

    res.json({ success: true, data: { projects: showcase } });
  } catch (err) {
    next(err);
  }
};

const getApprovedTestimonials = async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, author_name, author_role, quote, created_at
       FROM testimonials
       WHERE status = 'approved'
       ORDER BY approved_at DESC, created_at DESC
       LIMIT 12`,
    );
    res.json({
      success: true,
      data: {
        testimonials: rows.map((r) => ({
          id: r.id,
          author: r.author_name,
          role: r.author_role,
          quote: r.quote,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

const submitTestimonial = async (req, res, next) => {
  try {
    const { authorName, authorRole, quote, email } = req.body || {};
    const name = String(authorName || '').trim();
    const role = String(authorRole || '').trim();
    const text = String(quote || '').trim();
    const contactEmail = email ? String(email).trim().slice(0, 255) : null;

    if (name.length < 2 || text.length < 20) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your name and a testimonial of at least 20 characters.',
      });
    }

    await query(
      `INSERT INTO testimonials (author_name, author_role, quote, email, status)
       VALUES ($1, $2, $3, $4, 'pending')`,
      [name, role || null, text.slice(0, 2000), contactEmail],
    );

    res.status(201).json({
      success: true,
      message: 'Thank you! Your story was submitted and will appear after admin approval.',
    });
  } catch (err) {
    next(err);
  }
};

const submitContact = async (req, res, next) => {
  try {
    const { name, email, company, subject, message } = req.body || {};
    const senderName = String(name || '').trim();
    const senderEmail = String(email || '').trim();
    const msgSubject = String(subject || '').trim();
    const msgBody = String(message || '').trim();
    const senderCompany = company ? String(company).trim().slice(0, 255) : null;

    if (senderName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) {
      return res.status(400).json({ success: false, message: 'Valid name and email are required.' });
    }
    if (msgSubject.length < 3 || msgBody.length < 10) {
      return res.status(400).json({ success: false, message: 'Subject and message are required.' });
    }

    await query(
      `INSERT INTO contact_messages (name, email, company, subject, message, status)
       VALUES ($1, $2, $3, $4, $5, 'new')`,
      [senderName, senderEmail, senderCompany, msgSubject.slice(0, 255), msgBody.slice(0, 10000)],
    );

    const bellTitle = 'New contact form message';
    const bellMessage = `${msgSubject}\n\nFrom: ${senderName} <${senderEmail}>${senderCompany ? ` · ${senderCompany}` : ''}\n\n${msgBody.slice(0, 2500)}`;
    try {
      const admins = await loadActiveAdminUserIds();
      if (admins.length) {
        for (const admin of admins) {
          await createNotification({
            userId: admin.id,
            title: bellTitle,
            message: bellMessage,
            type: 'info',
            category: 'contact',
            adminEmailCopy: false,
          });
        }
      } else {
        const adminEmail = env.notifications.adminEmail;
        if (adminEmail) {
          await sendNotificationEmail(adminEmail, bellTitle, bellMessage);
        }
      }
    } catch (e) {
      console.error('Contact notification failed:', e.message);
    }

    res.status(201).json({
      success: true,
      message: 'Message received! We will reply to your email within 24 hours.',
    });
  } catch (err) {
    next(err);
  }
};

const getContactInfo = async (_req, res, next) => {
  try {
    const adminEmail = env.notifications.adminEmail || env.smtp.from || env.smtp.user;
    const { rows: teamRows } = await query(
      `SELECT u.first_name, u.last_name, u.email, u.phone, u.job_title, u.department, r.name AS role
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.is_active = 1 AND r.name IN ('admin', 'project_manager')
       ORDER BY CASE r.name WHEN 'admin' THEN 0 WHEN 'project_manager' THEN 1 ELSE 2 END, u.created_at ASC
       LIMIT 4`,
    );

    const roleDefaultTitle = {
      admin: 'CEO',
      project_manager: 'Project Manager',
    };

    const roleDefaultBio = {
      admin: 'Platform leadership & administration',
      project_manager: 'Project delivery & client projects',
    };

    const team = teamRows.map((row) => ({
      name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
      role: row.role,
      roleLabel: row.role === 'admin' ? 'Administration' : 'Project Management',
      title: row.job_title || roleDefaultTitle[row.role] || row.role,
      department: row.department || null,
      bio: row.department || roleDefaultBio[row.role] || '',
      email: row.email || adminEmail,
      phone: row.phone || null,
    }));

    res.json({
      success: true,
      data: {
        email: adminEmail,
        phone: '+250 788 300 000',
        location: 'Kigali, Rwanda',
        team,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getLandingStats,
  getShowcaseProjects,
  getApprovedTestimonials,
  submitTestimonial,
  submitContact,
  getContactInfo,
};
