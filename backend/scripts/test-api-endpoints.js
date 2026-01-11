/**
 * API Endpoints Test Script
 * 
 * Tests the key API endpoints to verify they're working
 */

const axios = require('axios');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const TEST_TOKEN = process.env.TEST_TOKEN || null; // Set this to a valid JWT token for testing

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(name, method, path, data = null, requiresAuth = true) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${path}`,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (requiresAuth && TEST_TOKEN) {
      config.headers['Authorization'] = `Bearer ${TEST_TOKEN}`;
    }
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    log(`✅ ${name} - Status: ${response.status}`, 'green');
    return { success: true, status: response.status, data: response.data };
  } catch (error) {
    if (error.response) {
      log(`❌ ${name} - Status: ${error.response.status} - ${error.response.data?.error || error.message}`, 'red');
      return { success: false, status: error.response.status, error: error.response.data };
    } else {
      log(`❌ ${name} - Network Error: ${error.message}`, 'red');
      return { success: false, error: error.message };
    }
  }
}

async function runTests() {
  log('\n🧪 Testing API Endpoints\n', 'blue');
  log('='.repeat(50), 'blue');
  
  const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
  };
  
  // Health check (no auth required)
  log('\n📋 Health Check\n', 'yellow');
  const healthResult = await testEndpoint('Health Check', 'GET', '/api/health', null, false);
  if (healthResult.success) results.passed++;
  else results.failed++;
  
  if (!TEST_TOKEN) {
    log('\n⚠️  No TEST_TOKEN provided - skipping authenticated endpoints', 'yellow');
    log('Set TEST_TOKEN environment variable to test authenticated endpoints', 'yellow');
    results.skipped = 10;
  } else {
    // RFQ Endpoints
    log('\n📋 RFQ Endpoints\n', 'yellow');
    
    const rfqListResult = await testEndpoint('Get RFQ List', 'GET', '/api/v1/rfqs/list');
    if (rfqListResult.success) results.passed++;
    else results.failed++;
    
    // Materials Endpoints
    log('\n📋 Materials Endpoints\n', 'yellow');
    
    const materialsSearchResult = await testEndpoint(
      'Search Materials',
      'GET',
      '/api/v1/materials/search?query=concrete&limit=10'
    );
    if (materialsSearchResult.success) results.passed++;
    else results.failed++;
    
    const materialsAssembliesResult = await testEndpoint(
      'Get Material Assemblies',
      'GET',
      '/api/v1/materials/meta/assemblies'
    );
    if (materialsAssembliesResult.success) results.passed++;
    else results.failed++;
    
    const materialsManufacturersResult = await testEndpoint(
      'Get Material Manufacturers',
      'GET',
      '/api/v1/materials/meta/manufacturers'
    );
    if (materialsManufacturersResult.success) results.passed++;
    else results.failed++;
    
    // Suppliers Endpoints
    log('\n📋 Suppliers Endpoints\n', 'yellow');
    
    const suppliersNearbyResult = await testEndpoint(
      'Find Nearby Suppliers',
      'GET',
      '/api/v1/suppliers/nearby?address=New%20York,%20NY&radius=50'
    );
    if (suppliersNearbyResult.success) results.passed++;
    else results.failed++;
    
    // AI Agents Endpoints
    log('\n📋 AI Agents Endpoints\n', 'yellow');
    
    const aiAgentsHealthResult = await testEndpoint('AI Agents Health', 'GET', '/api/v1/ai-agents/health');
    if (aiAgentsHealthResult.success) results.passed++;
    else results.failed++;
    
    const aiAgentsListResult = await testEndpoint('List AI Agents', 'GET', '/api/v1/ai-agents/list');
    if (aiAgentsListResult.success) results.passed++;
    else results.failed++;
  }
  
  // Summary
  log('\n' + '='.repeat(50), 'blue');
  log('\n📊 Test Results Summary\n', 'blue');
  log(`✅ Passed: ${results.passed}`, 'green');
  log(`❌ Failed: ${results.failed}`, 'red');
  log(`⏭️  Skipped: ${results.skipped}`, 'yellow');
  log(`\nTotal: ${results.passed + results.failed + results.skipped}\n`, 'blue');
  
  process.exit(results.failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  log(`\n❌ Test suite failed: ${error.message}`, 'red');
  process.exit(1);
});
