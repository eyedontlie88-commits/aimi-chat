'use client'

import { useState, useEffect } from 'react'
import { X, Map, StickyNote, Wallet, MessageCircle, Globe } from 'lucide-react'
import MessagesApp from './apps/MessagesApp'

interface PhoneHomeScreenProps {
    isOpen: boolean
    onClose: () => void
    characterName: string
    characterDescription?: string  // For AI-generated content
    onAppClick?: (appId: string) => void
}

// App definitions with pastel colors
const apps = [
    { id: 'maps', name: 'Bản đồ', icon: Map, bgColor: 'bg-pink-200', iconColor: 'text-pink-600' },
    { id: 'notes', name: 'Ghi chú', icon: StickyNote, bgColor: 'bg-yellow-200', iconColor: 'text-yellow-600' },
    { id: 'wallet', name: 'Ví', icon: Wallet, bgColor: 'bg-blue-200', iconColor: 'text-blue-600' },
    { id: 'messages', name: 'Tin nhắn', icon: MessageCircle, bgColor: 'bg-green-200', iconColor: 'text-green-600' },
    { id: 'browser', name: 'Trình duyệt', icon: Globe, bgColor: 'bg-sky-200', iconColor: 'text-sky-600' },
]

export default function PhoneHomeScreen({
    isOpen,
    onClose,
    characterName,
    characterDescription,
    onAppClick
}: PhoneHomeScreenProps) {
    const [currentTime, setCurrentTime] = useState(new Date())
    const [activeApp, setActiveApp] = useState<string | null>(null)

    // Update time every second
    useEffect(() => {
        if (!isOpen) return

        const timer = setInterval(() => {
            setCurrentTime(new Date())
        }, 1000)

        return () => clearInterval(timer)
    }, [isOpen])

    // Reset active app when modal closes
    useEffect(() => {
        if (!isOpen) {
            setActiveApp(null)
        }
    }, [isOpen])

    // Format date: DD/MM/YY Day
    const formatDate = (date: Date) => {
        const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
        const day = date.getDate().toString().padStart(2, '0')
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const year = date.getFullYear().toString().slice(-2)
        const dayName = days[date.getDay()]
        return `${day}/${month}/${year} ${dayName}.`
    }

    // Format time: HH:MM
    const formatTime = (date: Date) => {
        const hours = date.getHours().toString().padStart(2, '0')
        const minutes = date.getMinutes().toString().padStart(2, '0')
        return `${hours}:${minutes}`
    }

    // Handle app click
    const handleAppClick = (appId: string) => {
        // Notify parent if callback provided
        onAppClick?.(appId)

        // Open app internally
        setActiveApp(appId)
    }

    // Handle Escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                if (activeApp) {
                    setActiveApp(null) // Go back to home first
                } else {
                    onClose()
                }
            }
        }
        document.addEventListener('keydown', handleEsc)
        return () => document.removeEventListener('keydown', handleEsc)
    }, [isOpen, onClose, activeApp])

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    if (!isOpen) return null

    // Render active app
    const renderActiveApp = () => {
        // Get app info for header
        const currentApp = apps.find(a => a.id === activeApp)
        const appName = currentApp?.name || 'App'

        switch (activeApp) {
            case 'messages':
                return (
                    <MessagesApp
                        onBack={() => setActiveApp(null)}
                        characterName={characterName}
                        characterDescription={characterDescription}
                    />
                )
            default:
                // Coming Soon placeholder for unimplemented apps
                return (
                    <div className="flex flex-col h-full bg-white">
                        {/* Header */}
                        <div className="flex items-center gap-2 px-2 py-3 border-b border-gray-100 bg-[#FFF9F0]">
                            <button
                                onClick={() => setActiveApp(null)}
                                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/50 transition-colors"
                            >
                                <span className="text-xl text-gray-600">←</span>
                            </button>
                            <h2 className="text-lg font-semibold text-gray-800">{appName}</h2>
                        </div>

                        {/* Coming Soon Content */}
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                            <span className="text-6xl mb-4">🚧</span>
                            <h3 className="text-xl font-semibold text-gray-700 mb-2">
                                Đang phát triển
                            </h3>
                            <p className="text-sm text-gray-500">
                                Tính năng này sẽ sớm có mặt trong phiên bản tiếp theo!
                            </p>
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-2 border-t border-gray-100 text-center bg-[#FFF9F0]">
                            <button
                                onClick={() => setActiveApp(null)}
                                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                ← Quay lại trang chủ
                            </button>
                        </div>
                    </div>
                )
        }
    }

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Phone Container */}
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                <div
                    className="w-full max-w-sm bg-[#FFF5EB] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Show active app OR home screen */}
                    {activeApp ? (
                        <div className="min-h-[560px] flex flex-col">
                            {renderActiveApp()}
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-pink-100">
                                <div className="flex-1" />
                                <h2 className="text-sm font-medium text-gray-700 bg-white/80 px-4 py-1.5 rounded-full border border-pink-100">
                                    Điện thoại của {characterName}
                                </h2>
                                <div className="flex-1 flex justify-end">
                                    <button
                                        onClick={onClose}
                                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-pink-100 transition-colors"
                                    >
                                        <X className="w-5 h-5 text-gray-500" />
                                    </button>
                                </div>
                            </div>

                            {/* Phone Screen */}
                            <div className="p-6 min-h-[500px] flex flex-col">
                                {/* Date/Time Widget */}
                                <div className="bg-[#FFF9F0] rounded-3xl border-2 border-gray-200 p-6 mb-8 shadow-sm">
                                    <div className="text-center">
                                        <p className="text-gray-600 text-lg font-medium mb-2">
                                            {formatDate(currentTime)}
                                        </p>
                                        <p className="text-6xl font-light text-gray-800 tracking-tight">
                                            {formatTime(currentTime)}
                                        </p>
                                    </div>
                                </div>

                                {/* App Grid */}
                                <div className="bg-white/60 rounded-3xl p-4 border border-pink-100">
                                    <div className="grid grid-cols-3 gap-4">
                                        {apps.map((app) => {
                                            const IconComponent = app.icon
                                            return (
                                                <button
                                                    key={app.id}
                                                    onClick={() => handleAppClick(app.id)}
                                                    className="flex flex-col items-center gap-2 group"
                                                >
                                                    <div
                                                        className={`w-14 h-14 rounded-2xl ${app.bgColor} flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-200`}
                                                    >
                                                        <IconComponent className={`w-7 h-7 ${app.iconColor}`} />
                                                    </div>
                                                    <span className="text-xs text-gray-600 font-medium">
                                                        {app.name}
                                                    </span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Bottom spacer for phone aesthetic */}
                                <div className="flex-1" />

                                {/* Home indicator (like iPhone) */}
                                <div className="flex justify-center mt-6">
                                    <div className="w-32 h-1 bg-gray-300 rounded-full" />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    )
}

