'use client'

import { useState, useEffect } from 'react'
import type { PhoneContent } from '@/lib/llm/phone-content-generator'

interface PhoneCheckModalProps {
    isOpen: boolean
    onClose: () => void
    characterId: string
    characterName: string
}

export default function PhoneCheckModal({
    isOpen,
    onClose,
    characterId,
    characterName,
}: PhoneCheckModalProps) {
    const [phoneContent, setPhoneContent] = useState<PhoneContent | null>(null)
    const [lastUpdated, setLastUpdated] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'calls' | 'messages' | 'notes' | 'calendar'>('messages')

    // Fetch phone content when modal opens
    useEffect(() => {
        if (isOpen && characterId) {
            fetchPhoneContent()
        }
    }, [isOpen, characterId])

    const fetchPhoneContent = async () => {
        try {
            setIsLoading(true)
            setError(null)

            const response = await fetch(`/api/phone-content/generate?characterId=${characterId}`)
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch phone content')
            }

            setPhoneContent(data.phoneContent)
            setLastUpdated(data.lastUpdated)
        } catch (err: any) {
            console.error('[PhoneCheckModal] Fetch error:', err)
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    const handleRefresh = async () => {
        try {
            setIsLoading(true)
            setError(null)

            const response = await fetch('/api/phone-content/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ characterId, forceRefresh: true })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate phone content')
            }

            setPhoneContent(data.phoneContent)
            setLastUpdated(data.lastUpdated)
        } catch (err: any) {
            console.error('[PhoneCheckModal] Refresh error:', err)
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)

        if (diffMins < 1) return 'Vừa xong'
        if (diffMins < 60) return `${diffMins} phút trước`
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)} giờ trước`
        return date.toLocaleDateString('vi-VN')
    }

    if (!isOpen) return null

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="card max-w-2xl w-full max-h-[85vh] flex flex-col animate-slide-up">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold gradient-text">📱 Điện thoại của {characterName}</h2>
                        {lastUpdated && (
                            <p className="text-xs text-secondary mt-1">
                                Cập nhật: {formatTimestamp(lastUpdated)}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleRefresh}
                            disabled={isLoading}
                            className="px-3 py-1.5 text-sm rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
                            title="Làm mới nội dung"
                        >
                            {isLoading ? '⏳' : '🔄'} Refresh
                        </button>
                        {/* Dev-only button to bypass message count requirement */}
                        {process.env.NODE_ENV === 'development' && (
                            <button
                                onClick={handleRefresh}
                                disabled={isLoading}
                                className="px-3 py-1.5 text-sm rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 transition-colors disabled:opacity-50"
                                title="Dev: Generate without 20-message requirement"
                            >
                                🧪 Dev Generate
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="text-secondary hover:text-white transition-colors text-2xl leading-none"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto py-4 min-h-0">
                    {isLoading && !phoneContent && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="animate-spin text-4xl mb-4">⏳</div>
                            <p className="text-secondary">Đang tải nội dung điện thoại...</p>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                            <p className="text-red-400 mb-2">❌ {error}</p>
                            <button onClick={handleRefresh} className="btn-secondary text-sm">
                                Thử lại
                            </button>
                        </div>
                    )}

                    {!isLoading && !error && !phoneContent && (
                        <div className="text-center py-12">
                            <p className="text-secondary mb-4">Chưa có nội dung điện thoại</p>
                            <p className="text-sm text-hint mb-4">
                                Trò chuyện thêm để tạo nội dung tự động, hoặc nhấn Refresh để tạo ngay.
                            </p>
                            <button onClick={handleRefresh} className="btn-primary">
                                Tạo ngay
                            </button>
                        </div>
                    )}

                    {phoneContent && (
                        <>
                            {/* Tab Navigation */}
                            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                                <button
                                    onClick={() => setActiveTab('calls')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 ${activeTab === 'calls'
                                        ? 'bg-primary text-white'
                                        : 'bg-white/10 hover:bg-white/20'
                                        }`}
                                >
                                    📞 Cuộc gọi ({phoneContent.callLogs?.length || 0})
                                </button>
                                <button
                                    onClick={() => setActiveTab('messages')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 ${activeTab === 'messages'
                                        ? 'bg-primary text-white'
                                        : 'bg-white/10 hover:bg-white/20'
                                        }`}
                                >
                                    💬 Tin nhắn ({phoneContent.messages?.length || 0})
                                </button>
                                <button
                                    onClick={() => setActiveTab('notes')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 ${activeTab === 'notes'
                                        ? 'bg-primary text-white'
                                        : 'bg-white/10 hover:bg-white/20'
                                        }`}
                                >
                                    📝 Ghi chú ({phoneContent.notes?.length || 0})
                                </button>
                                <button
                                    onClick={() => setActiveTab('calendar')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 ${activeTab === 'calendar'
                                        ? 'bg-primary text-white'
                                        : 'bg-white/10 hover:bg-white/20'
                                        }`}
                                >
                                    📅 Lịch ({phoneContent.calendar?.length || 0})
                                </button>
                            </div>

                            {/* Tab Content */}
                            <div className="space-y-3">
                                {/* Call Logs */}
                                {activeTab === 'calls' && (
                                    <div className="space-y-2">
                                        {phoneContent.callLogs?.length === 0 && (
                                            <p className="text-center text-hint py-8">Không có cuộc gọi nào</p>
                                        )}
                                        {phoneContent.callLogs?.map((call, idx) => (
                                            <div key={idx} className="bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-2xl">
                                                            {call.type === 'incoming' ? '📞' : call.type === 'outgoing' ? '📱' : '📵'}
                                                        </span>
                                                        <div>
                                                            <p className="font-medium">{call.contact}</p>
                                                            <p className="text-xs text-secondary">
                                                                {call.type === 'missed' ? 'Nhỡ' : call.duration}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs text-hint">
                                                        {formatTimestamp(call.timestamp)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Messages */}
                                {activeTab === 'messages' && (
                                    <div className="space-y-2">
                                        {phoneContent.messages?.length === 0 && (
                                            <p className="text-center text-hint py-8">Không có tin nhắn nào</p>
                                        )}
                                        {phoneContent.messages?.map((msg, idx) => (
                                            <div key={idx} className="bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors">
                                                <div className="flex items-start gap-3">
                                                    <span className="text-2xl">💬</span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <p className="font-medium">{msg.contact}</p>
                                                            {(msg.isDraft || msg.isUnsent) && (
                                                                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">
                                                                    {msg.isDraft ? 'Nháp' : 'Chưa gửi'}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-secondary line-clamp-2">{msg.preview}</p>
                                                        <span className="text-xs text-hint mt-1 block">
                                                            {formatTimestamp(msg.timestamp)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Notes */}
                                {activeTab === 'notes' && (
                                    <div className="space-y-2">
                                        {phoneContent.notes?.length === 0 && (
                                            <p className="text-center text-hint py-8">Không có ghi chú nào</p>
                                        )}
                                        {phoneContent.notes?.map((note, idx) => (
                                            <div key={idx} className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors">
                                                <div className="flex items-start gap-3">
                                                    <span className="text-xl">
                                                        {note.category === 'feelings' ? '💭' :
                                                            note.category === 'quotes' ? '💬' :
                                                                note.category === 'reminders' ? '⏰' : '📝'}
                                                    </span>
                                                    <div className="flex-1">
                                                        <p className="font-medium mb-1">{note.title}</p>
                                                        <p className="text-sm text-secondary whitespace-pre-wrap">{note.content}</p>
                                                        <span className="text-xs text-hint mt-2 block">
                                                            {formatTimestamp(note.timestamp)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Calendar */}
                                {activeTab === 'calendar' && (
                                    <div className="space-y-2">
                                        {phoneContent.calendar?.length === 0 && (
                                            <p className="text-center text-hint py-8">Không có lịch nào</p>
                                        )}
                                        {phoneContent.calendar?.map((event, idx) => (
                                            <div key={idx} className="bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors">
                                                <div className="flex items-start gap-3">
                                                    <span className="text-2xl">
                                                        {event.type === 'date' ? '💕' : event.type === 'reminder' ? '⏰' : '📅'}
                                                    </span>
                                                    <div className="flex-1">
                                                        <p className="font-medium">{event.title}</p>
                                                        <p className="text-sm text-secondary">
                                                            {new Date(event.date).toLocaleDateString('vi-VN')}
                                                            {event.time && ` • ${event.time}`}
                                                        </p>
                                                        {event.description && (
                                                            <p className="text-sm text-secondary mt-1">{event.description}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="pt-4 border-t border-white/10 shrink-0">
                    <button onClick={onClose} className="btn-secondary w-full">
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    )
}
