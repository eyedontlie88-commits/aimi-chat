import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getAuth, DecodedIdToken } from 'firebase-admin/auth'

/**
 * Firebase Admin SDK (Server-Side Only)
 * Uses service account credentials from env var
 */

let adminApp: App | undefined

function getAdminApp(): App {
    if (!adminApp) {
        const apps = getApps()
        if (apps.length > 0) {
            adminApp = apps[0]
        } else {
            const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
            if (!serviceAccountJson) {
                throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON env var is not set')
            }

            try {
                // Parse JSON, handle escaped newlines in private_key
                const serviceAccount = JSON.parse(serviceAccountJson)
                if (serviceAccount.private_key) {
                    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n')
                }

                adminApp = initializeApp({
                    credential: cert(serviceAccount),
                })
            } catch (error) {
                console.error('[Firebase Admin] Failed to parse service account JSON')
                throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON format')
            }
        }
    }
    return adminApp
}

export interface VerifiedToken {
    uid: string
    email: string | undefined
    role: 'dev' | 'user'
    claims: DecodedIdToken
}

/**
 * Verify Firebase ID token from Authorization header
 * Returns null if no token or invalid token
 */
export async function verifyIdToken(authHeader: string | null): Promise<VerifiedToken | null> {
    console.log('[verifyIdToken] Called with header:', authHeader ? 'EXISTS (length=' + authHeader.length + ')' : 'NULL')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('[verifyIdToken] No valid Bearer token found')
        return null
    }

    const token = authHeader.substring(7) // Remove "Bearer "
    console.log('[verifyIdToken] Extracted token length:', token.length)

    try {
        const app = getAdminApp()
        const auth = getAuth(app)
        const decoded = await auth.verifyIdToken(token)
        console.log('[verifyIdToken] Token verified successfully, uid:', decoded.uid)

        // Extract role from custom claims, default to 'user'
        const role = decoded.role === 'dev' ? 'dev' : 'user'

        return {
            uid: decoded.uid,
            email: decoded.email,
            role,
            claims: decoded,
        }
    } catch (error) {
        // Don't log full token for security
        console.warn('[verifyIdToken] Token verification FAILED:',
            error instanceof Error ? error.message : 'Unknown error')
        return null
    }
}

/**
 * Set custom claims on a user (admin only)
 * Use this to assign dev role
 */
export async function setUserRole(uid: string, role: 'dev' | 'user'): Promise<void> {
    const app = getAdminApp()
    const auth = getAuth(app)
    await auth.setCustomUserClaims(uid, { role })
    console.log(`[Firebase Admin] Set role="${role}" for user ${uid.substring(0, 8)}...`)
}

/**
 * Get user by email (for admin endpoint)
 */
export async function getUserByEmail(email: string) {
    const app = getAdminApp()
    const auth = getAuth(app)
    return auth.getUserByEmail(email)
}
