'use client'

import Link from 'next/link'
import { User, Settings } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'

/**
 * Client-side navigation links with i18n support
 * Mobile: icons only (lucide-react)
 * Desktop: text labels
 */
export default function NavLinks() {
    const { t } = useLanguage()

    return (
        <div className="flex items-center gap-1 md:gap-4">
            <Link
                href="/characters"
                className="flex items-center justify-center w-9 h-9 md:w-auto md:h-auto rounded-lg hover:bg-white/10 md:hover:bg-transparent transition-colors"
                title={t.characters.title}
            >
                {/* Icon on mobile, text on desktop */}
                <User className="w-5 h-5 md:hidden" />
                <span className="hidden md:inline text-sm font-medium hover:text-primary-400">{t.characters.title}</span>
            </Link>
            <Link
                href="/settings"
                className="flex items-center justify-center w-9 h-9 md:w-auto md:h-auto rounded-lg hover:bg-white/10 md:hover:bg-transparent transition-colors"
                title={t.settings.title}
            >
                {/* Icon on mobile, text on desktop */}
                <Settings className="w-5 h-5 md:hidden" />
                <span className="hidden md:inline text-sm font-medium hover:text-primary-400">{t.settings.title}</span>
            </Link>
        </div>
    )
}

