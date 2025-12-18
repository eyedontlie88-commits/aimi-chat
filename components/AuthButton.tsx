'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    onAuthChange,
    signInWithGoogle,
    signInWithEmail,
    createAccount,
    signOut,
    getIdToken,
    type User
} from '@/lib/firebase/client'
import { authFetch } from '@/lib/firebase/auth-fetch'
import { useLanguage } from '@/lib/i18n'

/**
 * Authentication button component
 * Shows sign-in options when not authenticated
 * Shows user info and sign-out when authenticated
 * Auto-migrates guest data on first login
 */
export default function AuthButton() {
    const { t } = useLanguage()
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [showEmailForm, setShowEmailForm] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isSignUp, setIsSignUp] = useState(false)
    const [error, setError] = useState('')
    const [role, setRole] = useState<'user' | 'dev'>('user')
    const [migrationStatus, setMigrationStatus] = useState<'idle' | 'migrating' | 'done' | 'error'>('idle')

    // Migrate guest data to user account (one-time per user)
    const migrateGuestData = useCallback(async (uid: string) => {
        const migrationKey = `guestMigrated:${uid}`

        // Check if already migrated
        if (localStorage.getItem(migrationKey)) {
            return
        }

        try {
            setMigrationStatus('migrating')

            const response = await authFetch('/api/migrate/guest-to-user', {
                method: 'POST',
            })

            const data = await response.json()

            if (data.imported) {
                console.log(`[Auth] Migrated guest data:`, data.counts)
                // Force page refresh to show new data
                window.location.reload()
            } else {
                console.log(`[Auth] No migration needed:`, data.reason)
            }

            // Mark as migrated (even if no data, to avoid repeated attempts)
            localStorage.setItem(migrationKey, '1')
            setMigrationStatus('done')

        } catch (e) {
            console.error('[Auth] Migration failed:', e)
            setMigrationStatus('error')
        }
    }, [])

    useEffect(() => {
        const unsubscribe = onAuthChange(async (user) => {
            setUser(user)
            setLoading(false)

            // Get role from token claims and trigger migration
            if (user) {
                const token = await user.getIdTokenResult()
                const userRole = token.claims.role === 'dev' ? 'dev' : 'user'
                setRole(userRole)

                // Auto-migrate guest data on login
                migrateGuestData(user.uid)
            }
        })
        return unsubscribe
    }, [migrateGuestData])

    const handleGoogleSignIn = async () => {
        try {
            setError('')
            await signInWithGoogle()
        } catch (e: any) {
            setError(e.message || 'Sign in failed')
        }
    }

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        try {
            if (isSignUp) {
                await createAccount(email, password)
            } else {
                await signInWithEmail(email, password)
            }
            setShowEmailForm(false)
            setEmail('')
            setPassword('')
        } catch (e: any) {
            setError(e.message || 'Authentication failed')
        }
    }

    const handleSignOut = async () => {
        try {
            await signOut()
        } catch (e) {
            console.error('Sign out error:', e)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="animate-pulse">•</span>
            </div>
        )
    }

    if (user) {
        // Get initials from email for avatar
        const initials = user.email ? user.email.charAt(0).toUpperCase() : '?'

        return (
            <div className="flex items-center gap-1 md:gap-3 min-w-0">
                {role === 'dev' && (
                    <span className="px-1 py-0.5 text-[9px] md:text-xs font-bold bg-purple-600 text-white rounded shrink-0">
                        DEV
                    </span>
                )}
                {migrationStatus === 'migrating' && (
                    <span className="text-xs text-yellow-400 animate-pulse hidden md:inline">
                        {t.auth.migratingData}
                    </span>
                )}

                {/* Mobile: Avatar circle with initials */}
                <div className="md:hidden flex items-center gap-1">
                    <div
                        className="w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center text-xs font-bold text-white"
                        title={user.email || 'User'}
                    >
                        {initials}
                    </div>
                </div>

                {/* Desktop: Full email and sign out */}
                <div className="hidden md:flex items-center gap-2 min-w-0">
                    <span className="text-sm text-gray-300 truncate max-w-[150px]">
                        {user.email}
                    </span>
                    <button
                        onClick={handleSignOut}
                        className="text-sm text-gray-400 hover:text-white transition-colors shrink-0"
                    >
                        {t.auth.signOut}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex items-center gap-2">
            {!showEmailForm ? (
                <>
                    <button
                        onClick={handleGoogleSignIn}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white text-gray-800 rounded hover:bg-gray-100 transition-colors"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path
                                fill="currentColor"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="currentColor"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        Google
                    </button>
                    <button
                        onClick={() => setShowEmailForm(true)}
                        className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                        Email
                    </button>
                </>
            ) : (
                <form onSubmit={handleEmailAuth} className="flex items-center gap-2">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        className="px-2 py-1 text-sm bg-gray-800 border border-gray-600 rounded text-white w-32"
                        required
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="px-2 py-1 text-sm bg-gray-800 border border-gray-600 rounded text-white w-24"
                        required
                    />
                    <button
                        type="submit"
                        className="px-2 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-500"
                    >
                        {isSignUp ? 'Sign Up' : 'Sign In'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-xs text-gray-400 hover:text-white"
                    >
                        {isSignUp ? 'Sign In?' : 'Sign Up?'}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setShowEmailForm(false)
                            setError('')
                        }}
                        className="text-xs text-gray-500 hover:text-white"
                    >
                        ×
                    </button>
                </form>
            )}
            {error && (
                <span className="text-xs text-red-400">{error}</span>
            )}
        </div>
    )
}
