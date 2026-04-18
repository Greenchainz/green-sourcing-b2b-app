/**
 * Script: update-material-images
 * Updates imageUrl for all materials in the DB based on category.
 * Uses curated Unsplash photo IDs — high quality, stable URLs.
 * Run: npx tsx scripts/update-material-images.ts
 */

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { materials } from "../drizzle/schema";
import { eq, isNull, or } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// Curated Unsplash photo IDs per category — professional, clean, AEC-appropriate
const CATEGORY_IMAGES: Record<string, string[]> = {
  "Aluminum": [
    "https://images.unsplash.com/photo-1565008576549-57569a49f3b2?w=600&q=80", // curtainwall facade
    "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=600&q=80", // aluminum panels
    "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=80", // glass curtainwall
  ],
  "Glass": [
    "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=80", // glass facade
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80", // glass building
    "https://images.unsplash.com/photo-1524230572899-a752b3835840?w=600&q=80", // modern glass
  ],
  "Steel": [
    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80", // steel structure
    "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=600&q=80", // steel framing
    "https://images.unsplash.com/photo-1565008576549-57569a49f3b2?w=600&q=80", // metal framing
  ],
  "Concrete": [
    "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&q=80", // concrete wall
    "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=600&q=80", // concrete structure
    "https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=600&q=80", // concrete building
  ],
  "Insulation": [
    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80", // building envelope
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80", // insulation material
    "https://images.unsplash.com/photo-1605152276897-4f618f831968?w=600&q=80", // wall assembly
  ],
  "Gypsum Board": [
    "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=600&q=80", // interior wall
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80", // drywall
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=600&q=80", // interior construction
  ],
  "Masonry": [
    "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=600&q=80", // brick/masonry
    "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80", // masonry wall
    "https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=600&q=80", // stone building
  ],
};

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  // Get all materials without images
  const allMaterials = await db
    .select({ id: materials.id, category: materials.category, name: materials.productName })
    .from(materials)
    .where(or(isNull(materials.imageUrl), eq(materials.imageUrl, "")));

  console.log(`Updating ${allMaterials.length} materials without images...`);

  const counters: Record<string, number> = {};

  for (const mat of allMaterials) {
    const cat = mat.category ?? "Steel";
    const imgs = CATEGORY_IMAGES[cat] ?? [DEFAULT_IMAGE];
    const idx = (counters[cat] ?? 0) % imgs.length;
    counters[cat] = idx + 1;
    const imageUrl = imgs[idx];

    await db
      .update(materials)
      .set({ imageUrl })
      .where(eq(materials.id, mat.id));

    console.log(`  ✓ ${mat.name} [${cat}] → image assigned`);
  }

  console.log("\nDone. All materials updated.");
  await pool.end();
}

main().catch(console.error);
