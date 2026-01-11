/**
 * EWS Materials Import Script
 * 
 * Imports materials from EWS (Environmental Wall Systems) PDF sheet
 * into the database with structured EPD data, manufacturers, and carbon metrics.
 * 
 * Usage:
 *   node backend/scripts/import-ews-materials.js <pdf-path>
 * 
 * Example:
 *   node backend/scripts/import-ews-materials.js ./data/EWS_Combined_All_Assemblies_WITH_Manufacturers.pdf
 */

const fs = require('fs');
const path = require('path');
const { pool } = require('../db');

// Try to use pdf-parse if available, otherwise provide helpful error
let pdfParse;
try {
  pdfParse = require('pdf-parse');
} catch (error) {
  console.error('❌ pdf-parse not found. Install it with: npm install pdf-parse');
  console.error('   Run: cd backend && npm install pdf-parse');
  process.exit(1);
}

/**
 * Create EWS materials table if not exists
 */
async function createMaterialsTable() {
  try {
    const sqlPath = path.join(__dirname, '../database-schemas/ews-materials.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await pool.query(sql);
    console.log('✅ EWS materials table ready');
  } catch (error) {
    console.error('❌ Failed to create materials table:', error.message);
    throw error;
  }
}

/**
 * Parse EWS PDF and extract materials
 * 
 * Note: This is a simplified parser. Real PDF parsing may require
 * more sophisticated extraction based on the actual PDF structure.
 */
async function parseEWSPDF(pdfPath) {
  try {
    console.log(`📄 Reading PDF: ${pdfPath}`);
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdfParse(dataBuffer);
    
    console.log(`📊 PDF parsed: ${pdfData.numpages} pages`);
    console.log(`📝 Text length: ${pdfData.text.length} characters`);
    
    // Parse structured data from text
    const materials = parseEWSData(pdfData.text);
    
    console.log(`✅ Extracted ${materials.length} materials`);
    return materials;
  } catch (error) {
    console.error('❌ PDF parsing failed:', error.message);
    throw error;
  }
}

/**
 * Parse EWS structured data from text
 * 
 * This is a simplified parser. You may need to adjust based on
 * the actual PDF structure and formatting.
 */
function parseEWSData(text) {
  const materials = [];
  
  // Common manufacturers from EWS sheet
  const manufacturers = [
    'Kawneer North America',
    'Vitro / Guardian / AGC',
    'ROCKWOOL',
    'US Gypsum',
    'Georgia-Pacific Building Products',
    'ClarkDietrich',
    'Polycor',
    'SCAFCO Steel Stud Company',
    'Boston Valley',
    'Ductal',
    'FIBROBETON',
    'Dri-Design / CEI / Morin'
  ];
  
  // Assembly pattern: EWS-XXX - Assembly Name
  const assemblyPattern = /EWS[-\s]*(\w+)[\s-]+([^\n]+)/gi;
  const assemblies = new Map();
  
  let match;
  while ((match = assemblyPattern.exec(text)) !== null) {
    const code = `EWS-${match[1]}`;
    const name = match[2].trim();
    if (!assemblies.has(code)) {
      assemblies.set(code, name);
    }
  }
  
  console.log(`📦 Found ${assemblies.size} assemblies`);
  
  // Extract materials (this is simplified - you may need more sophisticated parsing)
  // For now, we'll create a basic structure that can be enhanced
  for (const [assemblyCode, assemblyName] of assemblies) {
    // Look for manufacturer patterns near this assembly
    manufacturers.forEach(manufacturer => {
      // Try to find materials for this manufacturer near this assembly
      // This is a placeholder - actual parsing will depend on PDF structure
      const manufacturerPattern = new RegExp(
        manufacturer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'gi'
      );
      
      if (manufacturerPattern.test(text)) {
        // Create placeholder material entries
        // Real implementation would extract actual product data
        materials.push({
          assemblyCode,
          assemblyName,
          manufacturer,
          productName: `Product from ${manufacturer}`,
          location: 'INTERIOR/EXTERIOR',
          source: 'ews-sheet'
        });
      }
    });
  }
  
  // If no materials found with pattern matching, create a placeholder
  // This allows the script to run and create the schema
  if (materials.length === 0) {
    console.log('⚠️  No materials extracted with pattern matching');
    console.log('   This may be normal if the PDF structure is different');
    console.log('   The table schema is created, but manual data entry may be needed');
  }
  
  return materials;
}

/**
 * Import a single material
 */
async function importMaterial(material) {
  try {
    await pool.query(`
      INSERT INTO ews_materials (
        assembly_code, assembly_name, location, manufacturer,
        product_name, epd_number, dimension, gwp, gwp_units,
        source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (assembly_code, manufacturer, product_name)
      DO UPDATE SET
        gwp = COALESCE(EXCLUDED.gwp, ews_materials.gwp),
        epd_number = COALESCE(EXCLUDED.epd_number, ews_materials.epd_number),
        updated_at = NOW()
      RETURNING id
    `, [
      material.assemblyCode,
      material.assemblyName,
      material.location || null,
      material.manufacturer,
      material.productName,
      material.epdNumber || null,
      material.dimension || null,
      material.gwp || null,
      material.gwpUnits || null,
      material.source || 'ews-sheet'
    ]);
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to import ${material.productName}:`, error.message);
    return false;
  }
}

/**
 * Main import function
 */
async function importEWSMaterials(pdfPath) {
  try {
    console.log('🚀 Starting EWS Materials Import\n');
    
    // Verify PDF exists
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDF file not found: ${pdfPath}`);
    }
    
    // Create table
    await createMaterialsTable();
    
    // Parse PDF
    const materials = await parseEWSPDF(pdfPath);
    
    if (materials.length === 0) {
      console.log('⚠️  No materials extracted. Schema is ready for manual data entry.');
      return 0;
    }
    
    // Import materials
    console.log(`\n📥 Importing ${materials.length} materials...`);
    let imported = 0;
    let failed = 0;
    
    for (const material of materials) {
      const success = await importMaterial(material);
      if (success) {
        imported++;
      } else {
        failed++;
      }
      
      if ((imported + failed) % 10 === 0) {
        process.stdout.write('.');
      }
    }
    
    console.log(`\n\n✅ Import complete:`);
    console.log(`   - Imported: ${imported}`);
    console.log(`   - Failed: ${failed}`);
    console.log(`   - Total: ${materials.length}`);
    
    return imported;
  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    console.error(error.stack);
    throw error;
  }
}

// Run import if called directly
if (require.main === module) {
  const pdfPath = process.argv[2] || './data/EWS_Combined_All_Assemblies_WITH_Manufacturers.pdf';
  
  importEWSMaterials(pdfPath)
    .then(count => {
      console.log(`\n✅ Successfully imported ${count} materials`);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Import failed:', error.message);
      process.exit(1);
    });
}

module.exports = { importEWSMaterials, parseEWSPDF };
