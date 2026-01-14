import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// frontend sends POST to finalize sign-in
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Create the dashboard redirect URL
    const origin = new URL(request.url).origin;
    const response = NextResponse.json({ 
        success: true, 
        user: { ...data, id: data.azureId, role: 'architect' } // Default role
    });

    // Set the session cookie securely
    response.cookies.set('greenchainz-auth-token', 'session-active', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600 
    });

    return response;
  } catch (error: any) {
    console.error('Finalize sign-in crash:', error.message);
    return NextResponse.json({ error: 'Finalization failed' }, { status: 500 });
  }
}
