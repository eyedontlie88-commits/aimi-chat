'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '@/lib/i18n'

interface SceneDirectorModalProps {
    isOpen: boolean
    onClose: () => void
    characterId: string
    // Long-term scene goal
    sceneGoal: string
    onSceneGoalChange: (goal: string) => void
    // One-time next direction
    nextDirection: string
    onNextDirectionChange: (direction: string) => void
}

type TabType = 'long-term' | 'quick'

/**
 * Scene Director Modal - "Đạo diễn Cảnh"
 * 
 * Two tabs for user narrative control:
 * 1. Long-term Scene Goal: Persistent context for entire chat session
 * 2. Quick Direction: One-time instruction for next AI response only
 */
export default function SceneDirectorModal({
    isOpen,
    onClose,
    characterId,
    sceneGoal,
    onSceneGoalChange,
    nextDirection,
    onNextDirectionChange,
}: SceneDirectorModalProps) {
    const [activeTab, setActiveTab] = useState<TabType>('long-term')
    const [localGoal, setLocalGoal] = useState(sceneGoal)
    const [localDirection, setLocalDirection] = useState(nextDirection)
    const [mounted, setMounted] = useState(false)
    const [goalSaved, setGoalSaved] = useState(false)
    const [directionApplied, setDirectionApplied] = useState(false)
    const { t } = useLanguage()

    useEffect(() => {
        setMounted(true)
    }, [])

    // Sync local state with props
    useEffect(() => {
        setLocalGoal(sceneGoal)
    }, [sceneGoal])

    useEffect(() => {
        setLocalDirection(nextDirection)
    }, [nextDirection])

    // Prevent body scroll when modal is open
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

    const handleSaveGoal = () => {
        onSceneGoalChange(localGoal)
        // Save to localStorage for persistence
        if (localGoal.trim()) {
            localStorage.setItem(`scene_goal_${characterId}`, localGoal)
        } else {
            localStorage.removeItem(`scene_goal_${characterId}`)
        }
        setGoalSaved(true)
        setTimeout(() => setGoalSaved(false), 2000)
    }

    const handleClearGoal = () => {
        setLocalGoal('')
        onSceneGoalChange('')
        localStorage.removeItem(`scene_goal_${characterId}`)
    }

    const handleApplyDirection = () => {
        onNextDirectionChange(localDirection)
        setDirectionApplied(true)
        setTimeout(() => {
            setDirectionApplied(false)
            onClose() // Auto-close after applying
        }, 500)
    }

    if (!isOpen || !mounted) return null

    const modalContent = (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <div className="w-full max-w-md bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl relative animate-in slide-in-from-bottom-4 zoom-in-95 duration-300 max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">🎬</span>
                        <h2 className="text-lg font-bold text-white">{t.director.title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/80 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10">
                    <button
                        onClick={() => setActiveTab('long-term')}
                        className={`flex-1 py-3 px-4 text-sm font-medium transition-all ${activeTab === 'long-term'
                            ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10'
                            : 'text-gray-400 hover:text-gray-300'
                            }`}
                    >
                        {t.director.longTab}
                    </button>
                    <button
                        onClick={() => setActiveTab('quick')}
                        className={`flex-1 py-3 px-4 text-sm font-medium transition-all ${activeTab === 'quick'
                            ? 'text-pink-400 border-b-2 border-pink-400 bg-pink-500/10'
                            : 'text-gray-400 hover:text-gray-300'
                            }`}
                    >
                        {t.director.quickTab}
                    </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-5">
                    {activeTab === 'long-term' ? (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-400">
                                {t.director.longHint}
                            </p>

                            <textarea
                                value={localGoal}
                                onChange={(e) => setLocalGoal(e.target.value)}
                                placeholder={t.director.longPlaceholder}
                                className="w-full h-32 px-4 py-3 bg-slate-800/80 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                            />

                            {/* Status indicator */}
                            {sceneGoal && (
                                <div className="flex items-center gap-2 p-3 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                                    <span className="text-green-400 text-sm">✓</span>
                                    <span className="text-purple-300 text-xs">{t.director.scriptActive}</span>
                                    <button
                                        onClick={handleClearGoal}
                                        className="ml-auto text-xs text-red-400 hover:text-red-300"
                                    >
                                        {t.director.clear}
                                    </button>
                                </div>
                            )}

                            <button
                                onClick={handleSaveGoal}
                                disabled={goalSaved}
                                className={`w-full py-3 rounded-xl font-bold text-white transition-all ${goalSaved
                                    ? 'bg-green-600 cursor-default'
                                    : 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700'
                                    }`}
                            >
                                {goalSaved ? t.director.saved : t.director.saveScript}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-400">
                                {t.director.quickHint}
                            </p>

                            <textarea
                                value={localDirection}
                                onChange={(e) => setLocalDirection(e.target.value)}
                                placeholder={t.director.quickPlaceholder}
                                className="w-full h-32 px-4 py-3 bg-slate-800/80 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50"
                            />

                            <div className="flex items-center gap-2 p-3 bg-slate-800/50 border border-white/10 rounded-lg">
                                <span className="text-yellow-400">⏳</span>
                                <span className="text-gray-400 text-xs">
                                    {t.director.quickNote}
                                </span>
                            </div>

                            <button
                                onClick={handleApplyDirection}
                                disabled={!localDirection.trim() || directionApplied}
                                className={`w-full py-3 rounded-xl font-bold text-white transition-all ${directionApplied
                                    ? 'bg-green-600 cursor-default'
                                    : !localDirection.trim()
                                        ? 'bg-gray-600 cursor-not-allowed opacity-50'
                                        : 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700'
                                    }`}
                            >
                                {directionApplied ? t.director.applied : t.director.applyNext}
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer hint */}
                <div className="border-t border-white/10 px-5 py-3 text-center">
                    <p className="text-xs text-gray-500">
                        {activeTab === 'long-term'
                            ? t.director.footerLong
                            : t.director.footerQuick}
                    </p>
                </div>
            </div>
        </div>
    )

    return createPortal(modalContent, document.body)
}
