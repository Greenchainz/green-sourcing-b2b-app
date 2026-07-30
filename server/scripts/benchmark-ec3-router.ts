import { getDb } from "../db";
import { materials } from "../../drizzle/schema";
import { eq, inArray } from "drizzle-orm";

async function benchmark() {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  console.log("Setting up test data...");
  const materialList = [];
  for (let i = 0; i < 50; i++) {
    materialList.push({
      ec3Id: `test-ec3-id-${i}`,
      name: `Test Material ${i}`,
      category: "Test",
      gwp: 100,
    });
  }

  // Measure N+1 Query
  console.log("Running N+1 query...");
  const startNPlus1 = Date.now();
  let foundNPlus1 = 0;
  for (const material of materialList) {
    const existing = await db
      .select()
      .from(materials)
      .where(eq(materials.ec3Id, material.ec3Id!))
      .limit(1);
    if (existing.length > 0) foundNPlus1++;
  }
  const endNPlus1 = Date.now();

  // Measure IN array query
  console.log("Running IN array query...");
  const startInArray = Date.now();
  const ec3Ids = materialList.map(m => m.ec3Id!);
  const existingMaterials = await db
    .select()
    .from(materials)
    .where(inArray(materials.ec3Id, ec3Ids));
  const existingSet = new Set(existingMaterials.map(m => m.ec3Id));
  let foundInArray = 0;
  for (const material of materialList) {
    if (existingSet.has(material.ec3Id!)) foundInArray++;
  }
  const endInArray = Date.now();

  console.log(`N+1 found count: ${foundNPlus1}`);
  console.log(`IN array found count: ${foundInArray}`);
  console.log(`N+1 Query Time: ${endNPlus1 - startNPlus1}ms`);
  console.log(`IN Array Query Time: ${endInArray - startInArray}ms`);
  console.log(`Speedup: ${((endNPlus1 - startNPlus1) / Math.max(1, (endInArray - startInArray))).toFixed(2)}x`);
  process.exit(0);
}

benchmark().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
