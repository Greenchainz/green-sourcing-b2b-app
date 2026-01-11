/**
 * Database Table Verification Script
 * 
 * Checks which tables exist and verifies table structure matches code expectations
 */

const { pool } = require('../db');

async function checkTableExists(tableName) {
  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )
    `, [tableName]);
    return result.rows[0].exists;
  } catch (error) {
    console.error(`Error checking table ${tableName}:`, error.message);
    return false;
  }
}

async function getTableColumns(tableName) {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);
    return result.rows;
  } catch (error) {
    console.error(`Error getting columns for ${tableName}:`, error.message);
    return [];
  }
}

async function verifyTables() {
  console.log('🔍 Verifying database tables...\n');
  
  // Tables that backend code expects (lowercase)
  const expectedTables = [
    'rfqs',
    'rfq_responses',
    'materials',
    'rfq_supplier_matches',
    'users' // Note: PostgreSQL may store as 'Users' but queries should work
  ];
  
  // Also check capitalized versions
  const alternativeTables = [
    'RFQs',
    'RFQ_Responses',
    'Materials',
    'Users'
  ];
  
  const results = {
    found: [],
    missing: [],
    needsMigration: []
  };
  
  console.log('📊 Checking expected tables (lowercase):\n');
  for (const table of expectedTables) {
    const exists = await checkTableExists(table);
    if (exists) {
      console.log(`✅ ${table} - EXISTS`);
      const columns = await getTableColumns(table);
      console.log(`   Columns: ${columns.map(c => c.column_name).join(', ')}`);
      results.found.push({ table, columns });
    } else {
      console.log(`❌ ${table} - MISSING`);
      results.missing.push(table);
    }
  }
  
  console.log('\n📊 Checking alternative tables (capitalized):\n');
  for (const table of alternativeTables) {
    const exists = await checkTableExists(table);
    if (exists) {
      console.log(`⚠️  ${table} - EXISTS (but code expects lowercase)`);
      results.needsMigration.push(table);
    }
  }
  
  // Check Users table for location columns
  console.log('\n📍 Checking Users table for location columns:\n');
  const usersTable = await checkTableExists('Users') ? 'Users' : (await checkTableExists('users') ? 'users' : null);
  if (usersTable) {
    const columns = await getTableColumns(usersTable);
    const locationColumns = ['latitude', 'longitude', 'service_radius', 'address', 'city', 'state'];
    const foundLocationColumns = columns.filter(c => locationColumns.includes(c.column_name));
    console.log(`✅ Users table exists: ${usersTable}`);
    console.log(`   Location columns found: ${foundLocationColumns.map(c => c.column_name).join(', ') || 'NONE'}`);
    if (foundLocationColumns.length < locationColumns.length) {
      console.log(`   ⚠️  Missing columns: ${locationColumns.filter(c => !foundLocationColumns.find(f => f.column_name === c)).join(', ')}`);
    }
  } else {
    console.log('❌ Users table not found');
  }
  
  // Check rfqs table for location columns
  console.log('\n📍 Checking rfqs table for location columns:\n');
  const rfqsTable = await checkTableExists('rfqs') ? 'rfqs' : (await checkTableExists('RFQs') ? 'RFQs' : null);
  if (rfqsTable) {
    const columns = await getTableColumns(rfqsTable);
    const locationColumns = ['project_latitude', 'project_longitude', 'project_location'];
    const foundLocationColumns = columns.filter(c => locationColumns.includes(c.column_name));
    console.log(`✅ rfqs table exists: ${rfqsTable}`);
    console.log(`   Location columns found: ${foundLocationColumns.map(c => c.column_name).join(', ') || 'NONE'}`);
    if (foundLocationColumns.length < locationColumns.length) {
      console.log(`   ⚠️  Missing columns: ${locationColumns.filter(c => !foundLocationColumns.find(f => f.column_name === c)).join(', ')}`);
    }
  } else {
    console.log('❌ rfqs table not found');
  }
  
  console.log('\n📋 Summary:\n');
  console.log(`✅ Tables found: ${results.found.length}`);
  console.log(`❌ Tables missing: ${results.missing.length}`);
  console.log(`⚠️  Tables needing migration: ${results.needsMigration.length}`);
  
  if (results.missing.length > 0) {
    console.log('\n❌ Missing tables:');
    results.missing.forEach(t => console.log(`   - ${t}`));
  }
  
  if (results.needsMigration.length > 0) {
    console.log('\n⚠️  Tables with wrong case (need migration):');
    results.needsMigration.forEach(t => console.log(`   - ${t} (code expects lowercase)`));
  }
  
  await pool.end();
  process.exit(results.missing.length > 0 || results.needsMigration.length > 0 ? 1 : 0);
}

verifyTables().catch(error => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});
