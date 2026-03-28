/**
 * GET /api/auth/me
 *
 * NOTE: This Next.js route is superseded by the Express /api/auth/me handler
 * in server/_core/oauth-providers.ts which uses JWT session cookies.
 * This file is kept for reference only and is not reachable in production.
 */

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    { error: 'Use the Express /api/auth/me endpoint' },
    { status: 501 }
  );
}
