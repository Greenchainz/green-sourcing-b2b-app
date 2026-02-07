import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const error_description = searchParams.get('error_description');

  if (error) {
    console.error('Auth error:', error, error_description);
    return NextResponse.redirect(new URL('/login?error=' + error, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=NoCode', request.url));
  }

  // TODO: Exchange code for token
  console.log('✓ Got auth code:', code.substring(0, 20) + '...');
  
  // For now, just redirect to home
  return NextResponse.redirect(new URL('/', request.url));
}
