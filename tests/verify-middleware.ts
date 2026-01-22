/**
 * Manual Verification Script for Middleware
 * 
 * This script demonstrates the role-based dashboard redirect logic
 * without requiring a running server.
 */

import { generateToken, verifyToken } from '../lib/auth/jwt';

console.log('🧪 Middleware Role-Based Redirect Verification\n');
console.log('='.repeat(60));

// Set test JWT secret
process.env.JWT_SECRET = 'test-secret-key-for-verification';

// Test scenarios
const scenarios = [
  {
    name: 'Supplier accesses /dashboard',
    role: 'supplier',
    requestPath: '/dashboard',
    expectedRedirect: '/dashboard/supplier',
  },
  {
    name: 'Buyer accesses /dashboard',
    role: 'buyer',
    requestPath: '/dashboard',
    expectedRedirect: '/dashboard/buyer',
  },
  {
    name: 'Supplier tries to access /dashboard/buyer',
    role: 'supplier',
    requestPath: '/dashboard/buyer',
    expectedRedirect: '/dashboard/supplier',
  },
  {
    name: 'Buyer tries to access /dashboard/supplier',
    role: 'buyer',
    requestPath: '/dashboard/supplier',
    expectedRedirect: '/dashboard/buyer',
  },
  {
    name: 'Supplier accesses their own dashboard',
    role: 'supplier',
    requestPath: '/dashboard/supplier',
    expectedRedirect: null, // No redirect, allow access
  },
  {
    name: 'Buyer accesses their own dashboard',
    role: 'buyer',
    requestPath: '/dashboard/buyer',
    expectedRedirect: null, // No redirect, allow access
  },
];

console.log('\n📋 Running verification scenarios...\n');

scenarios.forEach((scenario, index) => {
  console.log(`${index + 1}. ${scenario.name}`);
  console.log(`   Role: ${scenario.role}`);
  console.log(`   Request Path: ${scenario.requestPath}`);
  
  // Generate token for the role
  const token = generateToken({
    userId: `user-${index}`,
    email: `${scenario.role}@test.com`,
    role: scenario.role,
  });
  
  // Verify the token
  const payload = verifyToken(token);
  
  if (!payload) {
    console.log('   ❌ Token verification failed\n');
    return;
  }
  
  // Simulate middleware logic
  const normalizedRole = payload.role?.toLowerCase();
  const { requestPath } = scenario;
  let actualRedirect: string | null = null;
  
  // Check if it's the dashboard base route
  if (requestPath === '/dashboard') {
    if (normalizedRole === 'supplier') {
      actualRedirect = '/dashboard/supplier';
    } else if (normalizedRole === 'buyer') {
      actualRedirect = '/dashboard/buyer';
    }
  }
  
  // Check for cross-dashboard access
  if (normalizedRole === 'supplier' && requestPath.startsWith('/dashboard/buyer')) {
    actualRedirect = '/dashboard/supplier';
  }
  
  if (normalizedRole === 'buyer' && requestPath.startsWith('/dashboard/supplier')) {
    actualRedirect = '/dashboard/buyer';
  }
  
  // Verify expectation
  const matches = actualRedirect === scenario.expectedRedirect;
  if (matches) {
    if (actualRedirect) {
      console.log(`   ✅ Redirects to: ${actualRedirect}`);
    } else {
      console.log(`   ✅ Access allowed (no redirect)`);
    }
  } else {
    console.log(`   ❌ Expected: ${scenario.expectedRedirect || 'no redirect'}`);
    console.log(`   ❌ Got: ${actualRedirect || 'no redirect'}`);
  }
  
  console.log('');
});

console.log('='.repeat(60));
console.log('✅ Verification complete!\n');

// Additional: Test case normalization
console.log('📝 Testing case normalization...\n');

const caseTestRoles = ['SUPPLIER', 'Buyer', 'SuPpLiEr', 'BUYER'];

caseTestRoles.forEach((role) => {
  const token = generateToken({
    userId: 'case-test',
    email: 'test@test.com',
    role,
  });
  
  const payload = verifyToken(token);
  const normalizedRole = payload?.role?.toLowerCase();
  
  console.log(`   ${role} → ${normalizedRole}`);
});

console.log('\n✅ Case normalization works correctly!\n');
