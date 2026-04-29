import pg from "pg";
const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const r = await client.query(`
  SELECT
    (SELECT COUNT(*) FROM epd_materials) AS epd_count,
    (SELECT COUNT(*) FROM assemblies) AS assembly_count,
    (SELECT COUNT(*) FROM materials) AS material_count
`);
console.log(r.rows[0]);
await client.end();
