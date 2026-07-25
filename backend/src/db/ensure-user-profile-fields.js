require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { query } = require('../config/database');

const cols = ['job_title VARCHAR(120)', 'department VARCHAR(120)'];

(async () => {
  for (const col of cols) {
    const name = col.split(' ')[0];
    try {
      await query(`ALTER TABLE users ADD COLUMN ${col}`);
      console.log(`Added users.${name}`);
    } catch (e) {
      if (!/Duplicate column/i.test(e.message)) throw e;
    }
  }
  console.log('user profile columns ready');
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
