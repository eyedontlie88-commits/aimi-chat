import { NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { verifyIdToken } from '@/lib/firebase/admin'
import { getPrismaForRole, getPrismaForSchema, getSchemaForRole } from '@/lib/prisma'

/**
 * Auth Context for API Routes
 * Supports both authenticated and anonymous modes
 */
export interface AuthContext {
    /** User ID: Firebase UID if authenticated, 'me' if anonymous */
    uid: string
    /** User role from Firebase claims: 'dev' or 'user' */
    role: 'dev' | 'user'
    /** Prisma client configured for the correct schema */
    prisma: PrismaClient
    /** Whether user is authenticated */
    isAuthed: boolean
    /** User email (if authenticated) */
    email?: string
    /** Current schema being used */
    schema: 'public' | 'dev'
}

/**
 * Default anonymous user ID
 * Used for backward compatibility when auth is not required
 */
export const ANONYMOUS_USER_ID = 'me'

/**
 * Check if auth is required (for future migration)
 * Set REQUIRE_AUTH=true to enforce authentication
 */
function isAuthRequired(): boolean {
    return process.env.REQUIRE_AUTH === 'true'
}

/**
 * Get auth context from request
 * 
 * If authenticated: uses Firebase UID and role from claims
 * If anonymous: uses 'me' as UID, 'user' as role, ALWAYS 'public' schema
 * 
 * Does NOT throw for missing auth unless REQUIRE_AUTH=true
 */
export async function getAuthContext(request: NextRequest): Promise<AuthContext> {
    const authHeader = request.headers.get('authorization')
    const verified = await verifyIdToken(authHeader)

    if (verified) {
        // Authenticated user
        const schema = getSchemaForRole(verified.role)
        console.log(`[Auth] ${verified.role} (${verified.email?.substring(0, 8)}...) → schema ${schema}`)
        return {
            uid: verified.uid,
            role: verified.role,
            prisma: getPrismaForRole(verified.role),
            isAuthed: true,
            email: verified.email,
            schema,
        }
    }

    // Anonymous user - ALWAYS uses public schema
    if (isAuthRequired()) {
        throw new AuthRequiredError('Authentication required')
    }

    console.log(`[Auth] guest → schema public`)
    return {
        uid: ANONYMOUS_USER_ID,
        role: 'user',
        prisma: getPrismaForSchema('public'), // ALWAYS public for guest
        isAuthed: false,
        schema: 'public',
    }
}

/**
 * Require authentication (throws 401 if not authenticated)
 * Use this for endpoints that MUST have authenticated users
 */
export async function requireAuth(request: NextRequest): Promise<AuthContext> {
    const authHeader = request.headers.get('authorization')
    const verified = await verifyIdToken(authHeader)

    if (!verified) {
        throw new AuthRequiredError('Authentication required')
    }

    const schema = getSchemaForRole(verified.role)
    return {
        uid: verified.uid,
        role: verified.role,
        prisma: getPrismaForRole(verified.role),
        isAuthed: true,
        email: verified.email,
        schema,
    }
}

/**
 * Error class for authentication failures
 */
export class AuthRequiredError extends Error {
    constructor(message: string = 'Authentication required') {
        super(message)
        this.name = 'AuthRequiredError'
    }
}

/**
 * Helper to check if error is auth-related
 */
export function isAuthError(error: unknown): error is AuthRequiredError {
    return error instanceof AuthRequiredError
}
