import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import {
    getAuth,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    User,
    Auth
} from 'firebase/auth'

/**
 * Firebase Client SDK
 * All env vars prefixed with NEXT_PUBLIC_ are exposed to browser
 */

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Initialize Firebase (singleton)
let app: FirebaseApp | undefined
let auth: Auth | undefined

function getFirebaseApp(): FirebaseApp {
    if (!app) {
        const apps = getApps()
        app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig)
    }
    return app
}

export function getFirebaseAuth(): Auth {
    if (!auth) {
        auth = getAuth(getFirebaseApp())
    }
    return auth
}

// Auth Providers
const googleProvider = new GoogleAuthProvider()

/**
 * Sign in with Google popup
 */
export async function signInWithGoogle(): Promise<User> {
    const auth = getFirebaseAuth()
    const result = await signInWithPopup(auth, googleProvider)
    return result.user
}

/**
 * Sign in with email/password
 */
export async function signInWithEmail(email: string, password: string): Promise<User> {
    const auth = getFirebaseAuth()
    const result = await signInWithEmailAndPassword(auth, email, password)
    return result.user
}

/**
 * Create account with email/password
 */
export async function createAccount(email: string, password: string): Promise<User> {
    const auth = getFirebaseAuth()
    const result = await createUserWithEmailAndPassword(auth, email, password)
    return result.user
}

/**
 * Sign out
 */
export async function signOut(): Promise<void> {
    const auth = getFirebaseAuth()
    await firebaseSignOut(auth)
}

/**
 * Get current ID token (for API calls)
 * Returns null if not signed in
 * Waits for auth state to initialize before checking
 */
export async function getIdToken(): Promise<string | null> {
    const auth = getFirebaseAuth()
    console.log('[getIdToken] Called, currentUser exists:', !!auth.currentUser)

    // If currentUser is already available, return token immediately
    if (auth.currentUser) {
        console.log('[getIdToken] User already available, getting token...')
        const token = await auth.currentUser.getIdToken()
        console.log('[getIdToken] Token obtained:', token ? token.substring(0, 20) + '...' : 'NULL')
        return token
    }

    // Wait for auth state to initialize (first onAuthStateChanged callback)
    console.log('[getIdToken] Waiting for auth state change...')
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe()
            console.log('[getIdToken] Auth state changed, user exists:', !!user)
            if (user) {
                user.getIdToken()
                    .then((token) => {
                        console.log('[getIdToken] Token from promise:', token ? token.substring(0, 20) + '...' : 'NULL')
                        resolve(token)
                    })
                    .catch((err) => {
                        console.error('[getIdToken] Error getting token:', err)
                        resolve(null)
                    })
            } else {
                console.log('[getIdToken] No user, returning null')
                resolve(null)
            }
        })
    })
}

/**
 * Get current user synchronously
 */
export function getCurrentUser(): User | null {
    const auth = getFirebaseAuth()
    return auth.currentUser
}

/**
 * Subscribe to auth state changes
 */
export function onAuthChange(callback: (user: User | null) => void): () => void {
    const auth = getFirebaseAuth()
    return onAuthStateChanged(auth, callback)
}

export type { User }
