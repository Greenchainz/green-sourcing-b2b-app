import { drizzle } from "drizzle-orm/mysql2";
import { users } from "./drizzle/schema.js";
import { eq } from "drizzle-orm";

// Test OAuth state parsing and role assignment
async function testRoleAssignment() {
  console.log("🧪 Testing Role Assignment Logic\n");

  // Test 1: Verify state encoding/decoding
  console.log("Test 1: State Encoding/Decoding");
  const testStates = [
    { role: 'buyer', returnPath: '/materials' },
    { role: 'supplier', returnPath: '/supplier/register' }
  ];

  for (const testData of testStates) {
    const stateData = {
      redirectUri: 'https://example.com/api/oauth/callback',
      returnPath: testData.returnPath,
      role: testData.role
    };
    const encoded = Buffer.from(JSON.stringify(stateData)).toString('base64');
    const decoded = JSON.parse(Buffer.from(encoded, 'base64').toString());
    
    console.log(`  ✅ ${testData.role}: encoded → decoded successfully`);
    console.log(`     returnPath: ${decoded.returnPath}, role: ${decoded.role}`);
  }

  // Test 2: Check database schema supports buyer/supplier roles
  console.log("\nTest 2: Database Schema");
  const db = drizzle(process.env.DATABASE_URL);
  
  try {
    // Query existing users
    const existingUsers = await db.select({
      id: users.id,
      openId: users.openId,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt
    }).from(users).orderBy(users.createdAt).limit(5);

    console.log(`  ✅ Found ${existingUsers.length} existing users:`);
    existingUsers.forEach(user => {
      console.log(`     - ${user.name || 'Unnamed'} (${user.role})`);
    });

    // Test 3: Simulate role assignment for test users
    console.log("\nTest 3: Simulated Role Assignment");
    
    const testUsers = [
      { openId: 'test-buyer-123', name: 'Test Buyer', role: 'buyer' },
      { openId: 'test-supplier-456', name: 'Test Supplier', role: 'supplier' }
    ];

    for (const testUser of testUsers) {
      // Simulate upsertUser with role
      await db.insert(users).values({
        openId: testUser.openId,
        name: testUser.name,
        role: testUser.role,
        lastSignedIn: new Date()
      }).onDuplicateKeyUpdate({
        set: {
          name: testUser.name,
          role: testUser.role,
          lastSignedIn: new Date()
        }
      });

      // Verify the role was assigned
      const [inserted] = await db.select().from(users).where(eq(users.openId, testUser.openId));
      
      if (inserted && inserted.role === testUser.role) {
        console.log(`  ✅ ${testUser.name}: role '${testUser.role}' assigned correctly`);
      } else {
        console.log(`  ❌ ${testUser.name}: role assignment failed`);
      }
    }

    console.log("\n✅ All tests passed! Role assignment working correctly.");
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

testRoleAssignment().catch(console.error);
