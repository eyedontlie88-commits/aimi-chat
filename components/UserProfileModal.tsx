'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { signOut, type User } from '@/lib/firebase/client'

interface UserProfileModalProps {
    isOpen: boolean
    onClose: () => void
    user: User
}

/**
 * User Profile Modal using React Portal
 * Glassmorphism design with avatar, user info, and logout button
 * z-[9999] ensures it's always on top
 */
export default function UserProfileModal({ isOpen, onClose, user }: UserProfileModalProps) {
    const [mounted, setMounted] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!isOpen || !mounted) return null

    const handleSignOut = async () => {
        try {
            setIsLoading(true)
            await signOut()
            onClose()
        } catch (e) {
            console.error('[UserProfileModal] Sign out error:', e)
            setIsLoading(false)
        }
    }

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }

    // Get user display info
    const displayName = user.displayName || user.email?.split('@')[0] || 'Người dùng'
    const email = user.email || ''
    const photoURL = user.photoURL
    const initials = displayName.charAt(0).toUpperCase()

    const modalContent = (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={handleBackdropClick}
        >
            {/* Modal container */}
            <div className="w-full max-w-sm bg-slate-900/95 border border-white/10 rounded-2xl p-6 shadow-2xl relative animate-in slide-in-from-bottom-4 zoom-in-95 duration-300">

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
                    aria-label="Đóng"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Avatar - Large, centered */}
                <div className="flex flex-col items-center mb-6">
                    {photoURL ? (
                        <img
                            src={photoURL}
                            alt={displayName}
                            className="w-24 h-24 rounded-full border-4 border-pink-500/30 shadow-lg shadow-pink-500/20"
                        />
                    ) : (
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center text-4xl font-bold text-white shadow-lg shadow-pink-500/20 border-4 border-pink-500/30">
                            {initials}
                        </div>
                    )}

                    {/* Display Name */}
                    <h2 className="mt-4 text-xl font-bold text-white">
                        {displayName}
                    </h2>

                    {/* Email */}
                    <p className="text-sm text-gray-400 mt-1">
                        {email}
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                    {/* Settings button (optional) */}
                    <button
                        className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium transition-all flex items-center justify-center gap-2"
                        onClick={onClose}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Cài đặt tài khoản
                    </button>

                    {/* Sign Out button - Red/Pink prominent */}
                    <button
                        onClick={handleSignOut}
                        disabled={isLoading}
                        className="w-full py-3 px-4 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 rounded-xl text-white font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <span className="animate-pulse">Đang đăng xuất...</span>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                ĐĂNG XUẤT
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )

    return createPortal(modalContent, document.body)
}
