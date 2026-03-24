// Auth is handled by Azure Easy Auth sidecar (/.auth/*) in production
// and by the Express server at /api/auth/* in development.
// This Next.js catch-all is a placeholder — do not add logic here.
export async function GET() {
  return Response.json({ error: "Use /.auth/login/aad for authentication" }, { status: 404 });
}
export const POST = GET;
