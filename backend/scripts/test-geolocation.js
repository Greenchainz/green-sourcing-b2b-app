/**
 * Test Geolocation System
 * 
 * This script tests the geolocation features:
 * - Geocoding service
 * - Distance calculation
 * - Supplier matching
 */

const { geocodeAddress, calculateDistance, findSuppliersNearby } = require('../services/geocoding');
const { pool } = require('../db');

async function testGeocoding() {
  console.log('\n📍 Testing Geocoding Service...\n');
  
  // Test 1: Geocode a known address
  console.log('Test 1: Geocode "New York, NY"');
  try {
    const result = await geocodeAddress('New York, NY');
    if (result) {
      console.log('✅ Geocoding successful:', {
        latitude: result.latitude,
        longitude: result.longitude,
        city: result.city,
        state: result.state,
        formattedAddress: result.formattedAddress
      });
      
      // Test 2: Distance calculation
      console.log('\nTest 2: Calculate distance between NYC and Los Angeles');
      const nyc = { lat: 40.7128, lon: -74.0060 };
      const la = { lat: 34.0522, lon: -118.2437 };
      const distance = calculateDistance(nyc.lat, nyc.lon, la.lat, la.lon);
      console.log(`✅ Distance: ${distance} miles (expected ~2445 miles)`);
      
      // Test 3: Test with actual geocoded result
      if (result.latitude && result.longitude) {
        console.log('\nTest 3: Calculate distance from NYC to geocoded location');
        const distance2 = calculateDistance(nyc.lat, nyc.lon, result.latitude, result.longitude);
        console.log(`✅ Distance: ${distance2} miles`);
      }
    } else {
      console.log('⚠️  Geocoding returned null (Azure Maps API key may not be configured)');
      console.log('   This is expected if AZURE_MAPS_KEY is not set');
    }
  } catch (error) {
    console.error('❌ Geocoding test failed:', error.message);
  }
}

async function testDatabaseConnection() {
  console.log('\n📊 Testing Database Connection...\n');
  
  try {
    // Test 1: Check if Users table has location columns
    console.log('Test 1: Check Users table structure');
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Users' 
      AND column_name IN ('latitude', 'longitude', 'service_radius', 'address', 'city', 'state')
      ORDER BY column_name
    `);
    
    if (columns.rows.length > 0) {
      console.log('✅ Location columns found in Users table:');
      columns.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });
    } else {
      console.log('⚠️  Location columns not found - migration may not have been run yet');
    }
    
    // Test 2: Check if rfqs table has location columns
    console.log('\nTest 2: Check rfqs table structure');
    const rfqColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'rfqs' 
      AND column_name IN ('project_latitude', 'project_longitude')
      ORDER BY column_name
    `);
    
    if (rfqColumns.rows.length > 0) {
      console.log('✅ Location columns found in rfqs table:');
      rfqColumns.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });
    } else {
      console.log('⚠️  Location columns not found - migration may not have been run yet');
    }
    
    // Test 3: Check if rfq_supplier_matches table exists
    console.log('\nTest 3: Check rfq_supplier_matches table');
    const tableCheck = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = 'rfq_supplier_matches'
    `);
    
    if (tableCheck.rows.length > 0) {
      console.log('✅ rfq_supplier_matches table exists');
      
      // Check table structure
      const matchColumns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'rfq_supplier_matches'
        ORDER BY ordinal_position
      `);
      console.log('   Columns:', matchColumns.rows.map(c => c.column_name).join(', '));
    } else {
      console.log('⚠️  rfq_supplier_matches table not found - migration may not have been run yet');
    }
    
    // Test 4: Check for suppliers with locations
    console.log('\nTest 4: Check suppliers with location data');
    const suppliers = await pool.query(`
      SELECT 
        UserID,
        Email,
        city,
        state,
        latitude,
        longitude,
        service_radius
      FROM Users
      WHERE role = 'supplier'
      AND latitude IS NOT NULL
      AND longitude IS NOT NULL
      LIMIT 5
    `);
    
    if (suppliers.rows.length > 0) {
      console.log(`✅ Found ${suppliers.rows.length} suppliers with location data:`);
      suppliers.rows.forEach(s => {
        console.log(`   - ${s.Email || 'N/A'}: (${s.latitude}, ${s.longitude}), radius: ${s.service_radius || 'N/A'} miles`);
      });
    } else {
      console.log('⚠️  No suppliers with location data found');
      console.log('   Suppliers need to have latitude/longitude set');
    }
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    if (error.code === '42P01') {
      console.log('   Table does not exist - run migration first');
    }
  }
}

async function testFindNearbySuppliers() {
  console.log('\n🔍 Testing Find Nearby Suppliers...\n');
  
  try {
    // Test with NYC coordinates
    const nycLat = 40.7128;
    const nycLon = -74.0060;
    const radius = 100; // 100 miles
    
    console.log(`Test: Find suppliers within ${radius} miles of NYC (${nycLat}, ${nycLon})`);
    const nearby = await findSuppliersNearby(nycLat, nycLon, radius);
    
    if (nearby.length > 0) {
      console.log(`✅ Found ${nearby.length} suppliers within ${radius} miles:`);
      nearby.slice(0, 5).forEach(s => {
        console.log(`   - ${s.name || s.email}: ${s.distance} miles away`);
      });
    } else {
      console.log(`⚠️  No suppliers found within ${radius} miles`);
      console.log('   This is expected if no suppliers have location data');
    }
  } catch (error) {
    console.error('❌ Find nearby suppliers test failed:', error.message);
  }
}

async function runAllTests() {
  console.log('🧪 Testing Geolocation System\n');
  console.log('='.repeat(60));
  
  try {
    await testGeocoding();
    await testDatabaseConnection();
    await testFindNearbySuppliers();
    
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ All tests completed!');
    console.log('\nNote: Some tests may show warnings if:');
    console.log('  - Migration has not been run yet');
    console.log('  - AZURE_MAPS_KEY is not configured');
    console.log('  - No suppliers have location data yet');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
