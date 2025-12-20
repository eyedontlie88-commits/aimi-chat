'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
    signInWithGoogle,
    signInWithEmail,
    createAccount,
} from '@/lib/firebase/client'

interface LoginModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

/**
 * Translate Firebase auth error codes to user-friendly Vietnamese messages
 */
function getFriendlyErrorMessage(error: any): string {
    const errorCode = error?.code || ''
    const errorMessage = error?.message || ''

    // Extract error code from message if not in code field
    // Firebase sometimes returns: "Firebase: Error (auth/invalid-credential)."
    const codeMatch = errorMessage.match(/\(auth\/([^)]+)\)/)
    const code = errorCode || (codeMatch ? `auth/${codeMatch[1]}` : '')

    switch (code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
            return 'Email hoặc mật khẩu không chính xác.'
        case 'auth/email-already-in-use':
            return 'Email này đã được đăng ký rồi.'
        case 'auth/weak-password':
            return 'Mật khẩu quá yếu (cần ít nhất 6 ký tự).'
        case 'auth/invalid-email':
            return 'Định dạng email không hợp lệ.'
        case 'auth/too-many-requests':
            return 'Thử lại quá nhiều lần. Vui lòng đợi 5 phút.'
        case 'auth/network-request-failed':
            return 'Lỗi kết nối mạng. Vui lòng kiểm tra internet.'
        case 'auth/popup-closed-by-user':
            return 'Bạn đã đóng cửa sổ đăng nhập.'
        case 'auth/cancelled-popup-request':
            return 'Đăng nhập bị hủy.'
        default:
            return 'Đã có lỗi xảy ra. Vui lòng thử lại.'
    }
}

// Safety timeout duration - 15 seconds
const AUTH_TIMEOUT_MS = 15000

/**
 * Fixed overlay login modal using React Portal
 * Renders at document.body level to escape any parent overflow:hidden
 * z-[9999] ensures it's always on top
 */
export default function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isSignUp, setIsSignUp] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [mounted, setMounted] = useState(false)

    // Wait for client-side mount to use Portal
    useEffect(() => {
        setMounted(true)
    }, [])

    // SAFETY: Reset state when modal opens/closes
    // This ensures a fresh start every time user opens the modal
    useEffect(() => {
        if (isOpen) {
            setIsLoading(false)  // Reset stuck loading state
            setError('')         // Clear old errors
            // Don't reset email/password - user might want to retry
        }
    }, [isOpen])

    // Don't render until mounted (client-side) and modal is open
    if (!isOpen || !mounted) return null

    const handleGoogleSignIn = async () => {
        // Prevent double-click
        if (isLoading) return

        setIsLoading(true)
        setError('')

        // SAFETY: Auto-timeout after 15 seconds
        const safetyTimer = setTimeout(() => {
            setIsLoading(false)
            setError('Quá thời gian chờ. Vui lòng kiểm tra mạng và thử lại.')
        }, AUTH_TIMEOUT_MS)

        try {
            await signInWithGoogle()
            clearTimeout(safetyTimer)
            onSuccess?.()
            onClose()
        } catch (e: any) {
            clearTimeout(safetyTimer)
            console.error('[LoginModal] Google sign in error:', e)
            setError(getFriendlyErrorMessage(e))
            setIsLoading(false)
        }
    }

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault()

        // Prevent double-click
        if (isLoading) return

        setError('')
        setIsLoading(true)

        // SAFETY: Auto-timeout after 15 seconds
        const safetyTimer = setTimeout(() => {
            setIsLoading(false)
            setError('Quá thời gian chờ. Vui lòng kiểm tra mạng và thử lại.')
        }, AUTH_TIMEOUT_MS)

        try {
            if (isSignUp) {
                await createAccount(email, password)
            } else {
                await signInWithEmail(email, password)
            }
            clearTimeout(safetyTimer)
            onSuccess?.()
            onClose()
        } catch (e: any) {
            clearTimeout(safetyTimer)
            console.error('[LoginModal] Email auth error:', e)
            setError(getFriendlyErrorMessage(e))
            setIsLoading(false)
        }
    }

    // Clear error when switching between login/signup modes
    const toggleMode = () => {
        setError('')
        setIsSignUp(!isSignUp)
    }

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }

    // Modal content with z-[9999] for guaranteed top layer
    const modalContent = (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={handleBackdropClick}
        >
            {/* Modal container - centered absolutely */}
            <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl relative animate-in slide-in-from-bottom-4 zoom-in-95 duration-300">

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

                {/* Logo */}
                <div className="text-center mb-4">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
                        AImi Chat
                    </h1>
                </div>

                {/* Title */}
                <h2 className="text-lg text-white text-center mb-6">
                    {isSignUp ? 'Tạo tài khoản mới' : 'Chào mừng quay trở lại!'}
                </h2>

                {/* Error message */}
                {error && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm text-center">
                        {error}
                    </div>
                )}

                {/* Form with full width inputs */}
                <form onSubmit={handleEmailAuth} className="space-y-4">
                    {/* Email input */}
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email..."
                        className="w-full p-4 bg-gray-800 rounded-xl border border-gray-700 focus:border-pink-500 outline-none transition-all text-white placeholder-gray-400"
                        required
                        disabled={isLoading}
                    />

                    {/* Password input */}
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mật khẩu..."
                        className="w-full p-4 bg-gray-800 rounded-xl border border-gray-700 focus:border-pink-500 outline-none transition-all text-white placeholder-gray-400"
                        required
                        disabled={isLoading}
                    />

                    {/* Submit button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full p-4 bg-gradient-to-r from-pink-600 to-rose-600 rounded-xl font-bold text-white shadow-lg hover:shadow-pink-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isLoading ? (
                            <span className="animate-pulse">Đang xử lý...</span>
                        ) : isSignUp ? (
                            'ĐĂNG KÝ'
                        ) : (
                            'ĐĂNG NHẬP'
                        )}
                    </button>
                </form>

                {/* Toggle Sign In/Sign Up */}
                <button
                    type="button"
                    onClick={toggleMode}
                    disabled={isLoading}
                    className="w-full text-sm text-gray-400 hover:text-pink-400 transition-colors mt-4"
                >
                    {isSignUp ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-white/20"></div>
                    <span className="text-gray-400 text-sm font-medium">HOẶC</span>
                    <div className="flex-1 h-px bg-white/20"></div>
                </div>

                {/* Google Sign In */}
                <button
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full py-4 bg-white hover:bg-gray-100 text-gray-800 font-medium rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                    </svg>
                    Tiếp tục với Google
                </button>
            </div>
        </div>
    )

    // Use createPortal to render modal at document.body level
    // This escapes any parent overflow:hidden constraints
    return createPortal(modalContent, document.body)
}
