import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { validateSwap, type MaterialTechnicalSpecs } from "@/lib/swap-validation/swapValidationService";

const pool = getPool();

/**
 * POST /api/swap-validation/validate
 * 
 * Validate a material swap between incumbent and sustainable materials
 * 
 * Body:
 * - incumbentMaterialId: number
 * - sustainableMaterialId: number
 * - projectState?: string (2-letter state code)
 * - projectCity?: string
 * - projectType?: string
 * - rfqId?: number
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      incumbentMaterialId,
      sustainableMaterialId,
      projectState,
      projectCity,
      projectType,
      rfqId,
    } = body;

    if (!incumbentMaterialId || !sustainableMaterialId) {
      return NextResponse.json(
        { error: "incumbentMaterialId and sustainableMaterialId are required" },
        { status: 400 }
      );
    }

    // Fetch technical specs for both materials
    const [incumbentResult, sustainableResult] = await Promise.all([
      pool.query(
        "SELECT * FROM material_technical_specs WHERE material_id = $1 LIMIT 1",
        [incumbentMaterialId]
      ),
      pool.query(
        "SELECT * FROM material_technical_specs WHERE material_id = $1 LIMIT 1",
        [sustainableMaterialId]
      ),
    ]);

    if (incumbentResult.rows.length === 0) {
      return NextResponse.json(
        { error: `No technical specs found for incumbent material ID ${incumbentMaterialId}` },
        { status: 404 }
      );
    }
    if (sustainableResult.rows.length === 0) {
      return NextResponse.json(
        { error: `No technical specs found for sustainable material ID ${sustainableMaterialId}` },
        { status: 404 }
      );
    }

    // Map DB row to MaterialTechnicalSpecs interface
    const mapRowToSpecs = (row: any): MaterialTechnicalSpecs => ({
      materialId: row.material_id,
      astmCodes: row.astm_codes ? JSON.parse(row.astm_codes) : [],
      fireRating: row.fire_rating || null,
      compressiveStrengthPsi: row.compressive_strength_psi ? parseFloat(row.compressive_strength_psi) : null,
      tensileStrengthPsi: row.tensile_strength_psi ? parseFloat(row.tensile_strength_psi) : null,
      modulusOfElasticityPsi: row.modulus_of_elasticity_psi ? parseFloat(row.modulus_of_elasticity_psi) : null,
      rValuePerInch: row.r_value_per_inch ? parseFloat(row.r_value_per_inch) : null,
      permRating: row.perm_rating ? parseFloat(row.perm_rating) : null,
      stcRating: row.stc_rating || null,
      nrcCoefficient: row.nrc_coefficient ? parseFloat(row.nrc_coefficient) : null,
      certifications: row.certifications ? JSON.parse(row.certifications) : [],
      warrantyYears: row.warranty_years || null,
      installMethod: row.install_method || null,
      dimensionalToleranceInches: row.dimensional_tolerance_inches ? parseFloat(row.dimensional_tolerance_inches) : null,
      weightPerSf: row.weight_per_sf ? parseFloat(row.weight_per_sf) : null,
      moistureAbsorptionPct: row.moisture_absorption_pct ? parseFloat(row.moisture_absorption_pct) : null,
      recycledContentPct: row.recycled_content_pct ? parseFloat(row.recycled_content_pct) : null,
      vocGramsPerLiter: row.voc_grams_per_liter ? parseFloat(row.voc_grams_per_liter) : null,
      expectedLifespanYears: row.expected_lifespan_years || null,
      gwpPerUnit: row.gwp_per_unit ? parseFloat(row.gwp_per_unit) : null,
      gwpUnit: row.gwp_unit || null,
      epdUrl: row.epd_url || null,
      epdExpiry: row.epd_expiry || null,
      dataSource: row.data_source || null,
      dataConfidence: row.data_confidence ? parseFloat(row.data_confidence) : null,
    });

    const incumbentSpecs = mapRowToSpecs(incumbentResult.rows[0]);
    const sustainableSpecs = mapRowToSpecs(sustainableResult.rows[0]);

    // Run validation
    const validationResult = validateSwap(incumbentSpecs, sustainableSpecs);

    // Store validation result
    const insertResult = await pool.query(
      `INSERT INTO swap_validations (
        incumbent_material_id, sustainable_material_id,
        validation_status, overall_score, showstopper_results,
        failed_checks, passed_checks, skipped_checks,
        recommendation, validated_at, expires_at,
        project_state, project_city, project_type, rfq_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW() + INTERVAL '180 days', $10, $11, $12, $13)
      RETURNING id`,
      [
        incumbentMaterialId,
        sustainableMaterialId,
        validationResult.validationStatus,
        validationResult.overallScore,
        JSON.stringify(validationResult.showstopperResults),
        validationResult.failedChecks,
        validationResult.passedChecks,
        validationResult.skippedChecks,
        validationResult.recommendation,
        projectState || null,
        projectCity || null,
        projectType || null,
        rfqId || null,
      ]
    );

    return NextResponse.json({
      ...validationResult,
      validationId: insertResult.rows[0].id,
    });
  } catch (error) {
    console.error("Swap validation error:", error);
    return NextResponse.json(
      { error: "Failed to validate swap", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
