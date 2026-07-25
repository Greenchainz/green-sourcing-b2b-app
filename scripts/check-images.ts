import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { materials } from "../drizzle/schema";
import { sql } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const [total] = await db.select({ count: sql<number>`count(*)::int` }).from(materials);
const [withImg] = await db
  .select({ count: sql<number>`count(*)::int` })
  .from(materials)
  .where(sql`"imageUrl" IS NOT NULL AND "imageUrl" != ''`);

console.log("Total materials:", total.count);
console.log("With imageUrl:  ", withImg.count);
console.log("Without imageUrl:", (total.count ?? 0) - (withImg.count ?? 0));

await pool.end();
