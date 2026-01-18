import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth/jwt'; // Your existing JWT lib
// import { getSecret } from '@/lib/azure/keyvault'; // Future: Fetch secrets dynamically
// import { sql } from '@/lib/azure/db'; // Future: Your actual Azure SQL client

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    // --- STEP 1: AUTHENTICATE USER (STRICTLY AZURE) ---
    // In a real Azure build, you'd query Azure SQL here.
    // Ideally, we fetch the DB connection string from Key Vault if not using Managed Identity.
    
    // MOCK VALIDATION (Replace with your actual Azure SQL query logic)
    // const result = await sql.query`SELECT * FROM Users WHERE Email = ${email}`;
    // const user = result.recordset[0];
    
    // For now, allow the demo users to pass so you can work:
    const validArchitect = email === 'demo@architect.com' && password === 'demo123';
    const validSupplier = email === 'demo@supplier.com' && password === 'demo123';

    let user = null;

    if (validArchitect) {
      user = {
        id: 'arch-123',
        email: 'demo@architect.com',
        role: 'architect',
        full_name: 'Architect Demo',
        avatar_url: ''
      };
    } else if (validSupplier) {
      user = {
        id: 'supp-456',
        email: 'demo@supplier.com',
        role: 'supplier',
        full_name: 'Supplier Demo',
        avatar_url: ''
      };
    } else {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // --- STEP 2: GENERATE SESSION (USING YOUR JWT LIB) ---
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // --- STEP 3: RETURN RESPONSE & SET COOKIE ---
    const response = NextResponse.json({
      success: true,
      user: user, // Crucial: This is what useAuth needs
      token
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Azure Login Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
