const { query } = require('./src/config/database');

async function main() {
  const filter = await query(`
    SELECT
      SUM(CASE WHEN status NOT IN ('archived', 'completed') THEN 1 ELSE 0 END) as active_projects,
      SUM(CASE WHEN approval_status = 'pending' THEN 1 ELSE 0 END) as pending_approval
    FROM projects
  `);
  console.log('filter ok', filter.rows);

  const paginate = await query(
    'SELECT id FROM projects ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [100, 0]
  );
  console.log('paginate ok', paginate.rows.length);
}

main().catch((err) => {
  console.error('verify failed', err.message);
  process.exit(1);
});
