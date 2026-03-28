/**
 * NOTE: This Next.js route is not served in production.
 * The Express server in server/_core/ handles all /api/ routes.
 * RFQ creation is handled via tRPC (server/routers/) with JWT cookie auth.
 *
 * Easy Auth has been removed from this project. See docs/AUTH_ROUTE_CONTRACT.md.
 */

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Use the tRPC RFQ router" }, { status: 501 });
}

export async function GET() {
  return NextResponse.json({ error: "Use the tRPC RFQ router" }, { status: 501 });
}
