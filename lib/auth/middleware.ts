import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, JWTPayload } from './jwt';

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

/**
 * Verify JWT token from Authorization header or cookie
 * Returns decoded token payload or null if invalid
 */
export function authenticateRequest(request: NextRequest): JWTPayload | null {
  // Try Authorization header first (Bearer token)
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (decoded) return decoded;
  }

  // Fallback to cookie-based authentication
  const cookieToken = request.headers.get('cookie')?.match(/greenchainz-auth-token=([^;]+)/)?.[1] ||
                      request.headers.get('cookie')?.match(/token=([^;]+)/)?.[1];
  
  if (cookieToken) {
    return verifyToken(cookieToken);
  }

  return null;
}

/**
 * Create a 401 Unauthorized response
 */
export function unauthorizedResponse(message = 'Authentication required'): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 401 }
  );
}

/**
 * Create a 403 Forbidden response
 */
export function forbiddenResponse(message = 'Insufficient permissions'): NextResponse {
  return NextResponse.json(
    { error: message },
    { status: 403 }
  );
}

/**
 * Check if user has required role
 */
export function hasRole(user: JWTPayload | null, requiredRole: string): boolean {
  if (!user) return false;
  
  // Role hierarchy: admin > architect > supplier > user
  const roleHierarchy = ['user', 'supplier', 'architect', 'admin'];
  const userRoleIndex = roleHierarchy.indexOf(user.role?.toLowerCase() || 'user');
  const requiredRoleIndex = roleHierarchy.indexOf(requiredRole.toLowerCase());
  
  return userRoleIndex >= requiredRoleIndex;
}
