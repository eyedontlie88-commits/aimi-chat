'use client'

import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n'

interface BackButtonProps {
    fallbackUrl?: string
    label?: string
    className?: string
}

/**
 * Reusable Back Button component
 * Uses browser history if available, otherwise falls back to specified URL
 */
export default function BackButton({
    fallbackUrl = '/characters',
    label,
    className = ''
}: BackButtonProps) {
    const router = useRouter()
    const { t } = useLanguage()

    // Use provided label or translation
    const displayLabel = label || t.common.back

    const handleBack = () => {
        // Check if there's history to go back to
        if (typeof window !== 'undefined' && window.history.length > 1) {
            router.back()
        } else {
            // Fallback to specified URL
            router.push(fallbackUrl)
        }
    }

    return (
        <button
            onClick={handleBack}
            className={`flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors ${className}`}
            title={displayLabel}
        >
            <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                />
            </svg>
            <span className="text-sm hidden sm:inline">{displayLabel}</span>
        </button>
    )
}
