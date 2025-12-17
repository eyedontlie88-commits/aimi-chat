'use client'

import { useRouter } from 'next/navigation'
import { signInWithGoogle } from '@/lib/firebase/client'
import { useState } from 'react'
import { useLanguage, interpolate } from '@/lib/i18n'

interface GuestLoginPromptProps {
    characterName: string
    onClose?: () => void
}

/**
 * Login prompt shown to guest users when they try to chat
 * Provides inline sign-in via Google popup
 */
export default function GuestLoginPrompt({ characterName, onClose }: GuestLoginPromptProps) {
    const router = useRouter()
    const { t } = useLanguage()
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')

    console.log('[GuestLoginPrompt] Rendering for:', characterName)

    const handleGoogleSignIn = async () => {
        try {
            setIsLoading(true)
            setError('')
            await signInWithGoogle()
            // Auth state change will trigger page refresh
        } catch (e: any) {
            console.error('[GuestLoginPrompt] Sign in error:', e)
            setError(e.message || t.auth.signInFailed)
            setIsLoading(false)
        }
    }

    const handleBrowse = () => {
        router.push('/characters')
    }

    return (
        <div className="bg-slate-800/95 border border-white/20 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in duration-200">
            {/* Icon */}
            <div className="text-center">
                <span className="text-5xl">🔐</span>
            </div>

            {/* Title */}
            <h2 className="text-xl font-semibold text-white text-center">
                {t.guest.title}
            </h2>

            {/* Message */}
            <p className="text-gray-400 text-center text-sm leading-relaxed">
                {interpolate(t.guest.message, { character: characterName })}
            </p>

            {/* Benefits */}
            <div className="bg-white/5 rounded-xl p-4 space-y-2">
                <p className="text-gray-300 text-sm font-medium">✨ {t.guest.benefits}</p>
                <ul className="text-gray-400 text-sm space-y-1 ml-4">
                    <li>• {t.guest.benefit1}</li>
                    <li>• {t.guest.benefit2}</li>
                    <li>• {t.guest.benefit3}</li>
                    <li>• {t.guest.benefit4}</li>
                </ul>
            </div>

            {/* Error */}
            {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            {/* Buttons */}
            <div className="flex flex-col gap-3">
                <button
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-white hover:bg-gray-100 text-gray-800 font-medium rounded-xl transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
                >
                    {isLoading ? (
                        <span className="animate-pulse">{t.common.loading}</span>
                    ) : (
                        <>
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
                            {t.guest.signInGoogle}
                        </>
                    )}
                </button>
                <button
                    onClick={handleBrowse}
                    className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-gray-300 font-medium rounded-xl transition-colors"
                >
                    {t.guest.browseCharacters}
                </button>
            </div>
        </div>
    )
}
