const fs = require('fs');
const path = require('path');
const { pool } = require('../../db');

/**
 * Apply a SQL file to the configured Postgres database.
 *
 * Usage:
 *   node backend/scripts/db/apply-sql-file.js <path-to-sql>
 */
async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    // eslint-disable-next-line no-console
    console.error('Usage: node backend/scripts/db/apply-sql-file.js <path-to-sql>');
    process.exit(1);
  }

  const resolved = path.isAbsolute(inputPath) ? inputPath : path.resolve(process.cwd(), inputPath);
  const sql = fs.readFileSync(resolved, 'utf8');

  const client = await pool.connect();
  try {
    // eslint-disable-next-line no-console
    console.log(`Applying SQL file: ${resolved}`);
    await client.query(sql);
    // eslint-disable-next-line no-console
    console.log('✅ Applied successfully');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('❌ Failed applying SQL file:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    // Close pool so the process exits cleanly
    await pool.end();
  }
}

main();

