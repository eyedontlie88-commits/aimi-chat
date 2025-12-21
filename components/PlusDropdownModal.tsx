'use client'

import { useEffect } from 'react'
import { useLanguage } from '@/lib/i18n'

interface PlusDropdownModalProps {
    isOpen: boolean
    onClose: () => void
    characterId: string
    onPhoneCheck?: () => void  // ⏰ Clock - narrative phone check scenario
    onPhone?: () => void       // 📱 Phone - opens Phone OS screen
    onMemory?: () => void
    onSettings?: () => void
    onSearch?: () => void
    onReset?: () => void
    onSceneDirector?: () => void // 🎬 Scene Director - narrative control
    devMode?: boolean
}

interface MenuItem {
    id: string
    icon: string
    label: string
    onClick?: () => void
    devOnly?: boolean
    placeholder?: boolean
    highlight?: boolean // VIP feature highlighting
}

export default function PlusDropdownModal({
    isOpen,
    onClose,
    characterId,
    onPhoneCheck,
    onPhone,
    onMemory,
    onSettings,
    onSearch,
    onReset,
    onSceneDirector,
    devMode = false,
}: PlusDropdownModalProps) {
    // Prevent scroll when modal is open
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

    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose()
            }
        }
        document.addEventListener('keydown', handleEsc)
        return () => document.removeEventListener('keydown', handleEsc)
    }, [isOpen, onClose])

    // CRITICAL: All hooks MUST be called before any conditional return
    const { t } = useLanguage()

    if (!isOpen) return null

    // Menu items configuration
    const menuItems: MenuItem[] = [
        {
            id: 'scene-director',
            icon: '🎬',
            label: t.menu.director,
            onClick: () => {
                onSceneDirector?.()
                onClose()
            },
            highlight: true, // VIP feature
        },
        {
            id: 'image',
            icon: '🖼️',
            label: t.menu.image,
            placeholder: true, // Future feature
        },
        {
            id: 'search',
            icon: '💬',
            label: t.menu.messages,
            onClick: () => {
                onSearch?.()
                onClose()
            },
        },
        {
            id: 'phone-check',
            icon: '⏰',
            label: t.menu.clock,
            onClick: () => {
                onPhoneCheck?.()
                onClose()
            },
        },
        {
            id: 'memory',
            icon: '📝',
            label: t.menu.notes,
            onClick: () => {
                onMemory?.()
                onClose()
            },
        },
        {
            id: 'phone',
            icon: '📱',
            label: t.menu.phone,
            onClick: () => {
                onPhone?.()  // Opens Phone OS screen
                onClose()
            },
        },
        {
            id: 'help',
            icon: '💡',
            label: t.menu.help,
            placeholder: true, // Future feature
        },
        {
            id: 'reset',
            icon: '💭',
            label: t.menu.reset,
            onClick: () => {
                onReset?.()
                onClose()
            },
            devOnly: true,
        },
        {
            id: 'dev-options',
            icon: '🔖',
            label: t.menu.dev,
            placeholder: true, // Future feature
            devOnly: true,
        },
    ]

    // Filter items based on devMode
    const visibleItems = menuItems.filter(item => !item.devOnly || devMode)

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="fixed top-0 left-0 right-0 z-[9999] flex justify-center pt-4 px-4 animate-in slide-in-from-top duration-300">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs sm:max-w-sm overflow-hidden">
                    {/* Header with close button */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-900">{t.menu.title}</h3>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                            aria-label="Close menu"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Grid of menu items - 2 columns */}
                    <div className="grid grid-cols-2 gap-1 p-3">
                        {visibleItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={item.onClick}
                                disabled={item.placeholder}
                                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-all ${item.placeholder
                                    ? 'opacity-40 cursor-not-allowed bg-gray-50'
                                    : item.highlight
                                        ? 'bg-gradient-to-br from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 active:scale-95 cursor-pointer ring-2 ring-purple-300'
                                        : 'hover:bg-gray-100 active:scale-95 cursor-pointer'
                                    }`}
                            >
                                <span className="text-2xl sm:text-3xl">{item.icon}</span>
                                <span className={`text-xs sm:text-sm font-medium ${item.highlight ? 'text-purple-700' : 'text-gray-700'}`}>
                                    {item.label}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Footer hint */}
                    <div className="px-4 py-2 border-t border-gray-100 text-center">
                        <p className="text-xs text-gray-400">
                            {t.menu.tapToSelect}
                        </p>
                    </div>
                </div>
            </div>
        </>
    )
}
