
import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth/jwt'; 

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    // 1. HARDCODED DEMO CHECK (Bypassing DB for immediate fix)
    // In production, this would query Azure SQL.
    const isArchitect = email === 'demo@architect.com' && password === 'demo123';
    const isSupplier = email === 'demo@supplier.com' && password === 'demo123';

    if (!isArchitect && !isSupplier) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // 2. Create User Object
    const user = {
      id: isSupplier ? 'supplier-guid-123' : 'architect-guid-456',
      email: email,
      role: isSupplier ? 'supplier' : 'architect',
      full_name: isSupplier ? 'Demo Supplier' : 'Demo Architect',
      user_type: isSupplier ? 'supplier' : 'architect'
    };

    // 3. Generate Session Token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // 4. Return User
    const response = NextResponse.json({
      success: true,
      user: user,
      token
    });

    // --- CRITICAL FIX: NAMING THE COOKIE 'greenchainz-auth-token' ---
    response.cookies.set('greenchainz-auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return response;

  } catch (error) {
    console.error('Azure Login Error:', error);
    return NextResponse.json({ error: 'System Error' }, { status: 500 });
  }
}
