require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { query } = require('../config/database');

(async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS user_security (
      user_id CHAR(36) PRIMARY KEY,
      totp_secret VARCHAR(255),
      totp_enabled TINYINT(1) DEFAULT 0,
      notify_email TINYINT(1) DEFAULT 1,
      notify_sms TINYINT(1) DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('user_security table ready');
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
