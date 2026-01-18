import { NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth/jwt'; 

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    // 1. Hardcoded Check (Works immediately)
    const isArchitect = email === 'demo@architect.com' && password === 'demo123';
    const isSupplier = email === 'demo@supplier.com' && password === 'demo123';

    if (!isArchitect && !isSupplier) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // 2. Build User Object
    const user = {
      id: isSupplier ? 'sup-123' : 'arch-456',
      email: email,
      role: isSupplier ? 'supplier' : 'architect',
      full_name: isSupplier ? 'Demo Supplier' : 'Demo Architect'
    };

    // 3. Generate Token
    const token = generateToken({ 
      userId: user.id, 
      email: user.email, 
      role: user.role 
    });

    // 4. Create Response
    const response = NextResponse.json({ success: true, user, token });

    // 5. SET COOKIE (CRITICAL FIX FOR LOCALHOST)
    // If we are in dev (localhost), secure must be FALSE.
    const isProduction = process.env.NODE_ENV === 'production';
    
    response.cookies.set({
      name: 'greenchainz-auth-token',
      value: token,
      httpOnly: true,
      path: '/',
      secure: isProduction, // false on localhost, true on Azure
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return response;

  } catch (error) {
    console.error('Login Route Error:', error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
