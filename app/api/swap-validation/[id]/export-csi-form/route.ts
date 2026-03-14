import { NextRequest, NextResponse } from 'next/server';
import { CSIFormGenerator, type CSIFormData } from '@/app/lib/csiFormGenerator';
import { getDb } from '@/server/db';
import { swapValidations, materialTechnicalSpecs, materials } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const validationId = Number(params.id);
    if (isNaN(validationId)) {
      return NextResponse.json({ error: 'Invalid validation ID' }, { status: 400 });
    }

    const db = await getDb();

    const [validation] = await db
      .select()
      .from(swapValidations)
      .where(eq(swapValidations.id, validationId))
      .limit(1);

    if (!validation) {
      return NextResponse.json({ error: 'Validation not found' }, { status: 404 });
    }

    const [incumbentMaterial, sustainableMaterial] = await Promise.all([
      db.select().from(materials).where(eq(materials.id, validation.incumbentMaterialId)).limit(1).then(r => r[0]),
      db.select().from(materials).where(eq(materials.id, validation.sustainableMaterialId)).limit(1).then(r => r[0]),
    ]);

    const [incumbentSpecs, sustainableSpecs] = await Promise.all([
      db.select().from(materialTechnicalSpecs).where(eq(materialTechnicalSpecs.materialId, validation.incumbentMaterialId)).limit(1).then(r => r[0]),
      db.select().from(materialTechnicalSpecs).where(eq(materialTechnicalSpecs.materialId, validation.sustainableMaterialId)).limit(1).then(r => r[0]),
    ]);

    const showstopperChecks = validation.showstopperResults as Record<string, { pass: boolean; specified?: unknown; proposed?: unknown }>;

    // Cost delta: sustainableTotalCost - incumbentTotalCost
    const incumbentCost = Number(validation.incumbentTotalCost) || 0;
    const sustainableCost = Number(validation.sustainableTotalCost) || 0;
    const netChange = sustainableCost - incumbentCost;

    // GWP fields: incumbentGwp / sustainableGwp (schema uses camelCase)
    const incumbentGwp = Number(validation.incumbentGwp) || 0;
    const sustainableGwp = Number(validation.sustainableGwp) || 0;
    const gwpReduction = incumbentGwp - sustainableGwp;
    const gwpReductionPct = Number(validation.carbonReductionPercentage) || 0;

    const formData: CSIFormData = {
      projectName: 'GreenChainz Project',
      architectName: 'To Be Determined',
      contractorName: 'To Be Determined',
      requestNumber: `GC-${String(validation.id).padStart(8, '0')}`,
      specificationSection: '03 30 00 - Cast-in-Place Concrete',
      date: validation.validatedAt ?? new Date(),

      specifiedProduct: {
        manufacturer: (incumbentMaterial as any)?.manufacturerId ? `Manufacturer #${incumbentMaterial?.manufacturerId}` : 'Unknown',
        tradeName: incumbentMaterial?.name ?? 'Unknown',
        modelNumber: undefined,
      },

      proposedSubstitution: {
        manufacturer: (sustainableMaterial as any)?.manufacturerId ? `Manufacturer #${sustainableMaterial?.manufacturerId}` : 'Unknown',
        tradeName: sustainableMaterial?.name ?? 'Unknown',
        modelNumber: undefined,
      },

      validationStatus: validation.validationStatus as 'APPROVED' | 'EXPERIMENTAL' | 'REJECTED',
      validationScore: Number(validation.overallScore) || 0,

      showstopperChecks: {
        astmMatch: showstopperChecks?.astmMatch?.pass ?? false,
        fireRatingMatch: showstopperChecks?.fireRating?.pass ?? false,
        compressiveStrengthMatch: showstopperChecks?.compressiveStrength?.pass ?? false,
        tensileStrengthMatch: showstopperChecks?.tensileStrength?.pass ?? false,
        modulusMatch: showstopperChecks?.modulusOfElasticity?.pass ?? false,
        rValueMatch: showstopperChecks?.rValue?.pass ?? false,
        permRatingMatch: showstopperChecks?.permRating?.pass ?? false,
        stcMatch: showstopperChecks?.stcRating?.pass ?? false,
        iicMatch: showstopperChecks?.iicRating?.pass ?? false,
        ulListingMatch: showstopperChecks?.ulListing?.pass ?? false,
        laborUnitsMatch: showstopperChecks?.laborUnits?.pass ?? false,
        lifecycleMatch: showstopperChecks?.warrantyYears?.pass ?? false,
      },

      costComparison: {
        specifiedCost: incumbentCost,
        proposedCost: sustainableCost,
        netChange,
      },

      environmentalImpact: {
        specifiedGWP: incumbentGwp,
        proposedGWP: sustainableGwp,
        gwpReduction,
        gwpReductionPercent: gwpReductionPct,
        specifiedEPD: incumbentMaterial?.epdUrl ?? undefined,
        proposedEPD: sustainableMaterial?.epdUrl ?? undefined,
      },

      technicalSpecs: {
        specified: {
          astmCodes: incumbentSpecs?.astmCodes as string[] | undefined,
          fireRating: incumbentSpecs?.fireRating ?? undefined,
          compressiveStrength: incumbentSpecs?.compressiveStrengthPsi ?? undefined,
          tensileStrength: incumbentSpecs?.tensileStrengthPsi ?? undefined,
          rValue: incumbentSpecs?.rValuePerInch ? Number(incumbentSpecs.rValuePerInch) : undefined,
          stcRating: incumbentSpecs?.stcRating ?? undefined,
          warranty: incumbentSpecs?.warrantyYears ?? undefined,
        },
        proposed: {
          astmCodes: sustainableSpecs?.astmCodes as string[] | undefined,
          fireRating: sustainableSpecs?.fireRating ?? undefined,
          compressiveStrength: sustainableSpecs?.compressiveStrengthPsi ?? undefined,
          tensileStrength: sustainableSpecs?.tensileStrengthPsi ?? undefined,
          rValue: sustainableSpecs?.rValuePerInch ? Number(sustainableSpecs.rValuePerInch) : undefined,
          stcRating: sustainableSpecs?.stcRating ?? undefined,
          warranty: sustainableSpecs?.warrantyYears ?? undefined,
        },
      },

      reasonForSubstitution: buildJustification(validation, gwpReductionPct, netChange),
      additionalNotes: validation.recommendation ?? undefined,
    };

    const generator = new CSIFormGenerator();
    const pdfBuffer = await generator.generate(formData);

    const safeName = (incumbentMaterial?.name ?? 'Material').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `CSI-13.1A_GC-${String(validation.id).padStart(8, '0')}_${safeName}_${dateStr}.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('[CSI Export] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSI form', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function buildJustification(
  validation: { validationStatus: string },
  gwpReductionPct: number,
  netChange: number
): string {
  const status = validation.validationStatus;

  if (status === 'APPROVED') {
    let j = 'The proposed substitution has been validated by GreenChainz and determined to be functionally equivalent to the specified product. All critical performance metrics meet or exceed specified requirements.';
    if (gwpReductionPct > 0) j += ` This substitution provides a ${gwpReductionPct.toFixed(1)}% reduction in Global Warming Potential (GWP).`;
    if (netChange < 0) j += ` It also delivers cost savings of $${Math.abs(netChange).toLocaleString()}.`;
    else if (netChange === 0) j += ' The substitution is cost-neutral while delivering superior environmental performance.';
    else j += ` A cost premium of $${netChange.toLocaleString()} is offset by significant carbon savings.`;
    return j;
  }

  if (status === 'EXPERIMENTAL') {
    return `The proposed substitution has been evaluated by GreenChainz and determined to be substantially equivalent, with minor differences in select performance metrics. These differences are not expected to materially affect suitability. Environmental benefits include a ${gwpReductionPct.toFixed(1)}% GWP reduction. Acceptance is recommended with design team review of noted differences.`;
  }

  return 'The proposed substitution has been evaluated and determined to have significant differences from the specified product. Further investigation and design team review are required before this substitution can be recommended.';
}
