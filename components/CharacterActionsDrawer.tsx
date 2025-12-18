'use client'

import { useState } from 'react'
import { useLanguage } from '@/lib/i18n'

interface ActionItem {
    id: string
    icon: string
    label: string
    onClick: () => void
    badge?: number
    disabled?: boolean
}

interface CharacterActionsDrawerProps {
    characterName: string
    onOpenPhotos?: () => void
    onOpenThoughts?: () => void
    onOpenHistory?: () => void
    onOpenJournal?: () => void
    onOpenPhone?: () => void
    onOpenMemory?: () => void
    onOpenForum?: () => void
    onOpenFavorites?: () => void
    memoryCount?: number
}

/**
 * Character Actions Drawer - A FAB button that opens a grid menu of character features
 * Replaces inline action buttons with an app-drawer style menu
 */
export default function CharacterActionsDrawer({
    characterName,
    onOpenPhotos,
    onOpenThoughts,
    onOpenHistory,
    onOpenJournal,
    onOpenPhone,
    onOpenMemory,
    onOpenForum,
    onOpenFavorites,
    memoryCount = 0,
}: CharacterActionsDrawerProps) {
    const { t } = useLanguage()
    const [isOpen, setIsOpen] = useState(false)

    const actions: ActionItem[] = [
        {
            id: 'photos',
            icon: '📸',
            label: t.actions.photos,
            onClick: () => {
                onOpenPhotos?.()
                setIsOpen(false)
            },
            disabled: !onOpenPhotos,
        },
        {
            id: 'thoughts',
            icon: '💭',
            label: t.actions.thoughts,
            onClick: () => {
                onOpenThoughts?.()
                setIsOpen(false)
            },
            disabled: !onOpenThoughts,
        },
        {
            id: 'history',
            icon: '📅',
            label: t.actions.history,
            onClick: () => {
                onOpenHistory?.()
                setIsOpen(false)
            },
            disabled: !onOpenHistory,
        },
        {
            id: 'journal',
            icon: '📔',
            label: t.actions.journal,
            onClick: () => {
                onOpenJournal?.()
                setIsOpen(false)
            },
            disabled: !onOpenJournal,
        },
        {
            id: 'phone',
            icon: '📱',
            label: t.actions.phone,
            onClick: () => {
                onOpenPhone?.()
                setIsOpen(false)
            },
            disabled: !onOpenPhone,
        },
        {
            id: 'memory',
            icon: '🧠',
            label: t.actions.memory,
            onClick: () => {
                onOpenMemory?.()
                setIsOpen(false)
            },
            badge: memoryCount,
            disabled: !onOpenMemory,
        },
        {
            id: 'forum',
            icon: '💬',
            label: t.actions.forum,
            onClick: () => {
                onOpenForum?.()
                setIsOpen(false)
            },
            disabled: !onOpenForum,
        },
        {
            id: 'favorites',
            icon: '⭐',
            label: t.actions.favorites,
            onClick: () => {
                onOpenFavorites?.()
                setIsOpen(false)
            },
            disabled: !onOpenFavorites,
        },
    ]

    return (
        <>
            {/* FAB Button - positioned above chat input */}
            <button
                onClick={() => setIsOpen(true)}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 text-white text-2xl flex items-center justify-center shadow-lg shadow-pink-500/30 hover:scale-110 active:scale-95 transition-all"
                title="Mở menu tính năng"
            >
                <span className={`transform transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}>
                    +
                </span>
            </button>

            {/* Drawer Modal */}
            {isOpen && (
                <div
                    className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in"
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 via-slate-900 to-slate-900/95 rounded-t-3xl p-6 pt-8 animate-slide-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Handle bar */}
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-white/20 rounded-full" />

                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-white">
                                {t.actions.title}
                            </h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full text-secondary hover:text-white hover:bg-white/10 transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Actions Grid - 4 columns on desktop, 2 on mobile */}
                        <div className="grid grid-cols-4 gap-3 sm:gap-4">
                            {actions.map((action) => (
                                <button
                                    key={action.id}
                                    onClick={action.onClick}
                                    disabled={action.disabled}
                                    className={`relative flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl transition-all ${action.disabled
                                        ? 'bg-white/5 text-hint cursor-not-allowed'
                                        : 'bg-white/10 hover:bg-white/20 text-white active:scale-95'
                                        }`}
                                >
                                    {/* Icon */}
                                    <span className="text-2xl sm:text-3xl">{action.icon}</span>

                                    {/* Label */}
                                    <span className="text-[10px] sm:text-xs text-center leading-tight line-clamp-2">
                                        {action.label}
                                    </span>

                                    {/* Badge */}
                                    {action.badge && action.badge > 0 && (
                                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-pink-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                                            {action.badge > 9 ? '9+' : action.badge}
                                        </span>
                                    )}

                                    {/* Disabled overlay */}
                                    {action.disabled && (
                                        <span className="absolute bottom-1 text-[8px] text-hint">
                                            {t.actions.comingSoon}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Footer hint */}
                        <p className="text-center text-xs text-gray-500 mt-6">
                            {t.actions.tapOutside}
                        </p>
                    </div>
                </div>
            )}
        </>
    )
}
