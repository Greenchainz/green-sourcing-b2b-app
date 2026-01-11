/**
 * Apply Materials Table Migration
 * 
 * This script applies the materials table migration to Azure PostgreSQL.
 * It reads the SQL file and executes it using the database connection pool.
 */

const { pool } = require('../db');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
  const client = await pool.connect();
  
  try {
    console.log('📊 Starting materials table migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../../database-schemas/migrations/20260108_120000_add_materials_table.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
    
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Extract UP MIGRATION section (skip comments and DOWN MIGRATION)
    const lines = sql.split('\n');
    const upStart = lines.findIndex(line => line.includes('-- UP MIGRATION'));
    const downStart = lines.findIndex(line => line.includes('-- DOWN MIGRATION'));
    
    // Get lines between UP MIGRATION and DOWN MIGRATION (or end of file)
    let sqlToExecute = lines.slice(upStart + 1, downStart > -1 ? downStart : lines.length)
      .join('\n');
    
    // Remove verification/comments section
    const verificationStart = sqlToExecute.indexOf('-- ============================================');
    if (verificationStart > -1) {
      sqlToExecute = sqlToExecute.substring(0, verificationStart);
    }
    
    // Remove COMMENT ON statements (they may fail if table doesn't exist yet in some setups)
    sqlToExecute = sqlToExecute.replace(/COMMENT ON .*?;/g, '');
    
    console.log('🔄 Executing migration SQL...');
    
    // Start transaction
    await client.query('BEGIN');
    
    // Split by semicolons and execute each statement
    // Filter out empty statements and comments
    const statements = sqlToExecute
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await client.query(statement);
        } catch (error) {
          // Some statements like CREATE INDEX IF NOT EXISTS may already exist
          if (error.message.includes('already exists')) {
            console.log(`⚠️  Warning: ${error.message.split('\n')[0]}`);
          } else {
            throw error;
          }
        }
      }
    }
    
    await client.query('COMMIT');
    
    console.log('✅ Migration applied successfully!');
    
    // Verify the table was created
    const tableCheck = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = 'materials'
    `);
    
    if (tableCheck.rows.length > 0) {
      console.log('✅ Verified: materials table exists');
      
      // Check indexes
      const indexCheck = await client.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public' AND tablename = 'materials'
        ORDER BY indexname
      `);
      
      console.log(`✅ Verified: ${indexCheck.rows.length} indexes created`);
      indexCheck.rows.forEach(row => {
        console.log(`   - ${row.indexname}`);
      });
      
      // Check columns
      const columnCheck = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'materials'
        ORDER BY ordinal_position
      `);
      
      console.log(`✅ Verified: ${columnCheck.rows.length} columns in materials table`);
      
    } else {
      console.log('⚠️  Warning: materials table not found after migration');
    }
    
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {}); // Ignore rollback errors
    console.error('❌ Migration failed:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    if (error.position) {
      console.error(`   Position: ${error.position}`);
    }
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
