/**
 * scripts/populate-material-images.ts
 *
 * Fetches one high-quality image from Pexels per material category,
 * then bulk-updates every materials row in that category with the image URL.
 *
 * Usage:
 *   PEXELS_API_KEY=your_key_here DATABASE_URL=your_db_url npx ts-node scripts/populate-material-images.ts
 *
 * Or if DATABASE_URL is already in your environment / .env:
 *   PEXELS_API_KEY=your_key_here npx ts-node --env-file=.env scripts/populate-material-images.ts
 */

import { Pool } from 'pg';

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const DATABASE_URL   = process.env.DATABASE_URL;

const CLEAR_FIRST = process.argv.includes('--clear');

if (!PEXELS_API_KEY) {
  console.error('❌  PEXELS_API_KEY is required');
  process.exit(1);
}
if (!DATABASE_URL) {
  console.error('❌  DATABASE_URL is required');
  process.exit(1);
}

// ── Category → Pexels search term ────────────────────────────────────────────
const CATEGORY_QUERIES: Record<string, string> = {
  'Concrete':               'concrete construction architecture',
  'Insulation':             'building insulation thermal material',
  'Steel':                  'structural steel construction building',
  'Masonry':                'brick masonry wall architecture',
  'Roofing':                'roofing material architecture',
  'Aluminum':               'aluminum cladding facade building',
  'Glass':                  'architectural glass facade building',
  'Rebar':                  'steel rebar reinforcement construction',
  'Gypsum Board':           'drywall gypsum interior construction',
  'Construction Materials': 'sustainable building materials construction',
  'Wood':                   'timber wood sustainable construction',
  'Drywall':                'drywall interior construction',
  'Flooring':               'sustainable flooring architecture interior',
  'Metals':                 'metal building material architecture',
  'Glazing':                'glass glazing curtain wall building',
};

// ── Pexels types ─────────────────────────────────────────────────────────────
interface PexelsPhoto {
  id: number;
  src: { large: string; medium: string; original: string };
  alt: string;
}
interface PexelsResponse {
  photos: PexelsPhoto[];
}

async function fetchPexelsImages(query: string, count: number): Promise<string[]> {
  const perPage = Math.min(count, 15);
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`;
  const res = await fetch(url, {
    headers: { Authorization: PEXELS_API_KEY as string },
  });

  if (!res.ok) {
    console.error(`  Pexels error ${res.status} for "${query}"`);
    return [];
  }

  const data = (await res.json()) as PexelsResponse;
  return data.photos.map(p => p.src.large);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    if (CLEAR_FIRST) {
      await pool.query(`UPDATE materials SET "imageUrl" = NULL`);
      console.log('🗑️  Cleared existing image URLs\n');
    }

    const categories = Object.keys(CATEGORY_QUERIES);
    console.log(`\n📸  Fetching images for ${categories.length} categories...\n`);

    let totalUpdated = 0;

    for (const category of categories) {
      const query = CATEGORY_QUERIES[category];
      process.stdout.write(`  ${category.padEnd(25)} → `);

      // Find all material IDs in this category that need an image
      const { rows: materialRows } = await pool.query<{ id: number }>(
        `SELECT id FROM materials WHERE category = $1 AND ("imageUrl" IS NULL OR "imageUrl" = '') ORDER BY id`,
        [category]
      );

      if (materialRows.length === 0) {
        console.log('⏭️  all already have images');
        continue;
      }

      // Fetch up to 15 images from Pexels and cycle through them
      const images = await fetchPexelsImages(query, 15);
      if (images.length === 0) {
        console.log('⚠️  no images found, skipping');
        continue;
      }

      // Update each material with a rotated image URL
      let count = 0;
      for (const row of materialRows) {
        const imageUrl = images[count % images.length];
        await pool.query(`UPDATE materials SET "imageUrl" = $1 WHERE id = $2`, [imageUrl, row.id]);
        count++;
      }

      totalUpdated += count;
      console.log(`✅  ${count} rows updated (${images.length} unique images rotated)`);

      await new Promise(r => setTimeout(r, 300));
    }

    console.log(`\n🎉  Done. ${totalUpdated} materials now have images.\n`);
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
