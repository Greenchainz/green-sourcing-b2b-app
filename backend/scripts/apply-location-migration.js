/**
 * Apply Location Coordinates Migration
 * 
 * This script applies the location coordinates migration to Azure PostgreSQL.
 * It adds latitude/longitude columns to Companies and rfqs tables.
 */

const { pool } = require('../db');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
  const client = await pool.connect();
  
  try {
    console.log('📊 Starting location coordinates migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../../database-schemas/migrations/20260108_130000_add_location_coordinates.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Extract UP MIGRATION section
    const lines = sql.split('\n');
    const upStart = lines.findIndex(line => line.includes('-- UP MIGRATION'));
    const downStart = lines.findIndex(line => line.includes('-- DOWN MIGRATION'));
    
    let sqlToExecute = lines.slice(upStart + 1, downStart > -1 ? downStart : lines.length)
      .filter(line => !line.trim().startsWith('--') || line.trim() === '--')
      .filter(line => !line.trim().startsWith('COMMENT'))
      .join('\n');
    
    // Remove verification section if present
    const verificationStart = sqlToExecute.indexOf('-- ============================================');
    if (verificationStart > -1) {
      sqlToExecute = sqlToExecute.substring(0, verificationStart);
    }
    
    console.log('🔄 Executing migration SQL...');
    
    // Execute the migration in a transaction
    await client.query('BEGIN');
    
    // Split by semicolons and execute each statement
    const statements = sqlToExecute.split(';').filter(s => s.trim().length > 0);
    for (const statement of statements) {
      const trimmed = statement.trim();
      if (trimmed) {
        await client.query(trimmed);
      }
    }
    
    await client.query('COMMIT');
    
    console.log('✅ Migration applied successfully!');
    
    // Verify the columns were added
    const companiesCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Companies' AND column_name IN ('latitude', 'longitude')
    `);
    
    const rfqsCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'rfqs' AND column_name IN ('latitude', 'longitude')
    `);
    
    if (companiesCheck.rows.length === 2) {
      console.log('✅ Verified: Companies table has latitude/longitude columns');
    } else {
      console.log('⚠️  Warning: Companies table columns not found');
    }
    
    if (rfqsCheck.rows.length === 2) {
      console.log('✅ Verified: rfqs table has latitude/longitude columns');
    } else {
      console.log('⚠️  Warning: rfqs table columns not found');
    }
    
    // Check indexes
    const indexCheck = await client.query(`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE tablename IN ('Companies', 'rfqs') 
      AND indexname LIKE '%location%'
    `);
    
    console.log(`✅ Verified: ${indexCheck.rows.length} location indexes created`);
    indexCheck.rows.forEach(row => {
      console.log(`   - ${row.indexname} on ${row.tablename}`);
    });
    
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
applyMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
