// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { azureHealthCheck } from '@/lib/azure/identity-client';

export const dynamic = 'force-dynamic'; // Disable caching for health checks
export const runtime = 'nodejs'; // Ensure Node.js runtime (not Edge)

export async function GET() {
  try {
    const azureStatus = await azureHealthCheck();

    const isHealthy = azureStatus.keyVault && azureStatus.appConfig;

    return NextResponse.json(
      {
        status: isHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        azure: azureStatus,
      },
      { status: isHealthy ? 200 : 503 }
    );
  } catch (error) {
    console.error('[Health] Error during health check:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}

