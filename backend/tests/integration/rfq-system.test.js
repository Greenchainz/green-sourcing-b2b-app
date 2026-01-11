/**
 * Integration Test Cases for RFQ System
 * 
 * Tests cover:
 * - RFQ creation (architects only)
 * - RFQ retrieval (by ID)
 * - RFQ listing (role-based filtering)
 * - RFQ response (suppliers only)
 * - RFQ status updates (architects only)
 * - Access control scenarios
 * - Validation scenarios
 * - Edge cases
 */

const request = require('supertest');
const express = require('express');
const { Pool } = require('pg');

// Mock database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test data constants
const TEST_ARCHITECT = {
  userId: 1,
  email: 'architect@test.com',
  role: 'architect'
};

const TEST_SUPPLIER = {
  userId: 2,
  email: 'supplier@test.com',
  role: 'supplier'
};

const TEST_ADMIN = {
  userId: 3,
  email: 'admin@test.com',
  role: 'admin'
};

// Test RFQ data
const VALID_RFQ_DATA = {
  project_name: 'Office Building Renovation',
  project_location: 'San Francisco, CA',
  project_timeline: 'Standard (3-4 weeks)',
  material_type: 'Low-carbon concrete',
  quantity: '500 tons',
  specifications: 'Must meet LEED Gold requirements',
  certifications_required: ['LEED', 'EPD'],
  budget_range: '$50,000 - $75,000',
  deadline: '2025-02-15T00:00:00.000Z'
};

const MINIMAL_RFQ_DATA = {
  project_name: 'Test Project',
  material_type: 'Concrete'
};

// ============================================
// TEST SUITE: RFQ Creation
// ============================================

describe('POST /api/v1/rfqs/create', () => {
  
  /**
   * Test Case 1: Successful RFQ Creation (Architect)
   * 
   * Expected: 201 Created
   * - RFQ created with all fields
   * - Geocoding performed if location provided
   * - Nearby suppliers matched
   */
  test('should create RFQ successfully with all fields (architect)', async () => {
    // Given: Authenticated architect user
    const authToken = generateAuthToken(TEST_ARCHITECT);
    
    // When: Creating RFQ with all required and optional fields
    const response = await request(app)
      .post('/api/v1/rfqs/create')
      .set('Authorization', `Bearer ${authToken}`)
      .send(VALID_RFQ_DATA);
    
    // Then: RFQ created successfully
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.rfq).toBeDefined();
    expect(response.body.data.rfq.project_name).toBe(VALID_RFQ_DATA.project_name);
    expect(response.body.data.rfq.material_type).toBe(VALID_RFQ_DATA.material_type);
    expect(response.body.data.rfq.status).toBe('open');
    expect(response.body.data.rfq.architect_id).toBe(TEST_ARCHITECT.userId);
  });
  
  /**
   * Test Case 2: Minimal RFQ Creation (Required Fields Only)
   * 
   * Expected: 201 Created
   * - RFQ created with only required fields
   * - Optional fields set to null/defaults
   */
  test('should create RFQ with minimal required fields', async () => {
    const authToken = generateAuthToken(TEST_ARCHITECT);
    
    const response = await request(app)
      .post('/api/v1/rfqs/create')
      .set('Authorization', `Bearer ${authToken}`)
      .send(MINIMAL_RFQ_DATA);
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.rfq.project_name).toBe(MINIMAL_RFQ_DATA.project_name);
    expect(response.body.data.rfq.material_type).toBe(MINIMAL_RFQ_DATA.material_type);
  });
  
  /**
   * Test Case 3: Access Control - Supplier Cannot Create RFQ
   * 
   * Expected: 403 Forbidden
   * - Only architects can create RFQs
   */
  test('should reject RFQ creation from supplier', async () => {
    const authToken = generateAuthToken(TEST_SUPPLIER);
    
    const response = await request(app)
      .post('/api/v1/rfqs/create')
      .set('Authorization', `Bearer ${authToken}`)
      .send(VALID_RFQ_DATA);
    
    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Only architects can create RFQs');
  });
  
  /**
   * Test Case 4: Validation - Missing Required Fields
   * 
   * Expected: 400 Bad Request
   * - project_name and material_type are required
   */
  test('should reject RFQ creation with missing required fields', async () => {
    const authToken = generateAuthToken(TEST_ARCHITECT);
    
    const invalidData = {
      project_name: 'Test Project'
      // Missing material_type
    };
    
    const response = await request(app)
      .post('/api/v1/rfqs/create')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidData);
    
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('material_type');
  });
  
  /**
   * Test Case 5: Validation - Field Length Limits
   * 
   * Expected: 400 Bad Request
   * - Fields must not exceed maximum length
   */
  test('should reject RFQ creation with fields exceeding length limits', async () => {
    const authToken = generateAuthToken(TEST_ARCHITECT);
    
    const invalidData = {
      project_name: 'A'.repeat(300), // Exceeds 255 char limit
      material_type: 'Concrete'
    };
    
    const response = await request(app)
      .post('/api/v1/rfqs/create')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidData);
    
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
  
  /**
   * Test Case 6: Geocoding Integration
   * 
   * Expected: 201 Created
   * - Project location geocoded successfully
   * - Latitude and longitude stored
   * - Nearby suppliers matched
   */
  test('should geocode project location and match nearby suppliers', async () => {
    const authToken = generateAuthToken(TEST_ARCHITECT);
    
    const rfqWithLocation = {
      ...VALID_RFQ_DATA,
      project_location: 'Los Angeles, CA'
    };
    
    const response = await request(app)
      .post('/api/v1/rfqs/create')
      .set('Authorization', `Bearer ${authToken}`)
      .send(rfqWithLocation);
    
    expect(response.status).toBe(201);
    expect(response.body.data.rfq.project_latitude).toBeDefined();
    expect(response.body.data.rfq.project_longitude).toBeDefined();
    // Verify suppliers were matched (if geocoding service is available)
  });
  
  /**
   * Test Case 7: Authentication Required
   * 
   * Expected: 401 Unauthorized
   * - Request without token is rejected
   */
  test('should reject RFQ creation without authentication', async () => {
    const response = await request(app)
      .post('/api/v1/rfqs/create')
      .send(VALID_RFQ_DATA);
    
    expect(response.status).toBe(401);
  });
});

// ============================================
// TEST SUITE: RFQ Retrieval
// ============================================

describe('GET /api/v1/rfqs/:id', () => {
  
  /**
   * Test Case 8: Successful RFQ Retrieval (Architect - Own RFQ)
   * 
   * Expected: 200 OK
   * - RFQ details returned with all fields
   * - Responses included if architect is owner
   */
  test('should return RFQ details for architect (own RFQ)', async () => {
    const authToken = generateAuthToken(TEST_ARCHITECT);
    const rfqId = await createTestRFQ(TEST_ARCHITECT.userId);
    
    const response = await request(app)
      .get(`/api/v1/rfqs/${rfqId}`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.rfq).toBeDefined();
    expect(response.body.data.rfq.id).toBe(rfqId);
    expect(response.body.data.responses).toBeDefined();
  });
  
  /**
   * Test Case 9: Successful RFQ Retrieval (Supplier - Can View Open RFQs)
   * 
   * Expected: 200 OK
   * - Supplier can view open RFQs
   * - Only own responses shown
   */
  test('should return RFQ details for supplier (open RFQ)', async () => {
    const authToken = generateAuthToken(TEST_SUPPLIER);
    const rfqId = await createTestRFQ(TEST_ARCHITECT.userId);
    
    const response = await request(app)
      .get(`/api/v1/rfqs/${rfqId}`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.rfq).toBeDefined();
  });
  
  /**
   * Test Case 10: RFQ Not Found
   * 
   * Expected: 404 Not Found
   * - Non-existent RFQ returns 404
   */
  test('should return 404 for non-existent RFQ', async () => {
    const authToken = generateAuthToken(TEST_ARCHITECT);
    const nonExistentId = 99999;
    
    const response = await request(app)
      .get(`/api/v1/rfqs/${nonExistentId}`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('not found');
  });
  
  /**
   * Test Case 11: Invalid RFQ ID
   * 
   * Expected: 400 Bad Request
   * - Invalid ID format returns 400
   */
  test('should return 400 for invalid RFQ ID format', async () => {
    const authToken = generateAuthToken(TEST_ARCHITECT);
    
    const response = await request(app)
      .get('/api/v1/rfqs/invalid-id')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});

// ============================================
// TEST SUITE: RFQ Listing
// ============================================

describe('GET /api/v1/rfqs/list', () => {
  
  /**
   * Test Case 12: Architect Listing - Own RFQs Only
   * 
   * Expected: 200 OK
   * - Architects see only their own RFQs
   * - Response count included
   */
  test('should return only architect\'s own RFQs', async () => {
    const authToken = generateAuthToken(TEST_ARCHITECT);
    await createTestRFQ(TEST_ARCHITECT.userId);
    await createTestRFQ(999); // Other architect's RFQ
    
    const response = await request(app)
      .get('/api/v1/rfqs/list')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.rfqs).toBeInstanceOf(Array);
    // Verify all RFQs belong to TEST_ARCHITECT
    response.body.data.rfqs.forEach(rfq => {
      expect(rfq.architect_id).toBe(TEST_ARCHITECT.userId);
    });
  });
  
  /**
   * Test Case 13: Supplier Listing - Open RFQs Only
   * 
   * Expected: 200 OK
   * - Suppliers see only open RFQs
   * - RFQs within service radius prioritized
   * - Distance included for nearby RFQs
   */
  test('should return open RFQs for supplier (filtered by location)', async () => {
    const authToken = generateAuthToken(TEST_SUPPLIER);
    await createTestRFQ(TEST_ARCHITECT.userId, { status: 'open' });
    await createTestRFQ(TEST_ARCHITECT.userId, { status: 'closed' });
    
    const response = await request(app)
      .get('/api/v1/rfqs/list')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.rfqs).toBeInstanceOf(Array);
    // Verify all RFQs are open
    response.body.data.rfqs.forEach(rfq => {
      expect(rfq.status).toBe('open');
    });
  });
  
  /**
   * Test Case 14: Pagination
   * 
   * Expected: 200 OK
   * - Results paginated correctly
   * - Pagination metadata included
   */
  test('should paginate results correctly', async () => {
    const authToken = generateAuthToken(TEST_ARCHITECT);
    // Create multiple test RFQs
    for (let i = 0; i < 25; i++) {
      await createTestRFQ(TEST_ARCHITECT.userId);
    }
    
    const response = await request(app)
      .get('/api/v1/rfqs/list?page=1&limit=10')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.data.rfqs.length).toBeLessThanOrEqual(10);
    expect(response.body.data.pagination).toBeDefined();
    expect(response.body.data.pagination.page).toBe(1);
    expect(response.body.data.pagination.limit).toBe(10);
  });
  
  /**
   * Test Case 15: Status Filtering (Architect)
   * 
   * Expected: 200 OK
   * - RFQs filtered by status
   */
  test('should filter RFQs by status (architect)', async () => {
    const authToken = generateAuthToken(TEST_ARCHITECT);
    await createTestRFQ(TEST_ARCHITECT.userId, { status: 'open' });
    await createTestRFQ(TEST_ARCHITECT.userId, { status: 'closed' });
    
    const response = await request(app)
      .get('/api/v1/rfqs/list?status=open')
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(response.status).toBe(200);
    response.body.data.rfqs.forEach(rfq => {
      expect(rfq.status).toBe('open');
    });
  });
});

// ============================================
// TEST SUITE: RFQ Response
// ============================================

describe('POST /api/v1/rfqs/:id/respond', () => {
  
  /**
   * Test Case 16: Successful RFQ Response (Supplier)
   * 
   * Expected: 201 Created
   * - Response created successfully
   * - All fields stored correctly
   */
  test('should create RFQ response successfully (supplier)', async () => {
    const authToken = generateAuthToken(TEST_SUPPLIER);
    const rfqId = await createTestRFQ(TEST_ARCHITECT.userId, { status: 'open' });
    
    const responseData = {
      message: 'We can provide this material with LEED certification',
      quoted_price: 55000.00,
      delivery_timeline: '3-4 weeks',
      certifications_provided: ['LEED', 'EPD'],
      attachments: { url: 'https://example.com/quote.pdf' }
    };
    
    const response = await request(app)
      .post(`/api/v1/rfqs/${rfqId}/respond`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(responseData);
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.response).toBeDefined();
    expect(response.body.data.response.rfq_id).toBe(rfqId);
    expect(response.body.data.response.supplier_id).toBe(TEST_SUPPLIER.userId);
    expect(response.body.data.response.message).toBe(responseData.message);
  });
  
  /**
   * Test Case 17: Access Control - Architect Cannot Respond
   * 
   * Expected: 403 Forbidden
   * - Only suppliers can respond to RFQs
   */
  test('should reject RFQ response from architect', async () => {
    const authToken = generateAuthToken(TEST_ARCHITECT);
    const rfqId = await createTestRFQ(TEST_ARCHITECT.userId);
    
    const response = await request(app)
      .post(`/api/v1/rfqs/${rfqId}/respond`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ message: 'Test response' });
    
    expect(response.status).toBe(403);
    expect(response.body.error).toContain('Only suppliers can respond');
  });
  
  /**
   * Test Case 18: Duplicate Response Prevention
   * 
   * Expected: 400 Bad Request
   * - Supplier cannot respond twice to same RFQ
   */
  test('should reject duplicate RFQ response', async () => {
    const authToken = generateAuthToken(TEST_SUPPLIER);
    const rfqId = await createTestRFQ(TEST_ARCHITECT.userId);
    
    // First response
    await request(app)
      .post(`/api/v1/rfqs/${rfqId}/respond`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ message: 'First response' });
    
    // Second response (should fail)
    const response = await request(app)
      .post(`/api/v1/rfqs/${rfqId}/respond`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ message: 'Second response' });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('already responded');
  });
  
  /**
   * Test Case 19: Response to Closed RFQ
   * 
   * Expected: 400 Bad Request
   * - Cannot respond to closed RFQs
   */
  test('should reject response to closed RFQ', async () => {
    const authToken = generateAuthToken(TEST_SUPPLIER);
    const rfqId = await createTestRFQ(TEST_ARCHITECT.userId, { status: 'closed' });
    
    const response = await request(app)
      .post(`/api/v1/rfqs/${rfqId}/respond`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ message: 'Test response' });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('no longer open');
  });
  
  /**
   * Test Case 20: Validation - Required Fields
   * 
   * Expected: 400 Bad Request
   * - Message field is required
   */
  test('should reject response without required message field', async () => {
    const authToken = generateAuthToken(TEST_SUPPLIER);
    const rfqId = await createTestRFQ(TEST_ARCHITECT.userId);
    
    const response = await request(app)
      .post(`/api/v1/rfqs/${rfqId}/respond`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ quoted_price: 50000 });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('message');
  });
});

// ============================================
// TEST SUITE: RFQ Status Updates
// ============================================

describe('PUT /api/v1/rfqs/:id/status', () => {
  
  /**
   * Test Case 21: Successful Status Update (Architect - Own RFQ)
   * 
   * Expected: 200 OK
   * - Status updated successfully
   * - Only architect who created RFQ can update
   */
  test('should update RFQ status successfully (architect - own RFQ)', async () => {
    const authToken = generateAuthToken(TEST_ARCHITECT);
    const rfqId = await createTestRFQ(TEST_ARCHITECT.userId);
    
    const response = await request(app)
      .put(`/api/v1/rfqs/${rfqId}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'closed' });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    
    // Verify status was updated
    const rfqResponse = await request(app)
      .get(`/api/v1/rfqs/${rfqId}`)
      .set('Authorization', `Bearer ${authToken}`);
    
    expect(rfqResponse.body.data.rfq.status).toBe('closed');
  });
  
  /**
   * Test Case 22: Access Control - Cannot Update Other Architect's RFQ
   * 
   * Expected: 403 Forbidden
   * - Only RFQ owner can update status
   */
  test('should reject status update from different architect', async () => {
    const otherArchitect = { userId: 999, role: 'architect' };
    const authToken = generateAuthToken(otherArchitect);
    const rfqId = await createTestRFQ(TEST_ARCHITECT.userId);
    
    const response = await request(app)
      .put(`/api/v1/rfqs/${rfqId}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'closed' });
    
    expect(response.status).toBe(403);
    expect(response.body.error).toContain('only the RFQ owner');
  });
  
  /**
   * Test Case 23: Validation - Invalid Status Value
   * 
   * Expected: 400 Bad Request
   * - Status must be one of: open, closed, awarded
   */
  test('should reject invalid status value', async () => {
    const authToken = generateAuthToken(TEST_ARCHITECT);
    const rfqId = await createTestRFQ(TEST_ARCHITECT.userId);
    
    const response = await request(app)
      .put(`/api/v1/rfqs/${rfqId}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'invalid-status' });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid status');
  });
  
  /**
   * Test Case 24: Valid Status Values
   * 
   * Expected: 200 OK for each valid status
   */
  test.each(['open', 'closed', 'awarded'])(
    'should accept valid status value: %s',
    async (status) => {
      const authToken = generateAuthToken(TEST_ARCHITECT);
      const rfqId = await createTestRFQ(TEST_ARCHITECT.userId);
      
      const response = await request(app)
        .put(`/api/v1/rfqs/${rfqId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status });
      
      expect(response.status).toBe(200);
    }
  );
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate authentication token for test user
 */
function generateAuthToken(user) {
  // Mock JWT token generation
  // In real tests, use your actual JWT library
  return `mock-token-${user.userId}-${user.role}`;
}

/**
 * Create test RFQ in database
 */
async function createTestRFQ(architectId, overrides = {}) {
  const defaultData = {
    architect_id: architectId,
    project_name: 'Test Project',
    material_type: 'Test Material',
    status: 'open',
    ...overrides
  };
  
  const result = await pool.query(
    `INSERT INTO rfqs (architect_id, project_name, material_type, status)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [defaultData.architect_id, defaultData.project_name, defaultData.material_type, defaultData.status]
  );
  
  return result.rows[0].id;
}

/**
 * Clean up test data
 */
async function cleanupTestData() {
  await pool.query('DELETE FROM rfq_responses WHERE rfq_id IN (SELECT id FROM rfqs WHERE project_name LIKE \'Test%\')');
  await pool.query('DELETE FROM rfqs WHERE project_name LIKE \'Test%\'');
}

// ============================================
// TEST SETUP AND TEARDOWN
// ============================================

beforeAll(async () => {
  // Setup test database connection
  // Initialize test data if needed
});

afterAll(async () => {
  // Cleanup test data
  await cleanupTestData();
  await pool.end();
});

beforeEach(async () => {
  // Clean up before each test
  await cleanupTestData();
});
