/**
 * Example API Route demonstrating Azure Easy Auth usage
 * 
 * This route shows how to access user information from Easy Auth headers
 * in a Next.js API route. The middleware automatically protects this route
 * and makes user information available in the request headers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEasyAuthUser, hasRole } from '@/lib/auth/easy-auth';

export const dynamic = 'force-dynamic'; // Disable caching

/**
 * GET /api/auth/me
 * 
 * Returns the current authenticated user's information from Easy Auth.
 * This endpoint is automatically protected by the middleware.
 */
export async function GET(request: NextRequest) {
  try {
    // Get user information from Easy Auth headers
    const user = getEasyAuthUser(request.headers);

    if (!user) {
      return NextResponse.json(
        { error: 'User information not available' },
        { status: 401 }
      );
    }

    // Return user information
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles,
        // Don't expose all claims to the client for security
        isAdmin: hasRole(user, 'admin'),
        isSupplier: hasRole(user, 'supplier'),
      },
      authentication: {
        provider: 'Azure AD',
        method: 'Easy Auth',
      },
    });
  } catch (error) {
    console.error('[API] Error in /api/auth/me:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
