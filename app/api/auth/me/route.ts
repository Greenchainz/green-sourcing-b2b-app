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

    // Determine primary role (for backward compatibility)
    // Priority: admin > supplier > architect > buyer > user > first role > null
    const isAdmin = hasRole(user, 'admin');
    const isSupplier = hasRole(user, 'supplier');
    const isArchitect = hasRole(user, 'architect');
    const isBuyer = hasRole(user, 'buyer');
    
    // Determine primary role based on priority
    let primaryRole: string | null = null;
    if (isAdmin) {
      primaryRole = 'admin';
    } else if (isSupplier) {
      primaryRole = 'supplier';
    } else if (isArchitect) {
      primaryRole = 'architect';
    } else if (isBuyer) {
      primaryRole = 'buyer';
    } else if (hasRole(user, 'user')) {
      primaryRole = 'user';
    } else if (user.roles.length > 0) {
      // Fallback to first role if none of the known roles match
      primaryRole = user.roles[0];
    }

    // Return user information
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles,
        role: primaryRole, // Primary role for compatibility (prioritized)
        // Role flags for easy checking
        isAdmin,
        isSupplier,
        isArchitect,
        isBuyer,
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
