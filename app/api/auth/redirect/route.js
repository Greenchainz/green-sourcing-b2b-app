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

  console.log('✓ Got auth code:', code.substring(0, 20) + '...');

  // Exchange code for token
  try {
    const tokenResponse = await fetch(
      `${process.env.CLOUD_INSTANCE}${process.env.TENANT_ID}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET,
          code: code,
          redirect_uri: process.env.REDIRECT_URI,
          grant_type: 'authorization_code',
          scope: 'openid profile User.Read'
        })
      }
    );

    const tokens = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokens);
      return NextResponse.redirect(new URL('/login?error=TokenFailed', request.url));
    }

    console.log('✓ Got access token!');
    console.log('Token type:', tokens.token_type);
    console.log('Expires in:', tokens.expires_in, 'seconds');

    // TODO: Store tokens in session/cookie
    // For now, redirect to home with success
    const response = NextResponse.redirect(new URL('/', request.url));
    
    // Store token in cookie (temporary - use proper session later)
    response.cookies.set('access_token', tokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: tokens.expires_in
    });

    return response;

  } catch (error) {
    console.error('Token exchange error:', error);
    return NextResponse.redirect(new URL('/login?error=Exception', request.url));
  }
}
