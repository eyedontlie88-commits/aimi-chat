'use client'

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/firebase/auth-fetch'

export default function FontProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        loadFontPreferences()
    }, [])

    const loadFontPreferences = async () => {
        try {
            const res = await authFetch('/api/user-profile')
            const data = await res.json()
            const font = data.profile?.chatFont || 'inter'
            const size = data.profile?.chatFontSize || 14

            // Apply to HTML element
            document.documentElement.setAttribute('data-font', font)
            document.documentElement.setAttribute('data-font-size', String(size))
        } catch (error) {
            console.error('Failed to load font preferences:', error)
            // Apply defaults on error
            document.documentElement.setAttribute('data-font', 'inter')
            document.documentElement.setAttribute('data-font-size', '14')
        }
    }

    return <>{children}</>
}
