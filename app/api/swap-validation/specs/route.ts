import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

const pool = getPool();

/**
 * GET /api/swap-validation/specs
 * 
 * Get technical specs for a material
 * Query params: materialId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const materialId = searchParams.get("materialId");

    if (!materialId) {
      return NextResponse.json(
        { error: "materialId is required" },
        { status: 400 }
      );
    }

    const result = await pool.query(
      "SELECT * FROM material_technical_specs WHERE material_id = $1",
      [parseInt(materialId)]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching specs:", error);
    return NextResponse.json(
      { error: "Failed to fetch technical specs" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/swap-validation/specs
 * 
 * Upsert technical specs for a material
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { materialId, ...specs } = body;

    if (!materialId) {
      return NextResponse.json(
        { error: "materialId is required" },
        { status: 400 }
      );
    }

    // Check if specs exist
    const existing = await pool.query(
      "SELECT id FROM material_technical_specs WHERE material_id = $1",
      [materialId]
    );

    if (existing.rows.length > 0) {
      // Update
      await pool.query(
        `UPDATE material_technical_specs SET
          astm_codes = $2, fire_rating = $3,
          compressive_strength_psi = $4, tensile_strength_psi = $5,
          modulus_of_elasticity_psi = $6, r_value_per_inch = $7,
          perm_rating = $8, stc_rating = $9, nrc_coefficient = $10,
          certifications = $11, warranty_years = $12, install_method = $13,
          dimensional_tolerance_inches = $14, weight_per_sf = $15,
          moisture_absorption_pct = $16, recycled_content_pct = $17,
          voc_grams_per_liter = $18, expected_lifespan_years = $19,
          gwp_per_unit = $20, gwp_unit = $21, epd_url = $22, epd_expiry = $23,
          data_source = $24, data_confidence = $25, updated_at = NOW()
        WHERE material_id = $1`,
        [
          materialId,
          specs.astmCodes ? JSON.stringify(specs.astmCodes) : null,
          specs.fireRating || null,
          specs.compressiveStrengthPsi || null,
          specs.tensileStrengthPsi || null,
          specs.modulusOfElasticityPsi || null,
          specs.rValuePerInch || null,
          specs.permRating || null,
          specs.stcRating || null,
          specs.nrcCoefficient || null,
          specs.certifications ? JSON.stringify(specs.certifications) : null,
          specs.warrantyYears || null,
          specs.installMethod || null,
          specs.dimensionalToleranceInches || null,
          specs.weightPerSf || null,
          specs.moistureAbsorptionPct || null,
          specs.recycledContentPct || null,
          specs.vocGramsPerLiter || null,
          specs.expectedLifespanYears || null,
          specs.gwpPerUnit || null,
          specs.gwpUnit || null,
          specs.epdUrl || null,
          specs.epdExpiry || null,
          specs.dataSource || null,
          specs.dataConfidence || null,
        ]
      );
      return NextResponse.json({ success: true, action: "updated" });
    } else {
      // Insert
      const result = await pool.query(
        `INSERT INTO material_technical_specs (
          material_id, astm_codes, fire_rating,
          compressive_strength_psi, tensile_strength_psi,
          modulus_of_elasticity_psi, r_value_per_inch,
          perm_rating, stc_rating, nrc_coefficient,
          certifications, warranty_years, install_method,
          dimensional_tolerance_inches, weight_per_sf,
          moisture_absorption_pct, recycled_content_pct,
          voc_grams_per_liter, expected_lifespan_years,
          gwp_per_unit, gwp_unit, epd_url, epd_expiry,
          data_source, data_confidence
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
        RETURNING id`,
        [
          materialId,
          specs.astmCodes ? JSON.stringify(specs.astmCodes) : null,
          specs.fireRating || null,
          specs.compressiveStrengthPsi || null,
          specs.tensileStrengthPsi || null,
          specs.modulusOfElasticityPsi || null,
          specs.rValuePerInch || null,
          specs.permRating || null,
          specs.stcRating || null,
          specs.nrcCoefficient || null,
          specs.certifications ? JSON.stringify(specs.certifications) : null,
          specs.warrantyYears || null,
          specs.installMethod || null,
          specs.dimensionalToleranceInches || null,
          specs.weightPerSf || null,
          specs.moistureAbsorptionPct || null,
          specs.recycledContentPct || null,
          specs.vocGramsPerLiter || null,
          specs.expectedLifespanYears || null,
          specs.gwpPerUnit || null,
          specs.gwpUnit || null,
          specs.epdUrl || null,
          specs.epdExpiry || null,
          specs.dataSource || null,
          specs.dataConfidence || null,
        ]
      );
      return NextResponse.json({ success: true, action: "created", id: result.rows[0].id });
    }
  } catch (error) {
    console.error("Error upserting specs:", error);
    return NextResponse.json(
      { error: "Failed to upsert technical specs" },
      { status: 500 }
    );
  }
}
