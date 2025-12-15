import { NextRequest, NextResponse } from 'next/server'
import { getUserByEmail, setUserRole } from '@/lib/firebase/admin'

export const dynamic = 'force-dynamic'

/**
 * Admin endpoint to set user role (dev/user)
 * 
 * PROTECTED BY:
 * 1. NODE_ENV !== 'production' (disabled in production)
 * 2. DEV_ADMIN_SECRET header check
 * 
 * Usage:
 * POST /api/admin/set-dev
 * Headers: { X-Dev-Admin-Secret: <secret> }
 * Body: { email: "user@example.com", role: "dev" | "user" }
 */
export async function POST(request: NextRequest) {
    // Guard 1: Only in non-production
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
            { error: 'Admin endpoint disabled in production' },
            { status: 403 }
        )
    }

    // Guard 2: Verify admin secret
    const adminSecret = process.env.DEV_ADMIN_SECRET
    if (!adminSecret) {
        console.error('[Admin] DEV_ADMIN_SECRET is not configured')
        return NextResponse.json(
            { error: 'Admin endpoint not configured' },
            { status: 500 }
        )
    }

    const providedSecret = request.headers.get('x-dev-admin-secret')
    if (providedSecret !== adminSecret) {
        console.warn('[Admin] Invalid admin secret attempt')
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        )
    }

    try {
        const body = await request.json()
        const { email, role } = body

        // Validate input
        if (!email || typeof email !== 'string') {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            )
        }

        if (role !== 'dev' && role !== 'user') {
            return NextResponse.json(
                { error: 'Role must be "dev" or "user"' },
                { status: 400 }
            )
        }

        // Get user by email
        const user = await getUserByEmail(email)

        // Set custom claim
        await setUserRole(user.uid, role)

        return NextResponse.json({
            success: true,
            message: `Set role="${role}" for ${email}`,
            uid: user.uid,
        })

    } catch (error) {
        console.error('[Admin] Error setting user role:',
            error instanceof Error ? error.message : 'Unknown error')

        // Check for user not found
        if (error instanceof Error && error.message.includes('no user record')) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            )
        }

        return NextResponse.json(
            { error: 'Failed to set user role' },
            { status: 500 }
        )
    }
}
