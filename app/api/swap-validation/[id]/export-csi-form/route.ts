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

    // Fetch validation row
    const [validation] = await db
      .select()
      .from(swapValidations)
      .where(eq(swapValidations.id, validationId))
      .limit(1);

    if (!validation) {
      return NextResponse.json({ error: 'Validation not found' }, { status: 404 });
    }

    // Fetch both materials
    const [incumbentMaterial, sustainableMaterial] = await Promise.all([
      db.select().from(materials).where(eq(materials.id, validation.incumbentMaterialId)).limit(1).then(r => r[0]),
      db.select().from(materials).where(eq(materials.id, validation.sustainableMaterialId)).limit(1).then(r => r[0]),
    ]);

    // Fetch technical specs for both materials
    const [incumbentSpecs, sustainableSpecs] = await Promise.all([
      db.select().from(materialTechnicalSpecs).where(eq(materialTechnicalSpecs.materialId, validation.incumbentMaterialId)).limit(1).then(r => r[0]),
      db.select().from(materialTechnicalSpecs).where(eq(materialTechnicalSpecs.materialId, validation.sustainableMaterialId)).limit(1).then(r => r[0]),
    ]);

    const showstopperChecks = validation.showstopperResults as any;

    const formData: CSIFormData = {
      projectName: (validation as any).projectName || 'Unnamed Project',
      architectName: (validation as any).architectName || 'To Be Determined',
      contractorName: (validation as any).contractorName || 'To Be Determined',
      requestNumber: `GC-${String(validation.id).padStart(8, '0').toUpperCase()}`,
      specificationSection: (validation as any).specificationSection || '03 30 00 - Cast-in-Place Concrete',
      date: validation.validatedAt ?? new Date(),

      specifiedProduct: {
        manufacturer: (incumbentMaterial as any)?.supplierName || 'Unknown',
        tradeName: incumbentMaterial?.name || 'Unknown',
        modelNumber: (incumbentMaterial as any)?.sku || undefined,
      },

      proposedSubstitution: {
        manufacturer: (sustainableMaterial as any)?.supplierName || 'Unknown',
        tradeName: sustainableMaterial?.name || 'Unknown',
        modelNumber: (sustainableMaterial as any)?.sku || undefined,
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
        specifiedCost: Number((validation as any).incumbentTotalCost) || 0,
        proposedCost: Number((validation as any).sustainableTotalCost) || 0,
        netChange: (Number((validation as any).sustainableTotalCost) || 0) - (Number((validation as any).incumbentTotalCost) || 0),
      },

      environmentalImpact: {
        specifiedGWP: Number((validation as any).incumbentGWP) || 0,
        proposedGWP: Number((validation as any).sustainableGWP) || 0,
        gwpReduction: (Number((validation as any).incumbentGWP) || 0) - (Number((validation as any).sustainableGWP) || 0),
        gwpReductionPercent: Number((validation as any).gwpReductionPercent) || 0,
        specifiedEPD: (incumbentMaterial as any)?.epdUrl || undefined,
        proposedEPD: (sustainableMaterial as any)?.epdUrl || undefined,
      },

      technicalSpecs: {
        specified: {
          astmCodes: incumbentSpecs?.astmCodes as string[] | undefined,
          fireRating: incumbentSpecs?.fireRating ? String(incumbentSpecs.fireRating) : undefined,
          compressiveStrength: incumbentSpecs?.compressiveStrength ? Number(incumbentSpecs.compressiveStrength) : undefined,
          tensileStrength: incumbentSpecs?.tensileStrength ? Number(incumbentSpecs.tensileStrength) : undefined,
          rValue: incumbentSpecs?.rValuePerInch ? Number(incumbentSpecs.rValuePerInch) : undefined,
          stcRating: incumbentSpecs?.stcRating ? Number(incumbentSpecs.stcRating) : undefined,
          warranty: incumbentSpecs?.warrantyYears ? Number(incumbentSpecs.warrantyYears) : undefined,
        },
        proposed: {
          astmCodes: sustainableSpecs?.astmCodes as string[] | undefined,
          fireRating: sustainableSpecs?.fireRating ? String(sustainableSpecs.fireRating) : undefined,
          compressiveStrength: sustainableSpecs?.compressiveStrength ? Number(sustainableSpecs.compressiveStrength) : undefined,
          tensileStrength: sustainableSpecs?.tensileStrength ? Number(sustainableSpecs.tensileStrength) : undefined,
          rValue: sustainableSpecs?.rValuePerInch ? Number(sustainableSpecs.rValuePerInch) : undefined,
          stcRating: sustainableSpecs?.stcRating ? Number(sustainableSpecs.stcRating) : undefined,
          warranty: sustainableSpecs?.warrantyYears ? Number(sustainableSpecs.warrantyYears) : undefined,
        },
      },

      reasonForSubstitution: generateJustification(validation, showstopperChecks),
      additionalNotes: (validation as any).notes || undefined,
    };

    const generator = new CSIFormGenerator();
    const pdfBuffer = await generator.generate(formData);

    const filename = `CSI-13.1A_${
      (formData.projectName || 'Project').replace(/\s+/g, '-')
    }_${
      (incumbentMaterial?.name || 'Material').replace(/\s+/g, '-')
    }_${new Date().toISOString().split('T')[0]}.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error generating CSI form:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSI form', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function generateJustification(validation: any, showstopperChecks: any): string {
  const status = validation.validationStatus;
  const gwpReduction = Number(validation.gwpReductionPercent) || 0;
  const costDelta = (Number(validation.sustainableTotalCost) || 0) - (Number(validation.incumbentTotalCost) || 0);

  if (status === 'APPROVED') {
    let j = `The proposed substitution has been validated by GreenChainz and determined to be functionally equivalent to the specified product. All critical performance metrics (ASTM codes, fire rating, structural properties, thermal performance, and acoustic performance) meet or exceed the specified requirements. `;
    if (gwpReduction > 0) j += `This substitution provides a ${gwpReduction.toFixed(1)}% reduction in Global Warming Potential (GWP), supporting project sustainability goals. `;
    if (costDelta < 0) j += `It also offers cost savings of $${Math.abs(costDelta).toLocaleString()}, delivering both environmental and economic value.`;
    else if (costDelta === 0) j += `The proposed substitution is cost-neutral while delivering superior environmental performance.`;
    else j += `While the substitution carries a cost premium of $${costDelta.toLocaleString()}, this is offset by significant carbon savings and long-term sustainability benefits.`;
    return j;
  }

  if (status === 'EXPERIMENTAL') {
    const failed = Object.entries(showstopperChecks || {})
      .filter(([, v]: any) => v?.pass === false)
      .map(([k]) => k.replace(/([A-Z])/g, ' $1').trim());
    let j = `The proposed substitution has been evaluated by GreenChainz and determined to be substantially equivalent to the specified product, with minor differences in: ${failed.join(', ') || 'select metrics'}. These differences are not expected to materially affect performance or suitability. `;
    if (gwpReduction > 0) j += `Environmental benefits are significant: ${gwpReduction.toFixed(1)}% GWP reduction. `;
    j += `We recommend acceptance based on overall functional equivalence and sustainability advantages, with design team review of noted differences.`;
    return j;
  }

  return `The proposed substitution has been evaluated by GreenChainz and determined to have significant differences from the specified product that may affect project performance. Further investigation and design team review are required before this substitution can be recommended.`;
}
