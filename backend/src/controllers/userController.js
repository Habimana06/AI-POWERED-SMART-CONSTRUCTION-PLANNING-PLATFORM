const bcrypt = require('bcrypt');
const { query } = require('../config/database');
const { formatUser } = require('../utils/tokens');
const { AppError } = require('../middleware/errorHandler');

const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, search, isActive } = req.query;
    const offset = (page - 1) * limit;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (role) { conditions.push(`r.name = $${idx++}`); params.push(role); }
    if (search) { conditions.push(`(u.email ILIKE $${idx} OR u.first_name ILIKE $${idx} OR u.last_name ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
    if (isActive !== undefined) { conditions.push(`u.is_active = $${idx++}`); params.push(isActive === 'true'); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countResult = await query(
      `SELECT COUNT(*) FROM users u JOIN roles r ON u.role_id = r.id ${where}`,
      params
    );

    params.push(limit, offset);
    const result = await query(
      `SELECT u.*, r.name as role FROM users u JOIN roles r ON u.role_id = r.id ${where}
       ORDER BY u.created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
      params
    );

    res.json({
      success: true,
      data: {
        users: result.rows.map(formatUser),
        pagination: { page: +page, limit: +limit, total: +countResult.rows[0].count, pages: Math.ceil(countResult.rows[0].count / limit) },
      },
    });
  } catch (err) {
    next(err);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.*, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) throw new AppError('User not found', 404);
    res.json({ success: true, data: { user: formatUser(result.rows[0]) } });
  } catch (err) {
    next(err);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, phone, role, companyId } = req.body;
    if (!email || !password || !firstName || !lastName || !role) {
      throw new AppError('Required fields: email, password, firstName, lastName, role', 400);
    }

    const roleResult = await query('SELECT id FROM roles WHERE name = $1', [role]);
    if (roleResult.rows.length === 0) throw new AppError('Invalid role', 400);

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, role_id, company_id, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true) RETURNING *`,
      [email.toLowerCase(), passwordHash, firstName, lastName, phone, roleResult.rows[0].id, companyId]
    );

    res.status(201).json({ success: true, data: { user: formatUser({ ...result.rows[0], role }) } });
  } catch (err) {
    if (err.code === '23505') return next(new AppError('Email already exists', 409));
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { firstName, lastName, phone, role, companyId, isActive, isVerified } = req.body;
    const updates = [];
    const params = [];
    let idx = 1;

    if (firstName) { updates.push(`first_name = $${idx++}`); params.push(firstName); }
    if (lastName) { updates.push(`last_name = $${idx++}`); params.push(lastName); }
    if (phone !== undefined) { updates.push(`phone = $${idx++}`); params.push(phone); }
    if (companyId !== undefined) { updates.push(`company_id = $${idx++}`); params.push(companyId); }
    if (isActive !== undefined) { updates.push(`is_active = $${idx++}`); params.push(isActive); }
    if (isVerified !== undefined && req.user.role === 'admin') {
      updates.push(`is_verified = $${idx++}`);
      params.push(!!isVerified);
    }

    if (role) {
      const roleResult = await query('SELECT id FROM roles WHERE name = $1', [role]);
      if (roleResult.rows.length === 0) throw new AppError('Invalid role', 400);
      updates.push(`role_id = $${idx++}`);
      params.push(roleResult.rows[0].id);
    }

    if (updates.length === 0) throw new AppError('No fields to update', 400);

    updates.push('updated_at = NOW()');
    params.push(req.params.id);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    if (result.rows.length === 0) throw new AppError('User not found', 404);

    const userWithRole = await query(
      `SELECT u.*, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1`,
      [req.params.id]
    );

    res.json({ success: true, data: { user: formatUser(userWithRole.rows[0]) } });
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) throw new AppError('Cannot delete your own account', 400);
    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) throw new AppError('User not found', 404);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getUsers, getUserById, createUser, updateUser, deleteUser };
