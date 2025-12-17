'use client'

import { useEffect, useState, useCallback } from 'react'
import { getThemeById, ChatThemeId, DEFAULT_THEME_ID } from '@/lib/ui/chatThemes'

/**
 * Global theme keys in localStorage
 */
export const THEME_STORAGE_KEY = 'almi:theme'
export const TEXT_MODE_STORAGE_KEY = 'almi:textMode'

/**
 * Apply theme to document root and #app-root
 */
export function applyGlobalTheme(themeId: ChatThemeId | string | null) {
    if (typeof document === 'undefined') return

    const theme = getThemeById(themeId)
    const appRoot = document.getElementById('app-root')
    const html = document.documentElement

    if (appRoot) {
        // Remove all theme bg classes first
        const bgClasses = appRoot.className.split(' ').filter(c =>
            c.startsWith('bg-') || c === 'gradient-bg'
        )
        bgClasses.forEach(c => appRoot.classList.remove(c))

        // Apply new theme page background
        const newBgClasses = theme.layout.pageBg.split(' ')
        newBgClasses.forEach(c => appRoot.classList.add(c))
    }

    // Set data attributes for CSS hooks
    html.dataset.theme = theme.id
    html.dataset.themeDark = theme.isDark ? 'true' : 'false'
}

/**
 * Apply text mode to document root
 */
export function applyGlobalTextMode(textMode: string | null) {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.textMode = textMode || 'auto'
}

/**
 * Save theme to localStorage and apply globally
 */
export function setGlobalTheme(themeId: ChatThemeId | string) {
    localStorage.setItem(THEME_STORAGE_KEY, themeId)
    applyGlobalTheme(themeId)

    // Dispatch custom event for other components to react
    window.dispatchEvent(new CustomEvent('almi:theme-change', { detail: { themeId } }))
}

/**
 * Save text mode to localStorage and apply globally
 */
export function setGlobalTextMode(textMode: string) {
    localStorage.setItem(TEXT_MODE_STORAGE_KEY, textMode)
    applyGlobalTextMode(textMode)

    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('almi:textmode-change', { detail: { textMode } }))
}

/**
 * Get current global theme from localStorage
 */
export function getGlobalTheme(): ChatThemeId {
    if (typeof localStorage === 'undefined') return DEFAULT_THEME_ID
    return (localStorage.getItem(THEME_STORAGE_KEY) as ChatThemeId) || DEFAULT_THEME_ID
}

/**
 * Get current global text mode from localStorage
 */
export function getGlobalTextMode(): string {
    if (typeof localStorage === 'undefined') return 'auto'
    return localStorage.getItem(TEXT_MODE_STORAGE_KEY) || 'auto'
}

/**
 * ThemeProvider component - mounts in layout to apply global theme
 * Reads from localStorage on mount, syncs with profile if profile has newer data
 */
export default function ThemeProvider() {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)

        // Apply theme from localStorage on mount
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
        const savedTextMode = localStorage.getItem(TEXT_MODE_STORAGE_KEY)

        applyGlobalTheme(savedTheme)
        applyGlobalTextMode(savedTextMode)
    }, [])

    // Don't render anything - just side effects
    return null
}
