import { NextRequest, NextResponse } from 'next/server';
import { validateSwap, storeValidationResult } from '@/app/lib/swapValidationService';

/**
 * POST /api/swap-validation
 * Validates a material swap and stores the result
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      incumbentMaterialId,
      sustainableMaterialId,
      projectId,
      requestedBy,
      rfqId,
    } = body;

    // Validate required fields
    if (!incumbentMaterialId || !sustainableMaterialId) {
      return NextResponse.json(
        { error: 'incumbentMaterialId and sustainableMaterialId are required' },
        { status: 400 }
      );
    }

    // Run validation
    const validationResult = await validateSwap(
      incumbentMaterialId,
      sustainableMaterialId
    );

    // Store result in database
    const storedValidation = await storeValidationResult(
      incumbentMaterialId,
      sustainableMaterialId,
      validationResult,
      projectId,
      requestedBy,
      rfqId
    );

    return NextResponse.json({
      success: true,
      validation: {
        id: storedValidation.id,
        ...validationResult,
      },
    });
  } catch (error: any) {
    console.error('Swap validation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/swap-validation?incumbentMaterialId=1&sustainableMaterialId=2
 * Retrieves validation history for a material pair
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const incumbentMaterialId = searchParams.get('incumbentMaterialId');
    const sustainableMaterialId = searchParams.get('sustainableMaterialId');
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');

    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    const where: any = {};
    if (incumbentMaterialId) {
      where.incumbentMaterialId = parseInt(incumbentMaterialId);
    }
    if (sustainableMaterialId) {
      where.sustainableMaterialId = parseInt(sustainableMaterialId);
    }
    if (projectId) {
      where.projectId = parseInt(projectId);
    }
    if (status) {
      where.validationStatus = status;
    }

    const validations = await prisma.swapValidation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      validations,
    });
  } catch (error: any) {
    console.error('Validation history error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
