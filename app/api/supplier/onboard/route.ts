/**
 * NOTE: This Next.js route is not served in production.
 * The Express server in server/_core/ handles all /api/ routes.
 * Supplier onboarding is handled via tRPC (server/routers/supplierOnboarding.ts).
 *
 * Easy Auth has been removed from this project. See docs/AUTH_ROUTE_CONTRACT.md.
 */

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Use the tRPC supplierOnboarding router" }, { status: 501 });
}
