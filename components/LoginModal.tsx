'use client'

import { useState } from 'react'
import {
    signInWithGoogle,
    signInWithEmail,
    createAccount,
} from '@/lib/firebase/client'
import { useLanguage } from '@/lib/i18n'

interface LoginModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

/**
 * Fullscreen login modal for mobile-first experience
 * Centered form with touch-friendly inputs
 */
export default function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
    const { t } = useLanguage()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isSignUp, setIsSignUp] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    if (!isOpen) return null

    const handleGoogleSignIn = async () => {
        try {
            setIsLoading(true)
            setError('')
            await signInWithGoogle()
            onSuccess?.()
            onClose()
        } catch (e: any) {
            console.error('[LoginModal] Google sign in error:', e)
            setError(e.message || 'Đăng nhập thất bại')
            setIsLoading(false)
        }
    }

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        try {
            if (isSignUp) {
                await createAccount(email, password)
            } else {
                await signInWithEmail(email, password)
            }
            onSuccess?.()
            onClose()
        } catch (e: any) {
            console.error('[LoginModal] Email auth error:', e)
            setError(e.message || 'Xác thực thất bại')
            setIsLoading(false)
        }
    }

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={handleBackdropClick}
        >
            <div className="relative w-full max-w-md mx-4 bg-gradient-to-b from-slate-800/95 to-slate-900/95 border border-white/10 rounded-3xl shadow-2xl p-6 sm:p-8 animate-in slide-in-from-bottom-4 duration-300">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Logo */}
                <div className="text-center mb-6">
                    <span className="text-4xl">💕</span>
                    <h1 className="text-2xl font-bold gradient-text mt-2">AImi chat</h1>
                </div>

                {/* Title */}
                <h2 className="text-xl font-semibold text-white text-center mb-6">
                    {isSignUp ? 'Tạo tài khoản mới' : 'Chào mừng trở lại'}
                </h2>

                {/* Error message */}
                {error && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300 text-sm text-center">
                        {error}
                    </div>
                )}

                {/* Email form */}
                <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email của bạn"
                        className="w-full p-4 rounded-xl bg-gray-800/80 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20 transition-all"
                        required
                        disabled={isLoading}
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mật khẩu"
                        className="w-full p-4 rounded-xl bg-gray-800/80 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-pink-500/50 focus:ring-2 focus:ring-pink-500/20 transition-all"
                        required
                        disabled={isLoading}
                    />

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-pink-500/25"
                    >
                        {isLoading ? (
                            <span className="animate-pulse">Đang xử lý...</span>
                        ) : isSignUp ? (
                            'Đăng ký tài khoản'
                        ) : (
                            'Đăng nhập'
                        )}
                    </button>
                </form>

                {/* Toggle Sign In/Sign Up */}
                <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    disabled={isLoading}
                    className="w-full py-3 border border-pink-500/50 text-pink-300 font-medium rounded-xl hover:bg-pink-500/10 transition-all disabled:opacity-50"
                >
                    {isSignUp ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-4 my-6">
                    <div className="flex-1 h-px bg-white/10"></div>
                    <span className="text-gray-400 text-sm">Hoặc</span>
                    <div className="flex-1 h-px bg-white/10"></div>
                </div>

                {/* Google Sign In */}
                <button
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full py-4 bg-white hover:bg-gray-100 text-gray-800 font-medium rounded-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
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
}
