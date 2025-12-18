'use client'

import { ReactNode } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import FontProvider from './FontProvider'

// Dynamic imports for client-side components
const AuthButton = dynamic(() => import('@/components/AuthButton'), {
    ssr: false,
    loading: () => <span className="text-sm text-gray-400">•</span>
})

const DeviceSimulator = dynamic(() => import('@/components/responsive/DeviceSimulator'), {
    ssr: false,
})

const ThemeProvider = dynamic(() => import('@/components/ThemeProvider'), {
    ssr: false,
})

const LanguageProvider = dynamic(
    () => import('@/lib/i18n/LanguageContext').then((mod) => ({ default: mod.LanguageProvider })),
    { ssr: false }
)

const NavLinks = dynamic(() => import('@/components/NavLinks'), {
    ssr: false,
    loading: () => <span className="text-sm text-gray-400">...</span>
})

interface ClientLayoutWrapperProps {
    children: ReactNode
}

export default function ClientLayoutWrapper({ children }: ClientLayoutWrapperProps) {
    return (
        <LanguageProvider>
            <FontProvider>
                <div id="viewport-wrapper" className="relative h-full overflow-hidden gradient-bg">
                    <div id="app-root" className="relative h-full overflow-y-auto">
                        {/* Navigation */}
                        <nav className="glass border-b border-white/10 sticky top-0 z-50 backdrop-blur-xl overflow-hidden">
                            <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
                                <div className="flex items-center justify-between h-14 sm:h-16 min-w-0">
                                    <Link href="/characters" className="flex items-center space-x-1 sm:space-x-2 shrink-0">
                                        <span className="text-xl sm:text-2xl">💕</span>
                                        <span className="text-base sm:text-xl font-bold gradient-text">AImi chat</span>
                                    </Link>

                                    <div className="flex items-center space-x-2 sm:space-x-6 min-w-0">
                                        <NavLinks />
                                        <AuthButton />
                                    </div>
                                </div>
                            </div>
                        </nav>

                        {/* Main content */}
                        <main>{children}</main>

                        {/* Footer */}
                        <footer className="border-t border-white/10 mt-20">
                            <div className="max-w-7xl mx-auto px-4 py-8 text-center text-sm text-gray-400">
                                <p>Made with 💕 for personal use</p>
                            </div>
                        </footer>
                    </div>
                </div>

                {/* Device Simulator (dev only) */}
                <DeviceSimulator showDebug />

                {/* Global theme provider */}
                <ThemeProvider />
            </FontProvider>
        </LanguageProvider>
    )
}
