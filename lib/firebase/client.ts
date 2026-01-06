import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import {
    getAuth,
    signInWithPopup,
    signInWithCredential,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    User,
    Auth
} from 'firebase/auth'
import { Capacitor } from '@capacitor/core'
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth'

// CRITICAL: Initialize GoogleAuth plugin on native platforms
// This MUST be done before calling GoogleAuth.signIn()
let googleAuthInitialized = false

async function ensureGoogleAuthInitialized() {
    console.log('[GoogleAuth] Version: 2026-01-06-21:15 - Initialize before signIn fix')

    if (googleAuthInitialized) {
        return
    }

    if (!Capacitor.isNativePlatform()) {
        return
    }

    try {
        console.log('[GoogleAuth] Initializing plugin...')

        // Android: initialize without params (reads androidClientId/serverClientId from capacitor.config.ts)
        if (Capacitor.getPlatform() === 'android') {
            await GoogleAuth.initialize()
            console.log('[GoogleAuth] Android plugin initialized (using capacitor.config.ts)')
        } else {
            // iOS/Web: initialize with web clientId
            await GoogleAuth.initialize({
                clientId: process.env.NEXT_PUBLIC_FIREBASE_WEB_CLIENT_ID || '647583841932-gekeglpllnt43tb0gkqnq294j5ejomla.apps.googleusercontent.com',
                scopes: ['profile', 'email'],
                grantOfflineAccess: true,
            })
            console.log('[GoogleAuth] Plugin initialized with web clientId')
        }

        googleAuthInitialized = true
    } catch (error) {
        console.error('[GoogleAuth] Initialization error:', error)
        throw new Error('Failed to initialize Google Auth plugin')
    }
}

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
 * Sign in with Google
 * Uses native GoogleAuth plugin on Capacitor (Android/iOS)
 * Falls back to Firebase popup on web
 */
export async function signInWithGoogle(): Promise<User> {
    const auth = getFirebaseAuth()

    // Check if running on native platform (Android/iOS)
    if (Capacitor.isNativePlatform()) {
        // CRITICAL: Initialize GoogleAuth plugin before use
        await ensureGoogleAuthInitialized()

        console.log('[signInWithGoogle] Calling GoogleAuth.signIn()...')

        // Use native Google Auth plugin
        const googleUser = await GoogleAuth.signIn()

        console.log('[signInWithGoogle] GoogleAuth.signIn() successful, user:', googleUser.email)

        // Create Firebase credential from the ID token
        const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken)

        console.log('[signInWithGoogle] Signing in to Firebase...')

        // Sign in to Firebase with the credential
        const result = await signInWithCredential(auth, credential)

        console.log('[signInWithGoogle] Firebase sign-in successful')

        return result.user
    } else {
        // Web browser: use Firebase popup
        const result = await signInWithPopup(auth, googleProvider)
        return result.user
    }
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
