import pg from "pg";
const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const r = await client.query(`
  SELECT COUNT(*) AS total, COUNT("imageUrl") AS has_image FROM materials
`);
console.log(r.rows[0]);
await client.end();
