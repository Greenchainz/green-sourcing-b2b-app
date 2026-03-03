import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/pricing-data?materialId=1&state=TX&source=TXDOT
 * Retrieves regional pricing data with filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const materialId = searchParams.get('materialId');
    const state = searchParams.get('state');
    const county = searchParams.get('county');
    const city = searchParams.get('city');
    const source = searchParams.get('source');
    const isActive = searchParams.get('isActive');

    const where: any = {};
    
    if (materialId) {
      where.materialId = parseInt(materialId);
    }
    if (state) {
      where.state = state.toUpperCase();
    }
    if (county) {
      where.county = county;
    }
    if (city) {
      where.city = city;
    }
    if (source) {
      where.source = source;
    }
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const pricingData = await prisma.pricingData.findMany({
      where,
      orderBy: { sourceDate: 'desc' },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      count: pricingData.length,
      data: pricingData,
    });
  } catch (error: any) {
    console.error('Pricing data query error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pricing-data
 * Creates new pricing data entry
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      materialId,
      pricePerUnit,
      unit,
      currency = 'USD',
      state,
      city,
      zipCode,
      county,
      source,
      sourceDate,
      sourceUrl,
      projectName,
      contractNumber,
      laborRatePerHour,
      totalLaborCost,
      dataConfidence = 50,
      expiresAt,
    } = body;

    // Validate required fields
    if (!materialId || !pricePerUnit || !unit || !source) {
      return NextResponse.json(
        { error: 'materialId, pricePerUnit, unit, and source are required' },
        { status: 400 }
      );
    }

    const pricingData = await prisma.pricingData.create({
      data: {
        materialId,
        pricePerUnit,
        unit,
        currency,
        state,
        city,
        zipCode,
        county,
        source,
        sourceDate: sourceDate ? new Date(sourceDate) : null,
        sourceUrl,
        projectName,
        contractNumber,
        laborRatePerHour,
        totalLaborCost,
        dataConfidence,
        isActive: true,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });

    return NextResponse.json({
      success: true,
      data: pricingData,
    });
  } catch (error: any) {
    console.error('Pricing data creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
