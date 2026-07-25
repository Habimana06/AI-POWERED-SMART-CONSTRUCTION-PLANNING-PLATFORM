const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const env = require('./env');

const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.database,
  user: env.db.user,
  password: env.db.password,
  connectionLimit: 20,
  waitForConnections: true,
  idleTimeout: 30000,
  connectTimeout: 5000,
});

const UUID_TABLES = new Set([
  'companies',
  'users',
  'sessions',
  'refresh_tokens',
  'projects',
  'project_files',
  'project_images',
  'project_tasks',
  'contractors',
  'assignments',
  'materials',
  'cost_estimations',
  'risk_predictions',
  'building_designs',
  'floor_plans',
  'blueprints',
  'ai_conversations',
  'notifications',
  'reports',
  'progress_updates',
  'daily_logs',
  'issue_reports',
  'messages',
  'audit_logs',
  'testimonials',
  'contact_messages',
]);

function convertIlike(sql) {
  return sql.replace(/\bILIKE\b/gi, 'LIKE');
}

function convertInterval(sql) {
  return sql.replace(
    /NOW\(\)\s*([+-])\s*INTERVAL\s+'(\d+)\s+(\w+)'/gi,
    (_, op, amount, unit) => {
      const fn = op === '+' ? 'DATE_ADD' : 'DATE_SUB';
      return `${fn}(NOW(), INTERVAL ${amount} ${normalizeIntervalUnit(unit)})`;
    }
  );
}

function normalizeIntervalUnit(unit) {
  const u = unit.toLowerCase();
  if (u.startsWith('day')) return 'DAY';
  if (u.startsWith('month')) return 'MONTH';
  if (u.startsWith('hour')) return 'HOUR';
  if (u.startsWith('minute')) return 'MINUTE';
  if (u.startsWith('second')) return 'SECOND';
  if (u.startsWith('year')) return 'YEAR';
  if (u.startsWith('week')) return 'WEEK';
  return unit.toUpperCase();
}

function convertFilter(sql) {
  let result = sql;
  const marker = /COUNT\(\*\)\s+FILTER\s+\(/gi;
  let match;
  const replacements = [];

  while ((match = marker.exec(sql)) !== null) {
    const start = match.index;
    let depth = 0;
    let i = match.index + match[0].length - 1;
    for (; i < sql.length; i += 1) {
      if (sql[i] === '(') depth += 1;
      else if (sql[i] === ')') {
        depth -= 1;
        if (depth === 0) {
          const inner = sql.slice(match.index + match[0].length, i);
          const whereMatch = inner.match(/WHERE\s+([\s\S]+)/i);
          if (whereMatch) {
            replacements.push({
              start,
              end: i + 1,
              text: `SUM(CASE WHEN ${whereMatch[1].trim()} THEN 1 ELSE 0 END)`,
            });
          }
          break;
        }
      }
    }
  }

  for (let r = replacements.length - 1; r >= 0; r -= 1) {
    const { start, end, text } = replacements[r];
    result = result.slice(0, start) + text + result.slice(end);
  }

  return result;
}

function sanitizeParams(params) {
  return params.map((value) => (value === undefined ? null : value));
}

function inlineLimitOffset(sql, params) {
  const match = sql.match(/\s+LIMIT\s+\?\s+OFFSET\s+\?(\s*)$/i);
  if (!match || params.length < 2) {
    return { sql, params };
  }

  const limit = Math.min(Math.max(parseInt(params[params.length - 2], 10) || 20, 1), 500);
  const offset = Math.max(parseInt(params[params.length - 1], 10) || 0, 0);
  const newSql = sql.replace(/\s+LIMIT\s+\?\s+OFFSET\s+\?(\s*)$/i, ` LIMIT ${limit} OFFSET ${offset}$1`);
  return { sql: newSql, params: params.slice(0, -2) };
}

function convertPlaceholders(sql) {
  return sql.replace(/\$(\d+)/g, '?');
}

function transformSql(text) {
  let sql = text;
  sql = convertIlike(sql);
  sql = convertInterval(sql);
  sql = convertFilter(sql);
  sql = convertPlaceholders(sql);
  return sql;
}

function parseInsertTable(sql) {
  const match = sql.match(/INSERT\s+INTO\s+`?(\w+)`?\s*\(/i);
  return match ? match[1].toLowerCase() : null;
}

function insertHasIdColumn(sql) {
  const columnsMatch = sql.match(/INSERT\s+INTO\s+`?\w+`?\s*\(([^)]+)\)/i);
  if (!columnsMatch) return false;
  return columnsMatch[1]
    .split(',')
    .map((col) => col.trim().replace(/`/g, '').toLowerCase())
    .includes('id');
}

function injectUuidIfNeeded(sql, params) {
  const table = parseInsertTable(sql);
  if (!table || !UUID_TABLES.has(table) || insertHasIdColumn(sql)) {
    return { sql, params, injectedId: null };
  }

  const id = uuidv4();
  const valueMatch = sql.match(/VALUES\s*\(/i);
  if (!valueMatch) {
    return { sql, params, injectedId: null };
  }

  const newSql = sql.replace(
    /INSERT\s+INTO\s+(`?\w+`?)\s*\(/i,
    'INSERT INTO $1 (id, '
  ).replace(/VALUES\s*\(/i, 'VALUES (?,');

  return { sql: newSql, params: [id, ...params], injectedId: id };
}

function extractWhereClause(sql) {
  const match = sql.match(/\bWHERE\b([\s\S]+?)(?:\s+ORDER\s+BY\b|\s+LIMIT\b|$)/i);
  return match ? match[1].trim() : null;
}

function extractUpdateTable(sql) {
  const match = sql.match(/UPDATE\s+`?(\w+)`?\s+SET/i);
  return match ? match[1] : null;
}

function extractDeleteTable(sql) {
  const match = sql.match(/DELETE\s+FROM\s+`?(\w+)`?/i);
  return match ? match[1] : null;
}

function countPlaceholders(text) {
  return (text.match(/\?/g) || []).length;
}

async function executeQuery(connection, text, params = []) {
  let sql = transformSql(text);
  let queryParams = sanitizeParams([...params]);
  const paginated = inlineLimitOffset(sql, queryParams);
  sql = paginated.sql;
  queryParams = paginated.params;

  const returningMatch = sql.match(/\s+RETURNING\s+([\s\S]+)$/i);
  const returningClause = returningMatch ? returningMatch[1].trim() : null;
  if (returningMatch) {
    sql = sql.replace(/\s+RETURNING\s+[\s\S]+$/i, '');
  }

  const trimmed = sql.trim();
  const isInsert = /^INSERT/i.test(trimmed);
  const isUpdate = /^UPDATE/i.test(trimmed);
  const isDelete = /^DELETE/i.test(trimmed);
  const isSelect = /^SELECT/i.test(trimmed);

  let injectedId = null;
  if (isInsert) {
    const injected = injectUuidIfNeeded(sql, queryParams);
    sql = injected.sql;
    queryParams = injected.params;
    injectedId = injected.injectedId;
  }

  let preDeleteRows = [];
  if (isDelete && returningClause) {
    const table = extractDeleteTable(sql);
    const where = extractWhereClause(sql);
    if (table && where) {
      const cols = returningClause === '*' ? '*' : returningClause;
      const [rows] = await connection.execute(
        `SELECT ${cols} FROM ${table} WHERE ${where}`,
        queryParams
      );
      preDeleteRows = rows;
    }
  }

  const [result] = await connection.execute(sql, queryParams);

  if (Array.isArray(result)) {
    return { rows: result, rowCount: result.length };
  }

  if (!returningClause) {
    return { rows: [], rowCount: result.affectedRows ?? 0 };
  }

  if (isInsert) {
    const table = parseInsertTable(sql);
    const id = injectedId || (result.insertId ? String(result.insertId) : null);
    if (table && id) {
      const cols = returningClause === '*' ? '*' : returningClause;
      const [rows] = await connection.execute(
        `SELECT ${cols} FROM ${table} WHERE id = ?`,
        [id]
      );
      return { rows, rowCount: rows.length };
    }
  }

  if (isUpdate) {
    const table = extractUpdateTable(sql);
    const where = extractWhereClause(sql);
    if (table && where) {
      const setMatch = sql.match(/SET\s+([\s\S]+?)\s+WHERE\b/i);
      if (setMatch) {
        const setParamCount = countPlaceholders(setMatch[1]);
        const whereParams = queryParams.slice(setParamCount);
        const cols = returningClause === '*' ? '*' : returningClause;
        const [rows] = await connection.execute(
          `SELECT ${cols} FROM ${table} WHERE ${where}`,
          whereParams
        );
        return { rows, rowCount: result.affectedRows ?? rows.length };
      }
    }
  }

  if (isDelete && preDeleteRows.length > 0) {
    return { rows: preDeleteRows, rowCount: result.affectedRows ?? preDeleteRows.length };
  }

  if (isSelect) {
    return { rows: Array.isArray(result) ? result : [], rowCount: Array.isArray(result) ? result.length : 0 };
  }

  return { rows: [], rowCount: result.affectedRows ?? 0 };
}

async function query(text, params = []) {
  return executeQuery(pool, text, params);
}

function wrapConnection(connection) {
  return {
    query: async (text, params = []) => {
      const trimmed = text.trim().toUpperCase();
      if (trimmed === 'BEGIN' || trimmed === 'START TRANSACTION') {
        await connection.beginTransaction();
        return { rows: [], rowCount: 0 };
      }
      if (trimmed === 'COMMIT') {
        await connection.commit();
        return { rows: [], rowCount: 0 };
      }
      if (trimmed === 'ROLLBACK') {
        await connection.rollback();
        return { rows: [], rowCount: 0 };
      }
      return executeQuery(connection, text, params);
    },
    release: () => connection.release(),
  };
}

async function getClient() {
  const connection = await pool.getConnection();
  return wrapConnection(connection);
}

pool.connect = getClient;

pool.query = async (text, params = []) => {
  const sql = transformSql(text);
  const [rows] = await pool.execute(sql, params);
  if (Array.isArray(rows)) {
    return { rows, rowCount: rows.length };
  }
  return { rows: [], rowCount: rows.affectedRows ?? 0 };
};

module.exports = { pool, query, getClient };
