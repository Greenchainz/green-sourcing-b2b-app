import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/swap-validation/[id]
 * Retrieves a single validation result by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const validationId = parseInt(params.id);

    if (isNaN(validationId)) {
      return NextResponse.json(
        { error: 'Invalid validation ID' },
        { status: 400 }
      );
    }

    const validation = await prisma.swapValidation.findUnique({
      where: { id: validationId },
    });

    if (!validation) {
      return NextResponse.json(
        { error: 'Validation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      validation,
    });
  } catch (error: any) {
    console.error('Validation retrieval error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/swap-validation/[id]
 * Re-runs validation for an existing swap
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const validationId = parseInt(params.id);

    if (isNaN(validationId)) {
      return NextResponse.json(
        { error: 'Invalid validation ID' },
        { status: 400 }
      );
    }

    // Get existing validation
    const existingValidation = await prisma.swapValidation.findUnique({
      where: { id: validationId },
    });

    if (!existingValidation) {
      return NextResponse.json(
        { error: 'Validation not found' },
        { status: 404 }
      );
    }

    // Re-run validation
    const { validateSwap } = await import('@/app/lib/swapValidationService');
    const validationResult = await validateSwap(
      existingValidation.incumbentMaterialId,
      existingValidation.sustainableMaterialId
    );

    // Update validation record
    const updatedValidation = await prisma.swapValidation.update({
      where: { id: validationId },
      data: {
        validationStatus: validationResult.validationStatus,
        overallScore: validationResult.overallScore,
        showstopperResults: validationResult.showstopperResults as any,
        passedChecks: validationResult.passedChecks,
        failedChecks: validationResult.failedChecks,
        skippedChecks: validationResult.skippedChecks,
        recommendation: validationResult.recommendation,
        validatedAt: new Date(),
        expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months
      },
    });

    return NextResponse.json({
      success: true,
      validation: updatedValidation,
    });
  } catch (error: any) {
    console.error('Validation re-run error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
