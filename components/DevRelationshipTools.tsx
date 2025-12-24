'use client'

import { useState } from 'react'

interface DevRelationshipToolsProps {
    characterId: string
    currentStage: string
    currentAffection: number
    onUpdate: (data: { affectionPoints: number; intimacyLevel: number; stage: string }) => void
}

const STAGES = ['STRANGER', 'ACQUAINTANCE', 'CRUSH', 'DATING', 'COMMITTED']

/**
 * TASK C: Dev-only tools for quick relationship manipulation
 * Hidden in production via NODE_ENV check in parent component
 */
export default function DevRelationshipTools({
    characterId,
    currentStage,
    currentAffection,
    onUpdate,
}: DevRelationshipToolsProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const [isArchiving, setIsArchiving] = useState(false)  // 📦 Archive state

    const callDevApi = async (action: string, params: Record<string, any> = {}) => {
        setIsLoading(true)
        try {
            const res = await fetch('/api/dev/relationship', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ characterId, action, ...params }),
            })
            if (!res.ok) throw new Error('API failed')
            const data = await res.json()
            if (data.relationship) {
                onUpdate(data.relationship)
            }
        } catch (e) {
            console.error('[DevTools]', e)
        } finally {
            setIsLoading(false)
        }
    }

    if (!isExpanded) {
        return (
            <button
                onClick={() => setIsExpanded(true)}
                className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded border border-yellow-500/30 hover:bg-yellow-500/30"
                title="Open Dev Tools"
            >
                🧪 Dev
            </button>
        )
    }

    return (
        <div className="flex flex-wrap items-center gap-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-xs">
            <span className="font-bold text-yellow-400">🧪 DEV:</span>

            {/* Stage Dropdown */}
            <select
                value={currentStage}
                onChange={(e) => callDevApi('setStage', { stage: e.target.value })}
                disabled={isLoading}
                className="px-2 py-1 bg-black/30 border border-yellow-500/30 rounded text-yellow-300"
            >
                {STAGES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                ))}
            </select>

            {/* Affection Slider */}
            <div className="flex items-center gap-1">
                <span className="text-yellow-300">❤️{currentAffection}</span>
                <input
                    type="range"
                    min="-100"
                    max="5000"
                    value={currentAffection}
                    onChange={(e) => callDevApi('setAffection', { affection: parseInt(e.target.value) })}
                    disabled={isLoading}
                    className="w-20 h-2 accent-yellow-500"
                />
            </div>

            {/* Quick Actions */}
            <button
                onClick={() => callDevApi('applyImpact', { impact: 100 })}
                disabled={isLoading}
                className="px-2 py-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30"
            >
                +100
            </button>
            <button
                onClick={() => callDevApi('applyImpact', { impact: -100 })}
                disabled={isLoading}
                className="px-2 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
            >
                -100
            </button>

            {/* Jump Presets */}
            <select
                onChange={(e) => e.target.value && callDevApi('jumpTo', { target: e.target.value })}
                disabled={isLoading}
                className="px-2 py-1 bg-black/30 border border-blue-500/30 rounded text-blue-300"
                defaultValue=""
            >
                <option value="">⚡ Jump to...</option>
                <option value="STRANGER">→ STRANGER (5pts = 50%)</option>
                <option value="ACQUAINTANCE">→ ACQUAINTANCE (50pts = 50%)</option>
                <option value="CRUSH">→ CRUSH (500pts = 50%)</option>
                <option value="DATING">→ DATING (1500pts = 50%)</option>
                <option value="COMMITTED">→ COMMITTED (4000pts = 80%)</option>
            </select>

            {/* Time Gap Simulation */}
            <button
                onClick={() => callDevApi('simulateTimeGap', { hours: 24 })}
                disabled={isLoading}
                className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30"
                title="Simulate 24h gap"
            >
                ⏰24h
            </button>
            <button
                onClick={() => callDevApi('simulateTimeGap', { hours: 72 })}
                disabled={isLoading}
                className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30"
                title="Simulate 72h gap"
            >
                ⏰72h
            </button>

            {/* Reset Relationship Only */}
            <button
                onClick={() => {
                    if (confirm('Reset relationship only (keep messages)?')) {
                        callDevApi('resetRelationshipOnly')
                    }
                }}
                disabled={isLoading}
                className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded hover:bg-orange-500/30"
            >
                🔄 Reset Rel
            </button>

            {/* 📦 Archive to Telegram & Clean DB */}
            <button
                onClick={async () => {
                    if (!confirm('⚠️ CẢNH BÁO: Hành động này sẽ chuyển tin nhắn đã xóa (Soft Deleted) sang Telegram và XÓA VĨNH VIỄN khỏi Database để giải phóng bộ nhớ. Tiếp tục?')) return

                    setIsArchiving(true)
                    try {
                        const res = await fetch('/api/system/archive-to-telegram', { method: 'POST' })
                        const data = await res.json()

                        if (data.success) {
                            alert(`✅ THÀNH CÔNG!\n${data.message}\n${data.telegramFileId ? `File ID: ${data.telegramFileId}` : ''}`)
                        } else {
                            alert(`❌: ${data.message || data.error}`)
                        }
                    } catch (e) {
                        alert('Lỗi: ' + e)
                    } finally {
                        setIsArchiving(false)
                    }
                }}
                disabled={isArchiving}
                className="px-2 py-1 bg-indigo-500/20 text-indigo-400 rounded hover:bg-indigo-500/30 disabled:opacity-50"
                title="Archive soft-deleted messages to Telegram"
            >
                {isArchiving ? '⏳...' : '📦 Archive'}
            </button>

            {/* Collapse */}
            <button
                onClick={() => setIsExpanded(false)}
                className="px-2 py-1 text-gray-400 hover:text-white"
            >
                ✕
            </button>

            {isLoading && <span className="text-yellow-400 animate-pulse">...</span>}
        </div>
    )
}
