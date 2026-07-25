const { query } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

const formatCompany = (row) => ({
  id: row.id,
  name: row.name,
  registrationNumber: row.registration_number,
  address: row.address,
  city: row.city,
  country: row.country,
  phone: row.phone,
  email: row.email,
  website: row.website,
  logoUrl: row.logo_url,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const getCompanies = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (search) { conditions.push(`name ILIKE $${idx++}`); params.push(`%${search}%`); }
    if (status) { conditions.push(`status = $${idx++}`); params.push(status); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countResult = await query(`SELECT COUNT(*) FROM companies ${where}`, params);

    params.push(limit, offset);
    const result = await query(
      `SELECT * FROM companies ${where} ORDER BY name ASC LIMIT $${idx++} OFFSET $${idx}`,
      params
    );

    res.json({
      success: true,
      data: {
        companies: result.rows.map(formatCompany),
        pagination: { page: +page, limit: +limit, total: +countResult.rows[0].count },
      },
    });
  } catch (err) {
    next(err);
  }
};

const getCompanyById = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM companies WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) throw new AppError('Company not found', 404);

    const users = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, r.name as role FROM users u
       JOIN roles r ON u.role_id = r.id WHERE u.company_id = $1`,
      [req.params.id]
    );

    const projects = await query('SELECT id, name, status, budget FROM projects WHERE company_id = $1', [req.params.id]);

    res.json({
      success: true,
      data: { company: formatCompany(result.rows[0]), users: users.rows, projects: projects.rows },
    });
  } catch (err) {
    next(err);
  }
};

const createCompany = async (req, res, next) => {
  try {
    const { name, registrationNumber, address, city, country, phone, email, website } = req.body;
    if (!name) throw new AppError('Company name is required', 400);

    const result = await query(
      `INSERT INTO companies (name, registration_number, address, city, country, phone, email, website)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [name, registrationNumber, address, city, country || 'USA', phone, email, website]
    );

    res.status(201).json({ success: true, data: { company: formatCompany(result.rows[0]) } });
  } catch (err) {
    next(err);
  }
};

const updateCompany = async (req, res, next) => {
  try {
    const fields = { name: 'name', registrationNumber: 'registration_number', address: 'address',
      city: 'city', country: 'country', phone: 'phone', email: 'email', website: 'website', status: 'status' };
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
    params.push(req.params.id);

    const result = await query(
      `UPDATE companies SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    if (result.rows.length === 0) throw new AppError('Company not found', 404);
    res.json({ success: true, data: { company: formatCompany(result.rows[0]) } });
  } catch (err) {
    next(err);
  }
};

const deleteCompany = async (req, res, next) => {
  try {
    const result = await query('DELETE FROM companies WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) throw new AppError('Company not found', 404);
    res.json({ success: true, message: 'Company deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getCompanies, getCompanyById, createCompany, updateCompany, deleteCompany };
