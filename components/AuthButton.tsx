'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import {
    onAuthChange,
    type User
} from '@/lib/firebase/client'
import { authFetch } from '@/lib/firebase/auth-fetch'
import { useLanguage } from '@/lib/i18n'

// Dynamic imports for modals to avoid SSR issues
const LoginModal = dynamic(() => import('./LoginModal'), { ssr: false })
const UserProfileModal = dynamic(() => import('./UserProfileModal'), { ssr: false })

/**
 * Authentication button component
 * - When NOT logged in: Shows "Đăng nhập" button -> opens LoginModal
 * - When logged in: Shows clickable avatar -> opens UserProfileModal
 */
export default function AuthButton() {
    const { t } = useLanguage()
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [showLoginModal, setShowLoginModal] = useState(false)
    const [showProfileModal, setShowProfileModal] = useState(false)
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

    // Loading state
    if (loading) {
        return (
            <div className="flex items-center text-sm text-gray-400">
                <span className="animate-pulse">•</span>
            </div>
        )
    }

    // LOGGED IN - Show clickable avatar
    if (user) {
        const displayName = user.displayName || user.email?.split('@')[0] || 'User'
        const initials = displayName.charAt(0).toUpperCase()
        const photoURL = user.photoURL

        return (
            <>
                <div className="flex items-center gap-1 md:gap-2 min-w-0">
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

                    {/* Clickable Avatar - opens UserProfileModal */}
                    <button
                        onClick={() => setShowProfileModal(true)}
                        className="relative group"
                        title={user.email || displayName}
                    >
                        {photoURL ? (
                            <img
                                src={photoURL}
                                alt={displayName}
                                className="w-9 h-9 rounded-full border-2 border-pink-500/50 shadow-lg shadow-pink-500/20 transition-all group-hover:border-pink-400 group-hover:scale-105"
                            />
                        ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-pink-500/25 border-2 border-pink-500/50 transition-all group-hover:border-pink-400 group-hover:scale-105">
                                {initials}
                            </div>
                        )}
                        {/* Online indicator dot */}
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-900"></span>
                    </button>
                </div>

                {/* User Profile Modal */}
                <UserProfileModal
                    isOpen={showProfileModal}
                    onClose={() => setShowProfileModal(false)}
                    user={user}
                />
            </>
        )
    }

    // NOT LOGGED IN - Show "Đăng nhập" button
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
