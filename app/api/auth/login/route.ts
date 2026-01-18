import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateToken } from '@/lib/auth/jwt';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    // 1. Find user
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // 2. Validate password
    if (!user.password_hash) {
       return NextResponse.json({ error: 'Please login with LinkedIn' }, { status: 400 });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // 3. Generate Token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // 4. Prepare User Object for Client
    const userObj = {
      id: user.id,
      email: user.email,
      role: user.role, // "architect" or "supplier"
      full_name: user.full_name,
      avatar_url: user.avatar_url
    };

    // 5. Create Response & Set Cookie
    const response = NextResponse.json({
      success: true,
      user: userObj, // THIS WAS MISSING
      token
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Important for redirects
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
