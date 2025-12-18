'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, Loader2, RotateCw } from 'lucide-react'

interface MessagesAppProps {
    onBack: () => void
    characterId?: string
    characterName?: string
    characterDescription?: string
    messageCount?: number  // Current number of messages in chat
}

interface ConversationItem {
    id: number
    name: string
    avatar: string
    lastMessage: string
    time: string
    unread: number
}

// Fallback mock data
const fallbackConversations: ConversationItem[] = [
    { id: 1, name: 'Mẹ yêu 💕', avatar: '👩', lastMessage: 'Con nhớ về sớm nhé, nay có canh chua.', time: '14:00', unread: 2 },
    { id: 2, name: 'Sếp', avatar: '👔', lastMessage: 'Deadline slide gửi chưa em?', time: 'Hôm qua', unread: 0 },
    { id: 3, name: 'Bank Notification', avatar: '🏦', lastMessage: 'TK ****1234 +5,000,000 VND từ NGUYEN...', time: 'Hôm qua', unread: 0 },
    { id: 4, name: 'Nhóm Bạn Thân', avatar: '👥', lastMessage: 'Cuối tuần đi cafe không?', time: 'T6', unread: 5 },
    { id: 5, name: 'Shopee', avatar: '🛒', lastMessage: 'Đơn hàng của bạn đang được giao...', time: 'T5', unread: 0 },
]

// Cache keys
const getCacheKey = (characterId: string) => `phone_cached_messages_${characterId}`
const getCountKey = (characterId: string) => `phone_last_fetch_count_${characterId}`
const getCooldownKey = (characterId: string) => `phone_refresh_cooldown_${characterId}`

// Threshold: regenerate only if 10+ new messages
const MESSAGE_THRESHOLD = 10
// Cooldown: 60 seconds
const REFRESH_COOLDOWN = 60

export default function MessagesApp({
    onBack,
    characterId = 'default',
    characterName,
    characterDescription,
    messageCount = 0
}: MessagesAppProps) {
    const [conversations, setConversations] = useState<ConversationItem[]>([])
    const [loading, setLoading] = useState(true)
    const [source, setSource] = useState<'ai' | 'cached' | 'fallback'>('fallback')
    const [cooldownRemaining, setCooldownRemaining] = useState(0)
    const [isRefreshing, setIsRefreshing] = useState(false)

    // Check cooldown on mount
    useEffect(() => {
        const cooldownEnd = sessionStorage.getItem(getCooldownKey(characterId))
        if (cooldownEnd) {
            const remaining = Math.max(0, Math.ceil((parseInt(cooldownEnd) - Date.now()) / 1000))
            if (remaining > 0) {
                setCooldownRemaining(remaining)
            }
        }
    }, [characterId])

    // Cooldown timer
    useEffect(() => {
        if (cooldownRemaining <= 0) return
        const timer = setInterval(() => {
            setCooldownRemaining(prev => Math.max(0, prev - 1))
        }, 1000)
        return () => clearInterval(timer)
    }, [cooldownRemaining])

    // Fetch messages (with caching logic)
    const fetchMessages = useCallback(async (forceRefresh = false) => {
        setLoading(true)

        try {
            // Check cache first (unless force refresh)
            if (!forceRefresh) {
                const cachedData = sessionStorage.getItem(getCacheKey(characterId))
                const lastFetchCount = parseInt(sessionStorage.getItem(getCountKey(characterId)) || '0')
                const messageDiff = messageCount - lastFetchCount

                // Use cached data if threshold not met
                if (cachedData && messageDiff < MESSAGE_THRESHOLD) {
                    console.log(`[MessagesApp] Using cached data (diff: ${messageDiff} < ${MESSAGE_THRESHOLD})`)
                    setConversations(JSON.parse(cachedData))
                    setSource('cached')
                    setLoading(false)
                    return
                }
            }

            // Fetch new data from API
            console.log(`[MessagesApp] Fetching new messages from API...`)
            const response = await fetch('/api/phone/generate-messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    characterName: characterName || 'Nhân vật',
                    characterDescription: characterDescription || '',
                }),
            })

            if (!response.ok) {
                throw new Error('API request failed')
            }

            const data = await response.json()
            const messages = data.messages || fallbackConversations

            // Update cache
            sessionStorage.setItem(getCacheKey(characterId), JSON.stringify(messages))
            sessionStorage.setItem(getCountKey(characterId), messageCount.toString())

            setConversations(messages)
            setSource(data.source === 'ai' ? 'ai' : 'fallback')

        } catch (error) {
            console.error('[MessagesApp] Failed to fetch:', error)
            // Try to use cache on error
            const cachedData = sessionStorage.getItem(getCacheKey(characterId))
            if (cachedData) {
                setConversations(JSON.parse(cachedData))
                setSource('cached')
            } else {
                setConversations(fallbackConversations)
                setSource('fallback')
            }
        } finally {
            setLoading(false)
            setIsRefreshing(false)
        }
    }, [characterId, characterName, characterDescription, messageCount])

    // Initial fetch on mount
    useEffect(() => {
        fetchMessages(false)
    }, [fetchMessages])

    // Manual refresh with cooldown
    const handleRefresh = () => {
        if (cooldownRemaining > 0 || loading) return

        setIsRefreshing(true)

        // Set cooldown
        const cooldownEnd = Date.now() + (REFRESH_COOLDOWN * 1000)
        sessionStorage.setItem(getCooldownKey(characterId), cooldownEnd.toString())
        setCooldownRemaining(REFRESH_COOLDOWN)

        // Force refresh
        fetchMessages(true)
    }

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="flex items-center gap-2 px-2 py-3 border-b border-gray-100 bg-[#FFF9F0]">
                <button
                    onClick={onBack}
                    className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/50 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6 text-gray-600" />
                </button>
                <h2 className="text-lg font-semibold text-gray-800">Tin nhắn</h2>

                {/* Source badge */}
                {source === 'ai' && (
                    <span className="text-[10px] text-green-500 bg-green-50 px-2 py-0.5 rounded-full">
                        Mới
                    </span>
                )}
                {source === 'cached' && (
                    <span className="text-[10px] text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">
                        Đã lưu
                    </span>
                )}

                {/* Refresh button */}
                <button
                    onClick={handleRefresh}
                    disabled={cooldownRemaining > 0 || loading}
                    className={`ml-auto w-8 h-8 flex items-center justify-center rounded-full transition-all ${cooldownRemaining > 0 || loading
                            ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                            : 'hover:bg-white/50 text-gray-500 hover:text-gray-700'
                        }`}
                    title={cooldownRemaining > 0 ? `Chờ ${cooldownRemaining}s` : 'Làm mới tin nhắn'}
                >
                    {isRefreshing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : cooldownRemaining > 0 ? (
                        <span className="text-[10px] font-medium">{cooldownRemaining}</span>
                    ) : (
                        <RotateCw className="w-4 h-4" />
                    )}
                </button>
            </div>

            {/* Cached data notice */}
            {source === 'cached' && !loading && (
                <div className="px-4 py-2 bg-amber-50 border-b border-amber-100">
                    <p className="text-xs text-amber-600 text-center">
                        📋 Đang hiển thị tin nhắn đã lưu (Chat thêm {MESSAGE_THRESHOLD - (messageCount - parseInt(sessionStorage.getItem(getCountKey(characterId)) || '0'))} tin để cập nhật)
                    </p>
                </div>
            )}

            {/* Loading State */}
            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                    <p className="text-sm text-gray-400">Đang tải tin nhắn...</p>
                </div>
            ) : (
                /* Conversations List */
                <div className="flex-1 overflow-y-auto">
                    {conversations.map((conv) => (
                        <button
                            key={conv.id}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-50"
                        >
                            {/* Avatar */}
                            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-2xl shrink-0">
                                {conv.avatar}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 text-left">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium text-gray-900 truncate">
                                        {conv.name}
                                    </span>
                                    <span className="text-xs text-gray-400 shrink-0">
                                        {conv.time}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 truncate mt-0.5">
                                    {conv.lastMessage}
                                </p>
                            </div>

                            {/* Unread badge */}
                            {conv.unread > 0 && (
                                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                                    <span className="text-[10px] font-bold text-white">
                                        {conv.unread}
                                    </span>
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {/* Footer hint */}
            <div className="px-4 py-2 border-t border-gray-100 text-center bg-[#FFF9F0]">
                <p className="text-[10px] text-gray-400">
                    {source === 'ai'
                        ? `Tin nhắn được tạo bởi AI dựa trên ${characterName || 'nhân vật'}`
                        : source === 'cached'
                            ? 'Tin nhắn đã được lưu trong phiên này'
                            : 'Đây là tin nhắn mô phỏng trong điện thoại của nhân vật'}
                </p>
            </div>
        </div>
    )
}


