const path = require('path');
const { spawnSync } = require('child_process');

/**
 * Convenience wrapper to apply the canonical Azure RFQ simulator schema.
 *
 * Uses the generic apply-sql-file script so we keep one execution path.
 */
function main() {
  const schemaPath = path.resolve(__dirname, '../../../database-schemas/azure_postgres_rfq_simulator.sql');
  const runnerPath = path.resolve(__dirname, './apply-sql-file.js');

  const res = spawnSync(process.execPath, [runnerPath, schemaPath], { stdio: 'inherit' });
  process.exit(res.status ?? 1);
}

main();

