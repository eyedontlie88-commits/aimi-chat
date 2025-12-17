'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * ViewportSimulator - Toggle between mobile and desktop viewport
 * For testing Realme 10 (390×844) responsiveness on desktop
 * 
 * Features:
 * - Draggable pill (persisted position)
 * - Collapsible in mobile mode
 * - Only shows in development mode
 */

const VIEWPORT_PRESETS = {
    desktop: { name: 'Desktop', width: null, height: null },
    realme10: { name: 'Realme 10', width: 390, height: 844 },
} as const

type ViewportMode = keyof typeof VIEWPORT_PRESETS

const STORAGE_KEY = 'viewport-simulator-mode'
const POSITION_KEY = 'viewportSim:pillPos'
const SAFE_PADDING = 40

// Default position: bottom-center
const DEFAULT_POS = { x: -1, y: -1 } // -1 means "use default centering"

export default function ViewportSimulator() {
    const [mode, setMode] = useState<ViewportMode>('desktop')
    const [isOpen, setIsOpen] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false) // collapsed by default in mobile
    const [mounted, setMounted] = useState(false)
    const [effectiveHeight, setEffectiveHeight] = useState(844)

    // Drag state
    const [position, setPosition] = useState(DEFAULT_POS)
    const [isDragging, setIsDragging] = useState(false)
    const dragOffset = useRef({ x: 0, y: 0 })
    const pillRef = useRef<HTMLDivElement>(null)
    const dragStartPos = useRef({ x: 0, y: 0 })
    const hasMoved = useRef(false)

    // Calculate effective height based on window size
    const calculateEffectiveHeight = useCallback(() => {
        const preset = VIEWPORT_PRESETS[mode]
        if (preset.height) {
            const maxAvailable = window.innerHeight - SAFE_PADDING
            return Math.min(preset.height, maxAvailable)
        }
        return 0
    }, [mode])

    // Load saved state on mount
    useEffect(() => {
        setMounted(true)
        const savedMode = localStorage.getItem(STORAGE_KEY) as ViewportMode | null
        if (savedMode && VIEWPORT_PRESETS[savedMode]) {
            setMode(savedMode)
        }

        // Load saved position
        try {
            const savedPos = localStorage.getItem(POSITION_KEY)
            if (savedPos) {
                const parsed = JSON.parse(savedPos)
                if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
                    setPosition(parsed)
                }
            }
        } catch { }
    }, [])

    // Handle window resize
    useEffect(() => {
        if (!mounted) return

        const handleResize = () => {
            setEffectiveHeight(calculateEffectiveHeight())
            // Constrain position on resize
            if (position.x !== -1 && pillRef.current) {
                const rect = pillRef.current.getBoundingClientRect()
                const maxX = window.innerWidth - rect.width - 8
                const maxY = window.innerHeight - rect.height - 8
                setPosition(prev => ({
                    x: Math.max(8, Math.min(prev.x, maxX)),
                    y: Math.max(8, Math.min(prev.y, maxY))
                }))
            }
        }

        handleResize()
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [mounted, mode, calculateEffectiveHeight, position.x])

    // Apply viewport simulation
    useEffect(() => {
        if (!mounted) return

        const preset = VIEWPORT_PRESETS[mode]
        const wrapper = document.getElementById('viewport-wrapper')
        const body = document.body
        const html = document.documentElement

        if (!wrapper) return

        if (preset.width && preset.height) {
            const height = effectiveHeight || calculateEffectiveHeight()

            html.style.cssText = `
                height: 100%;
                overflow: hidden;
            `

            body.style.cssText = `
                margin: 0;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #0a0a0a;
                overflow: hidden;
            `

            wrapper.style.cssText = `
                width: ${preset.width}px;
                max-width: ${preset.width}px;
                height: ${height}px;
                max-height: ${height}px;
                flex-shrink: 0;
                border-radius: 24px;
                box-shadow: 0 0 0 1px rgba(255,255,255,0.1), 0 25px 50px -12px rgba(0,0,0,0.5);
                overflow: hidden;
                overflow-y: auto;
                background: #1a1a1a;
            `
        } else {
            html.style.cssText = ''
            body.style.cssText = ''
            wrapper.style.cssText = ''
        }

        return () => {
            html.style.cssText = ''
            body.style.cssText = ''
            if (wrapper) wrapper.style.cssText = ''
        }
    }, [mode, mounted, effectiveHeight, calculateEffectiveHeight])

    // --- Drag handlers ---
    const handlePointerDown = (e: React.PointerEvent) => {
        if (!pillRef.current) return

        setIsDragging(true)
        hasMoved.current = false
        dragStartPos.current = { x: e.clientX, y: e.clientY }

        const rect = pillRef.current.getBoundingClientRect()
        dragOffset.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        }

        pillRef.current.setPointerCapture(e.pointerId)
        e.preventDefault()
    }

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging || !pillRef.current) return

        // Check if actually moved (for click vs drag detection)
        const dx = Math.abs(e.clientX - dragStartPos.current.x)
        const dy = Math.abs(e.clientY - dragStartPos.current.y)
        if (dx > 3 || dy > 3) {
            hasMoved.current = true
        }

        const rect = pillRef.current.getBoundingClientRect()
        const maxX = window.innerWidth - rect.width - 8
        const maxY = window.innerHeight - rect.height - 8

        const newX = Math.max(8, Math.min(e.clientX - dragOffset.current.x, maxX))
        const newY = Math.max(8, Math.min(e.clientY - dragOffset.current.y, maxY))

        setPosition({ x: newX, y: newY })
    }

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isDragging) return
        setIsDragging(false)

        if (pillRef.current) {
            pillRef.current.releasePointerCapture(e.pointerId)
        }

        // Save position
        if (position.x !== -1) {
            localStorage.setItem(POSITION_KEY, JSON.stringify(position))
        }
    }

    const handleModeChange = (newMode: ViewportMode) => {
        setMode(newMode)
        localStorage.setItem(STORAGE_KEY, newMode)
        setIsOpen(false)
    }

    // Handle pill click (toggle menu) - only if not dragged
    const handlePillClick = () => {
        if (hasMoved.current) return // was a drag, not a click

        const isMobileMode = !!VIEWPORT_PRESETS[mode].width
        if (isMobileMode && !isExpanded) {
            // In mobile mode, first click expands
            setIsExpanded(true)
        } else {
            // Toggle dropdown
            setIsOpen(!isOpen)
        }
    }

    // Don't render in production or on server
    if (!mounted || process.env.NODE_ENV === 'production') {
        return null
    }

    const currentPreset = VIEWPORT_PRESETS[mode]
    const isMobileMode = !!currentPreset.width

    // Calculate style based on position
    const positionStyle: React.CSSProperties = position.x === -1
        ? { bottom: 8, left: '50%', transform: 'translateX(-50%)' }
        : { left: position.x, top: position.y }

    // In mobile mode, default to collapsed (just icon)
    const showCollapsed = isMobileMode && !isExpanded

    return (
        <div
            ref={pillRef}
            className="fixed z-[9999] select-none"
            style={{ ...positionStyle, touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
        >
            {/* Main Pill */}
            <button
                onClick={handlePillClick}
                className={`flex items-center gap-2 bg-gray-800/90 backdrop-blur border border-gray-700 rounded-full shadow-lg hover:bg-gray-700/90 transition-all cursor-grab active:cursor-grabbing ${showCollapsed ? 'p-2' : 'px-3 py-2'
                    }`}
                title={showCollapsed ? 'Expand viewport simulator' : 'Viewport Simulator (drag to move)'}
            >
                <span className="text-base">📱</span>

                {!showCollapsed && (
                    <>
                        <span className="text-xs font-medium text-gray-300">
                            {currentPreset.name}
                        </span>
                        {currentPreset.width && (
                            <span className="text-[10px] text-gray-500">
                                {currentPreset.width}×{effectiveHeight}
                            </span>
                        )}
                    </>
                )}

                {/* Collapse button (only when expanded in mobile mode) */}
                {isMobileMode && isExpanded && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            setIsExpanded(false)
                            setIsOpen(false)
                        }}
                        className="ml-1 text-gray-400 hover:text-white text-sm"
                        title="Collapse"
                    >
                        ✕
                    </button>
                )}
            </button>

            {/* Dropdown Menu - opens upward */}
            {isOpen && !showCollapsed && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 py-1 bg-gray-800/95 backdrop-blur border border-gray-700 rounded-lg shadow-xl min-w-[160px]">
                    {Object.entries(VIEWPORT_PRESETS).map(([key, preset]) => (
                        <button
                            key={key}
                            onClick={() => handleModeChange(key as ViewportMode)}
                            className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-700/50 transition-colors flex items-center justify-between ${mode === key ? 'text-purple-400' : 'text-gray-300'
                                }`}
                        >
                            <span>{preset.name}</span>
                            {preset.width && (
                                <span className="text-[10px] text-gray-500">
                                    {preset.width}×{preset.height}
                                </span>
                            )}
                            {mode === key && <span className="ml-2">✓</span>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
