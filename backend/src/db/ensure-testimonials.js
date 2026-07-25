require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { query } = require('../config/database');

(async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS testimonials (
      id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      author_name VARCHAR(120) NOT NULL,
      author_role VARCHAR(255),
      quote TEXT NOT NULL,
      email VARCHAR(255),
      status VARCHAR(20) DEFAULT 'pending',
      approved_at DATETIME,
      rejected_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  try {
    await query('CREATE INDEX idx_testimonials_status ON testimonials(status)');
  } catch {
    /* exists */
  }
  console.log('testimonials table ready');
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
