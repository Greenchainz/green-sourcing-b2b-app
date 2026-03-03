import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { CSIFormGenerator, type CSIFormData } from '@/app/lib/csiFormGenerator';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const validationId = params.id;

    // Fetch validation data from database
    const validation = await prisma.swapValidations.findUnique({
      where: { id: validationId },
      include: {
        incumbentMaterial: true,
        sustainableMaterial: true,
      },
    });

    if (!validation) {
      return NextResponse.json(
        { error: 'Validation not found' },
        { status: 404 }
      );
    }

    // Fetch technical specs for both materials
    const [incumbentSpecs, sustainableSpecs] = await Promise.all([
      prisma.materialTechnicalSpecs.findFirst({
        where: { materialId: validation.incumbentMaterialId },
      }),
      prisma.materialTechnicalSpecs.findFirst({
        where: { materialId: validation.sustainableMaterialId },
      }),
    ]);

    // Parse showstopper checks from JSON
    const showstopperChecks = validation.showstopperChecks as any;

    // Prepare CSI form data
    const formData: CSIFormData = {
      // Project Information
      projectName: validation.projectName || 'Unnamed Project',
      architectName: validation.architectName || 'To Be Determined',
      contractorName: validation.contractorName || 'To Be Determined',
      requestNumber: `GC-${validation.id.slice(0, 8).toUpperCase()}`,
      specificationSection: validation.specificationSection || '03 30 00 - Cast-in-Place Concrete',
      date: validation.createdAt,

      // Product Information
      specifiedProduct: {
        manufacturer: validation.incumbentMaterial?.supplierName || 'Unknown',
        tradeName: validation.incumbentMaterial?.name || 'Unknown',
        modelNumber: validation.incumbentMaterial?.sku || undefined,
      },

      proposedSubstitution: {
        manufacturer: validation.sustainableMaterial?.supplierName || 'Unknown',
        tradeName: validation.sustainableMaterial?.name || 'Unknown',
        modelNumber: validation.sustainableMaterial?.sku || undefined,
      },

      // Validation Results
      validationStatus: validation.status as 'APPROVED' | 'EXPERIMENTAL' | 'REJECTED',
      validationScore: validation.score || 0,
      showstopperChecks: {
        astmMatch: showstopperChecks?.astmMatch ?? false,
        fireRatingMatch: showstopperChecks?.fireRatingMatch ?? false,
        compressiveStrengthMatch: showstopperChecks?.compressiveStrengthMatch ?? false,
        tensileStrengthMatch: showstopperChecks?.tensileStrengthMatch ?? false,
        modulusMatch: showstopperChecks?.modulusMatch ?? false,
        rValueMatch: showstopperChecks?.rValueMatch ?? false,
        permRatingMatch: showstopperChecks?.permRatingMatch ?? false,
        stcMatch: showstopperChecks?.stcMatch ?? false,
        iicMatch: showstopperChecks?.iicMatch ?? false,
        ulListingMatch: showstopperChecks?.ulListingMatch ?? false,
        laborUnitsMatch: showstopperChecks?.laborUnitsMatch ?? false,
        lifecycleMatch: showstopperChecks?.lifecycleMatch ?? false,
      },

      // Cost Comparison
      costComparison: {
        specifiedCost: validation.incumbentTotalCost || 0,
        proposedCost: validation.sustainableTotalCost || 0,
        netChange: (validation.sustainableTotalCost || 0) - (validation.incumbentTotalCost || 0),
      },

      // Environmental Impact
      environmentalImpact: {
        specifiedGWP: validation.incumbentGWP || 0,
        proposedGWP: validation.sustainableGWP || 0,
        gwpReduction: (validation.incumbentGWP || 0) - (validation.sustainableGWP || 0),
        gwpReductionPercent: validation.gwpReductionPercent || 0,
        specifiedEPD: validation.incumbentMaterial?.epdUrl || undefined,
        proposedEPD: validation.sustainableMaterial?.epdUrl || undefined,
      },

      // Technical Specifications
      technicalSpecs: {
        specified: {
          astmCodes: incumbentSpecs?.astmCodes as string[] | undefined,
          fireRating: incumbentSpecs?.fireRating || undefined,
          compressiveStrength: incumbentSpecs?.compressiveStrength || undefined,
          tensileStrength: incumbentSpecs?.tensileStrength || undefined,
          rValue: incumbentSpecs?.rValuePerInch || undefined,
          stcRating: incumbentSpecs?.stcRating || undefined,
          warranty: incumbentSpecs?.warrantyYears || undefined,
        },
        proposed: {
          astmCodes: sustainableSpecs?.astmCodes as string[] | undefined,
          fireRating: sustainableSpecs?.fireRating || undefined,
          compressiveStrength: sustainableSpecs?.compressiveStrength || undefined,
          tensileStrength: sustainableSpecs?.tensileStrength || undefined,
          rValue: sustainableSpecs?.rValuePerInch || undefined,
          stcRating: sustainableSpecs?.stcRating || undefined,
          warranty: sustainableSpecs?.warrantyYears || undefined,
        },
      },

      // Justification
      reasonForSubstitution: generateJustification(validation, showstopperChecks),
      additionalNotes: validation.notes || undefined,
    };

    // Generate PDF
    const generator = new CSIFormGenerator();
    const pdfBuffer = await generator.generate(formData);

    // Return PDF as downloadable file
    const filename = `CSI-13.1A_${validation.projectName?.replace(/\s+/g, '-') || 'Project'}_${validation.incumbentMaterial?.name?.replace(/\s+/g, '-') || 'Material'}_${new Date().toISOString().split('T')[0]}.pdf`;

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
  const status = validation.status;
  const gwpReduction = validation.gwpReductionPercent || 0;
  const costDelta = (validation.sustainableTotalCost || 0) - (validation.incumbentTotalCost || 0);

  let justification = '';

  if (status === 'APPROVED') {
    justification = `The proposed substitution has been validated by GreenChainz and determined to be functionally equivalent to the specified product. All critical performance metrics (ASTM codes, fire rating, structural properties, thermal performance, and acoustic performance) meet or exceed the specified requirements. `;

    if (gwpReduction > 0) {
      justification += `Additionally, this substitution provides significant environmental benefits with a ${gwpReduction.toFixed(1)}% reduction in Global Warming Potential (GWP), supporting the project's sustainability goals. `;
    }

    if (costDelta < 0) {
      justification += `The proposed substitution also offers cost savings of $${Math.abs(costDelta).toLocaleString()}, providing both environmental and economic value.`;
    } else if (costDelta === 0) {
      justification += `The proposed substitution is cost-neutral while delivering superior environmental performance.`;
    } else {
      justification += `While the proposed substitution has a modest cost premium of $${costDelta.toLocaleString()}, this is offset by the significant carbon savings and long-term sustainability benefits.`;
    }
  } else if (status === 'EXPERIMENTAL') {
    const failedChecks = Object.entries(showstopperChecks || {})
      .filter(([_, passed]) => !passed)
      .map(([check]) => check.replace(/([A-Z])/g, ' $1').trim());

    justification = `The proposed substitution has been evaluated by GreenChainz and determined to be substantially equivalent to the specified product, with minor differences in the following areas: ${failedChecks.join(', ')}. These differences are not expected to materially affect the performance or suitability of the product for this application. `;

    if (gwpReduction > 0) {
      justification += `The environmental benefits are significant, with a ${gwpReduction.toFixed(1)}% reduction in GWP. `;
    }

    justification += `We recommend acceptance of this substitution based on the overall functional equivalence and sustainability advantages, with appropriate review of the noted differences by the design team.`;
  } else {
    justification = `The proposed substitution has been evaluated by GreenChainz and determined to have significant differences from the specified product that may affect project performance. While this substitution offers environmental benefits, it does not meet the functional equivalence criteria established for this project. Further investigation and design team review are required before this substitution can be recommended.`;
  }

  return justification;
}
