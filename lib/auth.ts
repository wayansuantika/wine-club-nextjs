/**
 * Authentication module
 * Handles password hashing, JWT tokens, and authentication middleware
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'wine-club-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

export interface JWTPayload {
  id: string;
  email: string;
  role: string;
  status: string;
}

/**
 * Hash a password
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Generate JWT token
 */
export function generateToken(
  userId: string,
  email: string,
  role: string = 'user',
  status: string = 'PENDING'
): string {
  return jwt.sign(
    {
      id: userId,
      email: email,
      role: role,
      status: status
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Extract token from request headers
 */
export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

/**
 * Verify authentication and return user data
 */
export function verifyAuth(request: NextRequest): { user: JWTPayload } | { error: string; status: number } {
  const token = getTokenFromRequest(request);

  if (!token) {
    return { error: 'Authentication required', status: 401 };
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return { error: 'Invalid or expired token', status: 401 };
  }

  return { user: decoded };
}

/**
 * Verify active member status
 */
export function verifyActiveMember(user: JWTPayload): { error: string; status: number } | null {
  if (user.status !== 'ACTIVE_MEMBER') {
    return {
      error: 'Active membership required',
      status: 403
    };
  }
  return null;
}

/**
 * Verify admin role
 */
export function verifyAdmin(user: JWTPayload): { error: string; status: number } | null {
  console.log('🔍 Admin check - User role:', user.role, 'Full user:', user);
  
  if (user.role !== 'admin' && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    console.log('❌ Admin access denied for role:', user.role);
    return { error: 'Admin access required', status: 403 };
  }
  
  console.log('✅ Admin access granted');
  return null;
}

/**
 * Verify super admin role
 */
export function verifySuperAdmin(user: JWTPayload): { error: string; status: number } | null {
  if (user.role !== 'SUPER_ADMIN') {
    return { error: 'Super admin access required', status: 403 };
  }
  return null;
}

/**
 * Verify guest access (for pages guests can still see)
 */
export function verifyGuestAccess(user: JWTPayload): { error: string; status: number } | null {
  // Guest or Active both allowed
  if (user.status === 'GUEST' || user.status === 'ACTIVE_MEMBER') {
    return null;
  }
  return { error: 'Account not activated', status: 403 };
}
