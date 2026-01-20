import { NextResponse } from 'next/server';
import { generateTraceId, logAuthEvent } from '@/lib/auth/diagnostics';

export async function POST(_request: Request) {
  const traceId = generateTraceId();

  logAuthEvent('info', 'Sign-out initiated', {
    traceId,
    step: 'init'
  });

  const response = NextResponse.json({ success: true, message: 'Signed out successfully' });

  // Clear authentication cookies
  response.cookies.delete('greenchainz-auth-token');
  response.cookies.delete('token'); // Legacy/alternative
  response.cookies.delete('session'); // Legacy/alternative
  response.cookies.delete('refresh_token');

  logAuthEvent('info', 'Cookies cleared', {
    traceId,
    step: 'cookies-cleared'
  });

  return response;
}

export async function GET(request: Request) {
  // Support GET for simple link-based logout, redirects to home
  const traceId = generateTraceId();
  logAuthEvent('info', 'Sign-out initiated (GET)', { traceId, step: 'init' });

  const response = NextResponse.redirect(new URL('/', request.url));

  response.cookies.delete('greenchainz-auth-token');
  response.cookies.delete('token');
  response.cookies.delete('session');
  response.cookies.delete('refresh_token');

  return response;
}
