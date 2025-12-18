'use client'

import { useColors } from '@/lib/ColorContext'
import { useEffect } from 'react'

/**
 * ColorApplier - Applies global text and background colors
 * Text color: Applied to body (global)
 * Background color: Applied to #viewport-wrapper (app container)
 */
export function ColorApplier() {
    const { textColor, backgroundColor, isLoading } = useColors()

    useEffect(() => {
        if (isLoading) return // Wait for colors to load

        const root = document.documentElement
        const body = document.body

        // Set CSS custom properties on documentElement
        root.style.setProperty('--user-text-color', textColor)
        root.style.setProperty('--user-bg-color', backgroundColor)

        // Apply TEXT color globally (body)
        body.style.setProperty('color', textColor, 'important')

        // Apply BACKGROUND color to app container (not viewport)
        const appContainer = document.getElementById('viewport-wrapper')
        if (appContainer) {
            // Remove gradient-bg class to allow custom background
            appContainer.classList.remove('gradient-bg')
            // Apply custom background
            appContainer.style.setProperty('background-color', backgroundColor, 'important')
            appContainer.style.setProperty('background', backgroundColor, 'important')
        }

        // Also apply to #app-root as backup
        const appRoot = document.getElementById('app-root')
        if (appRoot) {
            appRoot.style.setProperty('background-color', backgroundColor, 'important')
        }

        console.log('[ColorApplier] Applied colors:', {
            container: appContainer ? '#viewport-wrapper' : 'body',
            textColor,
            backgroundColor
        })
    }, [textColor, backgroundColor, isLoading])

    return null
}
