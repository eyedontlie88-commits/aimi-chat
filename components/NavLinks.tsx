'use client'

import Link from 'next/link'
import { useLanguage } from '@/lib/i18n'

/**
 * Client-side navigation links with i18n support
 * Used in layout.tsx navbar
 */
export default function NavLinks() {
    const { t } = useLanguage()

    return (
        <>
            <Link
                href="/characters"
                className="text-xs sm:text-sm font-medium hover:text-primary-400 transition-colors hidden sm:block"
            >
                {t.characters.title}
            </Link>
            <Link
                href="/settings"
                className="text-xs sm:text-sm font-medium hover:text-primary-400 transition-colors"
            >
                {t.settings.title}
            </Link>
        </>
    )
}
