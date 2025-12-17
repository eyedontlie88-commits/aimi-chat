'use client'

import { useState, useEffect, useCallback } from 'react'
import { DEVICES, type DeviceKey } from '@/lib/responsive'

const STORAGE_KEY = 'device-simulator-mode'

interface DeviceSimulatorProps {
    /** Show debug overlay with current dimensions */
    showDebug?: boolean
}

/**
 * Enhanced Device Simulator with overlay and debug info
 * Only active in development mode
 */
export default function DeviceSimulator({ showDebug = false }: DeviceSimulatorProps) {
    const [device, setDevice] = useState<DeviceKey>('desktop')
    const [isOpen, setIsOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [showDebugOverlay, setShowDebugOverlay] = useState(showDebug)

    useEffect(() => {
        setMounted(true)
        const saved = localStorage.getItem(STORAGE_KEY) as DeviceKey | null
        if (saved && DEVICES[saved]) {
            setDevice(saved)
        }
    }, [])

    // Apply viewport simulation
    useEffect(() => {
        if (!mounted) return

        const preset = DEVICES[device]
        const wrapper = document.getElementById('viewport-wrapper')
        const body = document.body
        const html = document.documentElement

        if (!wrapper) return

        if (preset.width && preset.height) {
            // Mobile simulation - center the device frame
            html.style.cssText = `
                height: 100%;
                overflow: hidden;
            `
            body.style.cssText = `
                background: #0a0a0a;
                height: 100%;
                margin: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
            `
            wrapper.style.cssText = `
                width: ${preset.width}px;
                height: ${preset.height}px;
                max-width: ${preset.width}px;
                max-height: ${preset.height}px;
                box-shadow: 0 0 0 1px rgba(255,255,255,0.1), 0 25px 50px -12px rgba(0,0,0,0.5);
                border-radius: 24px;
                overflow: hidden;
                overflow-y: auto;
                flex-shrink: 0;
            `
        } else {
            // Desktop - reset styles
            html.style.cssText = ''
            wrapper.style.cssText = ''
            body.style.cssText = ''
        }

        return () => {
            html.style.cssText = ''
            wrapper.style.cssText = ''
            body.style.cssText = ''
        }
    }, [device, mounted])

    const handleDeviceChange = (newDevice: DeviceKey) => {
        setDevice(newDevice)
        localStorage.setItem(STORAGE_KEY, newDevice)
        setIsOpen(false)
    }

    // Don't render in production
    if (!mounted || process.env.NODE_ENV === 'production') {
        return null
    }

    const currentPreset = DEVICES[device]

    return (
        <>
            {/* Floating Toggle */}
            <div className="fixed bottom-4 right-4 z-[9999]">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-800/90 backdrop-blur border border-gray-700 rounded-full shadow-lg hover:bg-gray-700/90 transition-colors"
                >
                    <span className="text-lg">📱</span>
                    <span className="text-xs font-medium text-gray-300">
                        {currentPreset.name}
                    </span>
                    {currentPreset.width && (
                        <span className="text-[10px] text-gray-500">
                            {currentPreset.width}×{currentPreset.height}
                        </span>
                    )}
                </button>

                {/* Dropdown */}
                {isOpen && (
                    <div className="absolute bottom-full right-0 mb-2 py-1 bg-gray-800/95 backdrop-blur border border-gray-700 rounded-lg shadow-xl min-w-[180px]">
                        {Object.entries(DEVICES).map(([key, preset]) => (
                            <button
                                key={key}
                                onClick={() => handleDeviceChange(key as DeviceKey)}
                                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-700/50 transition-colors flex items-center justify-between ${device === key ? 'text-purple-400' : 'text-gray-300'
                                    }`}
                            >
                                <span>{preset.name}</span>
                                <span className="text-[10px] text-gray-500">
                                    {preset.width ? `${preset.width}×${preset.height}` : 'Full'}
                                </span>
                            </button>
                        ))}

                        {/* Divider */}
                        <div className="border-t border-gray-700 my-1" />

                        {/* Debug toggle */}
                        <button
                            onClick={() => setShowDebugOverlay(!showDebugOverlay)}
                            className="w-full px-4 py-2 text-left text-xs text-gray-400 hover:bg-gray-700/50"
                        >
                            {showDebugOverlay ? '✓ ' : '○ '}Debug Overlay
                        </button>
                    </div>
                )}
            </div>

            {/* Debug Overlay */}
            {showDebugOverlay && (
                <DebugOverlay />
            )}
        </>
    )
}

/**
 * Debug overlay showing current responsive state
 */
function DebugOverlay() {
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

    useEffect(() => {
        const update = () => {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight,
            })
        }
        update()
        window.addEventListener('resize', update)
        return () => window.removeEventListener('resize', update)
    }, [])

    const getBreakpointLabel = (width: number) => {
        if (width <= 390) return 'Realme 10'
        if (width <= 393) return 'iPhone 14'
        if (width <= 767) return 'Mobile'
        if (width <= 1023) return 'Tablet'
        return 'Desktop'
    }

    return (
        <div className="fixed top-2 left-2 z-[9999] text-[10px] font-mono bg-black/80 text-green-400 px-2 py-1 rounded pointer-events-none">
            <div>{dimensions.width} × {dimensions.height}</div>
            <div className="text-purple-400">{getBreakpointLabel(dimensions.width)}</div>
        </div>
    )
}
