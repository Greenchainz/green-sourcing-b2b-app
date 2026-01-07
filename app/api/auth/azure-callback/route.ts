import { NextResponse } from "next/server";

function resolveBackendUrl(req: Request): string {
  // Priority: header > INTERNAL_BACKEND_URL > NEXT_PUBLIC_BACKEND_URL > BACKEND_URL > localhost fallback
  const headerValue = req.headers.get("x-backend-url");
  const internalUrl = process.env.INTERNAL_BACKEND_URL;
  const publicUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const backendUrl = process.env.BACKEND_URL;
  const localhostFallback = "http://localhost:3001";

  const candidate =
    headerValue || internalUrl || publicUrl || backendUrl || localhostFallback;

  if (!candidate) return localhostFallback;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    console.warn(
      `[Auth] Invalid backend URL format: ${candidate}, using fallback`
    );
    return localhostFallback;
  }

  // Allow localhost in development
  const isLocalhost =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "0.0.0.0";
  const isAzureContainerApps = url.hostname.endsWith(".azurecontainerapps.io");
  const isProductionDomain =
    url.hostname === "greenchainz.com" ||
    url.hostname === "www.greenchainz.com" ||
    url.hostname === "api.greenchainz.com";

  // In development, allow http. In production, require https (except localhost)
  const protocolOk = isLocalhost
    ? url.protocol === "http:" || url.protocol === "https:"
    : url.protocol === "https:";
  if (!protocolOk) {
    console.warn(
      `[Auth] Invalid protocol for backend URL: ${candidate}, using fallback`
    );
    return localhostFallback;
  }

  // Allow localhost, Azure Container Apps, or production domains
  if (isLocalhost || isAzureContainerApps || isProductionDomain) {
    return url.origin;
  }

  // In development mode, be more permissive
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[Auth] Using non-standard backend URL in development: ${candidate}`
    );
    return url.origin;
  }

  console.warn(
    `[Auth] Backend URL not in allowed list: ${candidate}, using fallback`
  );
  return localhostFallback;
}

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const backendUrl = resolveBackendUrl(req);

  console.log(`[Auth] Callback - Using backend URL: ${backendUrl}`);

  if (!backendUrl) {
    console.error("[Auth] No backend URL available");
    return NextResponse.json(
      {
        error: "Backend service unavailable. Please check your configuration.",
      },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  try {
    const url = `${backendUrl}/api/v1/auth/azure-callback`;
    console.log(`[Auth] Calling backend: ${url}`);

    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(15000), // Increased timeout
    });

    const text = await upstream.text();

    if (!upstream.ok) {
      console.error(
        `[Auth] Backend returned error: ${upstream.status} ${upstream.statusText}`
      );
      console.error(`[Auth] Response body: ${text.substring(0, 500)}`);
    }

    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") || "application/json",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorDetails =
      error instanceof Error && "cause" in error ? String(error.cause) : "";

    console.error("[Auth] Proxy Error:", {
      message: errorMessage,
      details: errorDetails,
      backendUrl,
      error:
        error instanceof TypeError
          ? "Network error - backend may be down"
          : errorMessage,
    });

    // Provide helpful error messages
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return NextResponse.json(
        {
          error: "Cannot connect to backend service",
          details: `Backend at ${backendUrl} is not reachable. Please ensure the backend is running.`,
          backendUrl,
        },
        { status: 502, headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }

    return NextResponse.json(
      {
        error: "Authentication service error",
        details: errorMessage,
        backendUrl,
      },
      { status: 502, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
