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
 */
export async function getIdToken(): Promise<string | null> {
    const auth = getFirebaseAuth()
    const user = auth.currentUser
    if (!user) return null
    return user.getIdToken()
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
