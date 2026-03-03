import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/pricing-data/regional-average?materialId=1&state=TX&county=Harris
 * Calculates average pricing for a material in a specific region
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const materialId = searchParams.get('materialId');
    const state = searchParams.get('state');
    const county = searchParams.get('county');
    const city = searchParams.get('city');

    if (!materialId) {
      return NextResponse.json(
        { error: 'materialId is required' },
        { status: 400 }
      );
    }

    const where: any = {
      materialId: parseInt(materialId),
      isActive: true,
    };

    if (state) {
      where.state = state.toUpperCase();
    }
    if (county) {
      where.county = county;
    }
    if (city) {
      where.city = city;
    }

    // Get all pricing data for the material in the region
    const pricingData = await prisma.pricingData.findMany({
      where,
      orderBy: { sourceDate: 'desc' },
    });

    if (pricingData.length === 0) {
      return NextResponse.json({
        success: true,
        averagePrice: null,
        dataPoints: 0,
        message: 'No pricing data found for this region',
      });
    }

    // Calculate weighted average based on data confidence
    let totalWeightedPrice = 0;
    let totalWeight = 0;

    pricingData.forEach((data) => {
      const weight = data.dataConfidence / 100;
      totalWeightedPrice += Number(data.pricePerUnit) * weight;
      totalWeight += weight;
    });

    const averagePrice = totalWeight > 0 ? totalWeightedPrice / totalWeight : 0;

    // Calculate standard deviation
    const prices = pricingData.map((d) => Number(d.pricePerUnit));
    const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const variance =
      prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) /
      prices.length;
    const stdDev = Math.sqrt(variance);

    return NextResponse.json({
      success: true,
      averagePrice: Math.round(averagePrice * 100) / 100,
      dataPoints: pricingData.length,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      standardDeviation: Math.round(stdDev * 100) / 100,
      unit: pricingData[0].unit,
      currency: pricingData[0].currency,
      sources: [...new Set(pricingData.map((d) => d.source))],
      latestUpdate: pricingData[0].sourceDate,
    });
  } catch (error: any) {
    console.error('Regional average calculation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
