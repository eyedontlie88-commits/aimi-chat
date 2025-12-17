/**
 * Responsive utilities and breakpoint helpers
 * Target devices: Desktop, Tablet, Realme 10, iPhone 14
 */

// Breakpoint values (in px)
export const BREAKPOINTS = {
    mobile: 767,
    tablet: 1023,
    desktop: 1024,
} as const

// Device presets
export const DEVICES = {
    desktop: { name: 'Desktop', width: null, height: null },
    tablet: { name: 'Tablet', width: 768, height: 1024 },
    realme10: { name: 'Realme 10', width: 390, height: 844 },
    iphone14: { name: 'iPhone 14', width: 393, height: 852 },
    iphone14pro: { name: 'iPhone 14 Pro', width: 393, height: 852 },
} as const

export type DeviceKey = keyof typeof DEVICES
export type Breakpoint = 'mobile' | 'tablet' | 'desktop'

/**
 * Get current breakpoint from window width
 */
export function getBreakpoint(width: number): Breakpoint {
    if (width <= BREAKPOINTS.mobile) return 'mobile'
    if (width <= BREAKPOINTS.tablet) return 'tablet'
    return 'desktop'
}

/**
 * Check if mobile breakpoint
 */
export function isMobile(width: number): boolean {
    return width <= BREAKPOINTS.mobile
}

/**
 * Check if tablet breakpoint
 */
export function isTablet(width: number): boolean {
    return width > BREAKPOINTS.mobile && width <= BREAKPOINTS.tablet
}

/**
 * Check if desktop breakpoint
 */
export function isDesktop(width: number): boolean {
    return width >= BREAKPOINTS.desktop
}

/**
 * Get device info from viewport width
 */
export function getDeviceFromWidth(width: number): DeviceKey {
    if (width <= 390) return 'realme10'
    if (width <= 393) return 'iphone14'
    if (width <= BREAKPOINTS.mobile) return 'realme10' // Default mobile
    if (width <= BREAKPOINTS.tablet) return 'tablet'
    return 'desktop'
}

/**
 * CSS media query helpers
 */
export const mediaQueries = {
    mobile: `@media (max-width: ${BREAKPOINTS.mobile}px)`,
    tablet: `@media (min-width: ${BREAKPOINTS.mobile + 1}px) and (max-width: ${BREAKPOINTS.tablet}px)`,
    desktop: `@media (min-width: ${BREAKPOINTS.desktop}px)`,
    realme10: `@media (max-width: 390px)`,
    iphone14: `@media (max-width: 393px)`,
    touch: `@media (hover: none) and (pointer: coarse)`,
    hover: `@media (hover: hover) and (pointer: fine)`,
} as const

/**
 * Grid column counts per breakpoint
 */
export const GRID_COLUMNS: Record<Breakpoint, number> = {
    mobile: 2,
    tablet: 3,
    desktop: 4,
}

/**
 * Typography scale
 */
export const TYPOGRAPHY = {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
} as const

/**
 * Spacing scale (4px grid)
 */
export const SPACING = {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
} as const

/**
 * Get responsive value based on breakpoint
 */
export function responsive<T>(
    breakpoint: Breakpoint,
    values: { mobile: T; tablet?: T; desktop?: T }
): T {
    if (breakpoint === 'mobile') return values.mobile
    if (breakpoint === 'tablet') return values.tablet ?? values.mobile
    return values.desktop ?? values.tablet ?? values.mobile
}
