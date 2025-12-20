'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import {
    onAuthChange,
    signOut,
    type User
} from '@/lib/firebase/client'
import { authFetch } from '@/lib/firebase/auth-fetch'
import { useLanguage } from '@/lib/i18n'

// Dynamic import LoginModal to avoid SSR issues
const LoginModal = dynamic(() => import('./LoginModal'), { ssr: false })

/**
 * Authentication button component - CLEANED UP VERSION
 * - When NOT logged in: Shows only "Đăng nhập" button -> opens LoginModal
 * - When logged in: Shows user avatar/email and sign out option
 * - NO inline inputs in header anymore!
 */
export default function AuthButton() {
    const { t } = useLanguage()
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [showLoginModal, setShowLoginModal] = useState(false)
    const [role, setRole] = useState<'user' | 'dev'>('user')
    const [migrationStatus, setMigrationStatus] = useState<'idle' | 'migrating' | 'done' | 'error'>('idle')

    // Migrate guest data to user account (one-time per user)
    const migrateGuestData = useCallback(async (uid: string) => {
        const migrationKey = `guestMigrated:${uid}`

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
                window.location.reload()
            } else {
                console.log(`[Auth] No migration needed:`, data.reason)
            }

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

            if (user) {
                const token = await user.getIdTokenResult()
                const userRole = token.claims.role === 'dev' ? 'dev' : 'user'
                setRole(userRole)
                migrateGuestData(user.uid)
            }
        })
        return unsubscribe
    }, [migrateGuestData])

    const handleSignOut = async () => {
        try {
            await signOut()
        } catch (e) {
            console.error('Sign out error:', e)
        }
    }

    // Loading state
    if (loading) {
        return (
            <div className="flex items-center text-sm text-gray-400">
                <span className="animate-pulse">•</span>
            </div>
        )
    }

    // LOGGED IN - Show user info
    if (user) {
        const initials = user.email ? user.email.charAt(0).toUpperCase() : '?'

        return (
            <div className="flex items-center gap-1 md:gap-3 min-w-0">
                {role === 'dev' && (
                    <span className="px-1.5 py-0.5 text-[10px] md:text-xs font-bold bg-purple-600 text-white rounded shrink-0">
                        DEV
                    </span>
                )}

                {migrationStatus === 'migrating' && (
                    <span className="text-xs text-yellow-400 animate-pulse hidden md:inline">
                        {t.auth?.migratingData || 'Đang di chuyển...'}
                    </span>
                )}

                {/* Mobile: Avatar with initials */}
                <div className="md:hidden">
                    <div
                        className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 flex items-center justify-center text-sm font-bold text-white shadow-lg"
                        title={user.email || 'User'}
                    >
                        {initials}
                    </div>
                </div>

                {/* Desktop: Email and sign out */}
                <div className="hidden md:flex items-center gap-2 min-w-0">
                    <span className="text-sm text-gray-300 truncate max-w-[150px]">
                        {user.email}
                    </span>
                    <button
                        onClick={handleSignOut}
                        className="text-sm text-gray-400 hover:text-white transition-colors shrink-0"
                    >
                        {t.auth?.signOut || 'Đăng xuất'}
                    </button>
                </div>
            </div>
        )
    }

    // NOT LOGGED IN - Show only "Đăng nhập" button (NO inline inputs!)
    return (
        <>
            <button
                onClick={() => setShowLoginModal(true)}
                className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-full hover:from-pink-600 hover:to-rose-700 transition-all shadow-lg shadow-pink-500/25"
            >
                Đăng nhập
            </button>

            {/* Login Modal */}
            <LoginModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
            />
        </>
    )
}
