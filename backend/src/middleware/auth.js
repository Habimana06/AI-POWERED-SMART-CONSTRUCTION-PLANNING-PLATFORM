const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { query } = require('../config/database');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Access token required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.jwt.secret);

    const result = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role_id, u.company_id, u.is_active, u.is_verified, r.name as role
       FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const user = result.rows[0];
    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      roleId: user.role_id,
      role: user.role,
      companyId: user.company_id,
      isVerified: user.is_verified,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  if (roles.includes(req.user.role) || req.user.role === 'admin') {
    return next();
  }

  return res.status(403).json({ success: false, message: 'Insufficient permissions' });
};

const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.jwt.secret);
    const result = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role_id, u.company_id, r.name as role
       FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1 AND u.is_active = true`,
      [decoded.userId]
    );
    if (result.rows.length > 0) {
      const user = result.rows[0];
      req.user = {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        roleId: user.role_id,
        role: user.role,
        companyId: user.company_id,
      };
    }
  } catch {
    // ignore invalid optional token
  }
  next();
};

module.exports = { authenticate, authorize, optionalAuth };
