const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

const IGNORABLE_ERROR_CODES = new Set([
  'ER_DUP_ENTRY',
  'ER_DUP_KEYNAME',
  'ER_TABLE_EXISTS_ERROR',
]);

function stripLineComments(sql) {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .trim();
}

function splitStatements(schema) {
  return schema
    .split(';')
    .map((statement) => stripLineComments(statement))
    .filter((statement) => statement.length > 0);
}

async function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  const statements = splitStatements(schema);

  try {
    console.log('Running database migrations...');

    for (const statement of statements) {
      try {
        await pool.query(`${statement};`);
      } catch (err) {
        if (!IGNORABLE_ERROR_CODES.has(err.code)) {
          throw err;
        }
      }
    }

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
