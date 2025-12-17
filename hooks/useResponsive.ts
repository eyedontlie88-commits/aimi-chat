'use client'

import { useState, useEffect, useCallback } from 'react'
import { getBreakpoint, getDeviceFromWidth, BREAKPOINTS, type Breakpoint, type DeviceKey } from '@/lib/responsive'

interface ResponsiveState {
    width: number
    height: number
    breakpoint: Breakpoint
    device: DeviceKey
    isMobile: boolean
    isTablet: boolean
    isDesktop: boolean
    isTouch: boolean
}

/**
 * Hook for responsive breakpoint detection
 * Updates on window resize with debounce
 */
export function useResponsive(): ResponsiveState {
    const [state, setState] = useState<ResponsiveState>(() => ({
        width: typeof window !== 'undefined' ? window.innerWidth : 1024,
        height: typeof window !== 'undefined' ? window.innerHeight : 768,
        breakpoint: 'desktop',
        device: 'desktop',
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isTouch: false,
    }))

    useEffect(() => {
        let timeoutId: NodeJS.Timeout

        const updateState = () => {
            const width = window.innerWidth
            const height = window.innerHeight
            const breakpoint = getBreakpoint(width)
            const device = getDeviceFromWidth(width)
            const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0

            setState({
                width,
                height,
                breakpoint,
                device,
                isMobile: breakpoint === 'mobile',
                isTablet: breakpoint === 'tablet',
                isDesktop: breakpoint === 'desktop',
                isTouch,
            })
        }

        const handleResize = () => {
            clearTimeout(timeoutId)
            timeoutId = setTimeout(updateState, 100)
        }

        // Initial update
        updateState()

        window.addEventListener('resize', handleResize)
        return () => {
            window.removeEventListener('resize', handleResize)
            clearTimeout(timeoutId)
        }
    }, [])

    return state
}

/**
 * Hook for media query matching
 */
export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(false)

    useEffect(() => {
        const media = window.matchMedia(query)

        const updateMatch = () => setMatches(media.matches)
        updateMatch()

        media.addEventListener('change', updateMatch)
        return () => media.removeEventListener('change', updateMatch)
    }, [query])

    return matches
}

/**
 * Hook for mobile detection
 */
export function useIsMobile(): boolean {
    return useMediaQuery(`(max-width: ${BREAKPOINTS.mobile}px)`)
}

/**
 * Hook for touch device detection
 */
export function useIsTouch(): boolean {
    const [isTouch, setIsTouch] = useState(false)

    useEffect(() => {
        setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0)
    }, [])

    return isTouch
}

/**
 * Hook for responsive value selection
 */
export function useResponsiveValue<T>(values: { mobile: T; tablet?: T; desktop?: T }): T {
    const { breakpoint } = useResponsive()

    if (breakpoint === 'mobile') return values.mobile
    if (breakpoint === 'tablet') return values.tablet ?? values.mobile
    return values.desktop ?? values.tablet ?? values.mobile
}
