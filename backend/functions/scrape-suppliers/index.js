const { app } = require('@azure/functions');
const axios = require('axios');
const cheerio = require('cheerio');
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Rate limiting config
const RATE_LIMIT_MS = parseInt(process.env.SCRAPER_RATE_LIMIT_MS || '2000');
const MAX_BATCH = parseInt(process.env.SCRAPER_MAX_BATCH || '10');

// Helper: Wait function
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Scrape a single website
async function scrapeWebsite(url) {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'GreenChainz Supplier Verification Bot/1.0 (+https://greenchainz.com/bot)'
      }
    });

    const $ = cheerio.load(response.data);
    
    // Extract metadata
    const description = $('meta[name="description"]').attr('content') || 
                       $('meta[property="og:description"]').attr('content') || 
                       '';
    
    // Extract contact info
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    
    const bodyText = $('body').text();
    const emails = bodyText.match(emailRegex) || [];
    const phones = bodyText.match(phoneRegex) || [];
    
    // Extract certifications (keywords)
    const certKeywords = ['LEED', 'EPD', 'USGBC', 'FSC', 'Cradle to Cradle', 'ISO 14001', 'Green Squared'];
    const certifications = certKeywords.filter(keyword => 
      bodyText.toLowerCase().includes(keyword.toLowerCase())
    );

    return {
      description: description.substring(0, 500),
      email: emails[0] || null,
      phone: phones[0] || null,
      certifications: certifications.length > 0 ? certifications : null,
      scraped_at: new Date()
    };
  } catch (error) {
    console.error(`Failed to scrape ${url}:`, error.message);
    return null;
  }
}

// Main scraper function
app.timer('scrape-suppliers', {
  schedule: '0 0 2 * * *',
  handler: async (myTimer, context) => {
    context.log('Scraper function triggered at:', new Date().toISOString());

    try {
      // Get suppliers with websites that need scraping
      const query = `
        SELECT id, name, website 
        FROM users 
        WHERE role = 'supplier' 
          AND website IS NOT NULL 
          AND website != ''
          AND (last_scraped_at IS NULL OR last_scraped_at < NOW() - INTERVAL '7 days')
        ORDER BY last_scraped_at ASC NULLS FIRST
        LIMIT $1
      `;
      
      const result = await pool.query(query, [MAX_BATCH]);
      const suppliers = result.rows;

      context.log(`Found ${suppliers.length} suppliers to scrape`);

      let successCount = 0;
      let failCount = 0;

      // Scrape each supplier
      for (const supplier of suppliers) {
        context.log(`Scraping: ${supplier.name} (${supplier.website})`);
        
        const data = await scrapeWebsite(supplier.website);
        
        if (data) {
          // Update database with scraped data
          await pool.query(`
            UPDATE users 
            SET 
              scraped_description = $1,
              scraped_email = $2,
              scraped_phone = $3,
              scraped_certifications = $4,
              last_scraped_at = $5
            WHERE id = $6
          `, [
            data.description,
            data.email,
            data.phone,
            JSON.stringify(data.certifications),
            data.scraped_at,
            supplier.id
          ]);
          
          successCount++;
          context.log(`✅ Scraped ${supplier.name}`);
        } else {
          failCount++;
          context.log(`❌ Failed to scrape ${supplier.name}`);
        }

        // Rate limiting - wait between requests
        if (suppliers.indexOf(supplier) < suppliers.length - 1) {
          await wait(RATE_LIMIT_MS);
        }
      }

      context.log(`Scraping complete: ${successCount} success, ${failCount} failed`);

      return {
        status: 'completed',
        scraped: successCount,
        failed: failCount,
        total: suppliers.length
      };

    } catch (error) {
      context.error('Scraper error:', error);
      throw error;
    }
  }
});
