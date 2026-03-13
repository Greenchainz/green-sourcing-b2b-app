const { Client } = require('pg');
const { performance } = require('perf_hooks');

// Simple benchmark to measure N+1 vs UNNEST
async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5432/postgres'
  });

  try {
    await client.connect();
    console.log("Connected to DB for benchmark.");

    // Setup temporary tables
    await client.query(`
      CREATE TEMPORARY TABLE rfq_items_bench (
        id SERIAL PRIMARY KEY,
        rfq_id INT,
        material_id TEXT,
        quantity NUMERIC,
        unit TEXT,
        created_at TIMESTAMP
      );
    `);

    // Generate mock data (e.g., 50 items)
    const materials = Array.from({ length: 50 }, (_, i) => ({
      material_id: `mat_${i}`,
      quantity: Math.random() * 100,
      unit: 'kg'
    }));

    const rfq_id = 1;

    // --- BASELINE (N+1 queries) ---
    await client.query('TRUNCATE TABLE rfq_items_bench;');
    let start = performance.now();
    for (const material of materials) {
      await client.query(
        `INSERT INTO rfq_items_bench (
          rfq_id, material_id, quantity, unit, created_at
        ) VALUES ($1, $2, $3, $4, NOW())`,
        [rfq_id, material.material_id, material.quantity, material.unit]
      );
    }
    let end = performance.now();
    const baselineTime = end - start;
    console.log(`Baseline (N+1 loop) time for ${materials.length} inserts: ${baselineTime.toFixed(2)} ms`);

    // --- OPTIMIZED (UNNEST bulk insert) ---
    await client.query('TRUNCATE TABLE rfq_items_bench;');

    // Prepare arrays
    const materialIds = materials.map(m => m.material_id);
    const quantities = materials.map(m => m.quantity);
    const units = materials.map(m => m.unit);

    start = performance.now();
    if (materials.length > 0) {
      await client.query(
        `INSERT INTO rfq_items_bench (
          rfq_id, material_id, quantity, unit, created_at
        )
        SELECT $1, unnest($2::text[]), unnest($3::numeric[]), unnest($4::text[]), NOW()`,
        [rfq_id, materialIds, quantities, units]
      );
    }
    end = performance.now();
    const optimizedTime = end - start;
    console.log(`Optimized (UNNEST) time for ${materials.length} inserts: ${optimizedTime.toFixed(2)} ms`);

    const speedup = baselineTime / optimizedTime;
    console.log(`Speedup: ${speedup.toFixed(2)}x faster`);

  } catch (err) {
    console.error("Benchmark error:", err);
  } finally {
    await client.end();
  }
}

run();
