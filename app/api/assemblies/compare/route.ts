import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tagsParam = searchParams.get('tags');
    const tierParam = searchParams.get('tier');
    const limitParam = searchParams.get('limit');

    const parsedLimit = limitParam ? parseInt(limitParam, 10) : 20;
    const limit = isNaN(parsedLimit) ? 20 : parsedLimit;

    const where: Prisma.MaterialAssemblySpecWhereInput = {};

    if (tagsParam) {
      const tags = tagsParam.split(',').map((t) => t.trim()).filter(Boolean);
      if (tags.length > 0) {
        where.OR = [
          { assemblyTypeTags: { hasSome: tags } },
          { framingTypeTags: { hasSome: tags } },
        ];
      }
    }

    if (tierParam) {
      where.carbonTier = tierParam;
    }

    const [data, count] = await Promise.all([
      prisma.materialAssemblySpec.findMany({
        where,
        take: limit,
        orderBy: {
          gwpPer1000sf: 'asc',
        },
        select: {
          id: true,
          name: true,
          epdNumber: true,
          gwpPer1000sf: true,
          carbonTier: true,
          assemblyTypeTags: true,
          framingTypeTags: true,
          certificationTags: true,
        },
      }),
      prisma.materialAssemblySpec.count({ where }),
    ]);

    return NextResponse.json({ data, count });
  } catch (error) {
    console.error('Error fetching assemblies:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
