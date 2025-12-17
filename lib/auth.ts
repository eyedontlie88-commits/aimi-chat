import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import prisma from './prisma'
import { verifyIdToken } from './firebase/admin'

// Constants
const ANONYMOUS_USER_ID = 'me'

// Type definitions
export interface AuthContext {
    uid: string
    role: 'user' | 'dev'
    email?: string | null
    isAuthed: boolean
    prisma: PrismaClient
}

export class AuthRequiredError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'AuthRequiredError'
    }
}

/**
 * Check if authentication is required
 */
function isAuthRequired(): boolean {
    return process.env.REQUIRE_AUTH === 'true'
}

/**
 * Check if error is an auth error
 */
export function isAuthError(error: unknown): error is AuthRequiredError {
    return error instanceof AuthRequiredError
}

/**
 * Get authentication context from request
 * Returns shared prisma client (no schema routing)
 */
export async function getAuthContext(request: NextRequest): Promise<AuthContext> {
    const authHeader = request.headers.get('authorization')
    const verified = await verifyIdToken(authHeader)

    if (verified) {
        // Authenticated user
        console.log(`[Auth] ${verified.role} (${verified.email?.substring(0, 8)}...)`)

        return {
            uid: verified.uid,
            role: verified.role,
            email: verified.email,
            isAuthed: true,
            prisma,
        }
    }

    // Auth required but not authenticated
    if (isAuthRequired()) {
        throw new AuthRequiredError('Authentication required')
    }

    // Guest user
    console.log(`[Auth] guest (uid=me)`)

    return {
        uid: ANONYMOUS_USER_ID,
        role: 'user',
        email: null,
        isAuthed: false,
        prisma,
    }
}

/**
 * Wrapper for API routes with automatic error handling
 */
export function withAuth(
    handler: (request: NextRequest, context: AuthContext) => Promise<NextResponse>
): (request: NextRequest) => Promise<NextResponse> {
    return async (request: NextRequest) => {
        try {
            const authContext = await getAuthContext(request)
            return handler(request, authContext)
        } catch (error) {
            if (isAuthError(error)) {
                return NextResponse.json({ error: error.message }, { status: 401 })
            }
            console.error('[Auth] Unexpected error:', error)
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
        }
    }
}
