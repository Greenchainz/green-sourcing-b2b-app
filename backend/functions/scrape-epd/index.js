const { app } = require("@azure/functions");
const axios = require("axios");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/**
 * Scrape Building Transparency EPD database
 */
async function scrapeEPDDatabase() {
  // This is a placeholder - actual EPD APIs require authentication
  // You'll integrate with Building Transparency API once you have credentials

  const materials = [];

  // Example structure for when API is available
  try {
    // const response = await axios.get('https://buildingtransparency.org/api/epds', {
    //   headers: { 'Authorization': `Bearer ${process.env.BUILDING_TRANSPARENCY_API_KEY}` }
    // });

    console.log("EPD scraping ready - awaiting API credentials");
  } catch (error) {
    console.error("EPD scrape error:", error.message);
  }

  return materials;
}

/**
 * Azure Function: Scrape EPD (Timer Trigger - Weekly)
 */
app.timer("scrape-epd", {
  schedule: "0 0 2 * * 0", // Every Sunday at 2 AM
  handler: async (timer, context) => {
    context.log("EPD scraper triggered - weekly run");

    try {
      const materials = await scrapeEPDDatabase();

      context.log(`Scraped ${materials.length} EPD materials`);

      // Store in database
      for (const material of materials) {
        await pool.query(
          `
          INSERT INTO materials (
            manufacturer, product_name, epd_number, 
            gwp, declared_unit, source
          ) VALUES ($1, $2, $3, $4, $5, 'epd_scrape')
          ON CONFLICT (manufacturer, product_name, epd_number) 
          DO UPDATE SET 
            gwp = EXCLUDED.gwp,
            updated_at = NOW()
        `,
          [
            material.manufacturer,
            material.product_name,
            material.epd_number,
            material.gwp,
            material.declared_unit,
          ]
        );
      }

      return {
        success: true,
        count: materials.length,
      };
    } catch (error) {
      context.log.error("EPD scraper error:", error);
      throw error;
    }
  },
});
