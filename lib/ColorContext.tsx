'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authFetch } from '@/lib/firebase/auth-fetch'

interface ColorContextType {
    textColor: string
    backgroundColor: string
    isLoading: boolean
    setColors: (text: string, bg: string) => void
    refetchColors: () => Promise<void>
}

const ColorContext = createContext<ColorContextType | null>(null)

// Default colors
const DEFAULT_TEXT_COLOR = '#F9D47E'
const DEFAULT_BG_COLOR = '#1A1A1A'

export function ColorProvider({ children }: { children: ReactNode }) {
    const [textColor, setTextColor] = useState(DEFAULT_TEXT_COLOR)
    const [backgroundColor, setBackgroundColor] = useState(DEFAULT_BG_COLOR)
    const [isLoading, setIsLoading] = useState(true)

    // Fetch user colors on mount
    useEffect(() => {
        fetchUserColors()
    }, [])

    const fetchUserColors = async () => {
        try {
            const response = await authFetch('/api/user-profile')
            if (response.ok) {
                const data = await response.json()
                const profile = data.profile
                if (profile?.textColor) setTextColor(profile.textColor)
                if (profile?.backgroundColor) setBackgroundColor(profile.backgroundColor)
            }
        } catch (error) {
            console.error('[ColorContext] Failed to fetch user colors:', error)
            // Keep defaults on error
        } finally {
            setIsLoading(false)
        }
    }

    const setColors = (text: string, bg: string) => {
        setTextColor(text)
        setBackgroundColor(bg)
    }

    const refetchColors = async () => {
        await fetchUserColors()
    }

    return (
        <ColorContext.Provider value={{
            textColor,
            backgroundColor,
            isLoading,
            setColors,
            refetchColors
        }}>
            {children}
        </ColorContext.Provider>
    )
}

export function useColors() {
    const context = useContext(ColorContext)
    if (!context) {
        // Return defaults if not in provider (for SSR safety)
        return {
            textColor: DEFAULT_TEXT_COLOR,
            backgroundColor: DEFAULT_BG_COLOR,
            isLoading: false,
            setColors: () => { },
            refetchColors: async () => { },
        }
    }
    return context
}
