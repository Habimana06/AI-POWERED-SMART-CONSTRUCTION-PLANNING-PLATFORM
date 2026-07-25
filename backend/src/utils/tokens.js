const crypto = require('crypto');

const generateToken = (length = 32) => crypto.randomBytes(length).toString('hex');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const parseDuration = (duration) => {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 15 * 60 * 1000;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return value * (multipliers[unit] || 60000);
};

const formatUser = (row) => ({
  id: row.id,
  email: row.email,
  firstName: row.first_name,
  lastName: row.last_name,
  phone: row.phone,
  jobTitle: row.job_title || null,
  department: row.department || null,
  avatarUrl: row.avatar_url,
  role: row.role || row.role_name,
  roleId: row.role_id,
  companyId: row.company_id,
  isVerified: row.is_verified,
  isActive: row.is_active,
  lastLogin: row.last_login,
  createdAt: row.created_at,
});

const formatProject = (row) => {
  let metadata = row.metadata;
  if (typeof metadata === 'string') {
    try { metadata = JSON.parse(metadata); } catch { metadata = {}; }
  }
  return {
  id: row.id,
  name: row.name,
  description: row.description,
  projectCode: row.project_code,
  status: row.status,
  approvalStatus: row.approval_status,
  priority: row.priority,
  budget: parseFloat(row.budget) || 0,
  actualCost: parseFloat(row.actual_cost) || 0,
  startDate: row.start_date,
  endDate: row.end_date,
  location: row.location,
  projectType: row.project_type,
  buildingType: row.building_type,
  totalAreaSqft: parseFloat(row.total_area_sqft) || 0,
  floors: row.floors,
  progressPercentage: parseFloat(row.progress_percentage) || 0,
  createdBy: row.created_by,
  createdByName: row.created_by_name,
  pmFullName: row.pm_full_name,
  pmEmail: row.pm_email,
  pmPhone: row.pm_phone,
  companyId: row.company_id,
  metadata: metadata || {},
  createdAt: row.created_at,
  updatedAt: row.updated_at,
};
};

module.exports = { generateToken, hashToken, parseDuration, formatUser, formatProject };
