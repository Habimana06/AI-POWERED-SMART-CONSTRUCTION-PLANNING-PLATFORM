require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { query } = require('../config/database');

(async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      name VARCHAR(120) NOT NULL,
      email VARCHAR(255) NOT NULL,
      company VARCHAR(255),
      subject VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      status VARCHAR(20) DEFAULT 'new',
      admin_reply TEXT,
      replied_at DATETIME,
      replied_by CHAR(36),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (replied_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  try {
    await query('CREATE INDEX idx_contact_messages_status ON contact_messages(status)');
  } catch {
    /* exists */
  }
  console.log('contact_messages table ready');
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
