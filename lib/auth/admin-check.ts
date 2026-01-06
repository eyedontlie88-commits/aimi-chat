import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from './require-auth'

/**
 * Require admin/dev role
 * Returns 404 to avoid leaking admin route existence
 */
export async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
    try {
        const { role } = await getAuthContext(request)

        // Allow dev or admin roles
        if (role !== 'dev' && role !== 'admin') {
            return NextResponse.json({ error: 'Not found' }, { status: 404 })
        }

        return null // authorized
    } catch (error) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
}
