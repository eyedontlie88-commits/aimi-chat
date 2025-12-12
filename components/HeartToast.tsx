'use client'

import { useEffect, useState } from 'react'

interface HeartToastProps {
    show: boolean
    characterName: string
    onHide: () => void
    // Theme colors for contrast
    bgClass?: string
    textClass?: string
}

export default function HeartToast({
    show,
    characterName,
    onHide,
    bgClass = 'bg-rose-600',
    textClass = 'text-white',
}: HeartToastProps) {
    const [isVisible, setIsVisible] = useState(false)
    const [isExiting, setIsExiting] = useState(false)

    useEffect(() => {
        if (show) {
            setIsVisible(true)
            setIsExiting(false)

            // Auto-hide after 5 seconds
            const timer = setTimeout(() => {
                setIsExiting(true)
                setTimeout(() => {
                    setIsVisible(false)
                    onHide()
                }, 500) // Fade out animation duration
            }, 5000)

            return () => clearTimeout(timer)
        }
    }, [show, onHide])

    if (!isVisible) return null

    return (
        <div
            className={`
                fixed bottom-24 left-1/2 -translate-x-1/2 z-50
                px-4 py-3 rounded-2xl shadow-lg
                flex items-center gap-3
                transition-all duration-500
                ${bgClass} ${textClass}
                ${isExiting ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}
            `}
        >
            {/* Animated Heart */}
            <span className="text-2xl animate-heartbeat">💕</span>

            {/* Message */}
            <div className="text-sm font-medium">
                <span className="font-bold">Thình thịch!</span>
                <br />
                <span className="opacity-90">Tim của {characterName} đã đập mạnh vì bạn!</span>
            </div>

            {/* Floating hearts (just decorative) */}
            <div className="absolute -top-2 right-4">
                <span className="text-lg animate-heart-float">❤️</span>
            </div>
        </div>
    )
}
