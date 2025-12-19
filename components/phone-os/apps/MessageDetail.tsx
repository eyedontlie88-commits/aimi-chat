'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, Loader2, Send } from 'lucide-react'

interface MessageDetailProps {
    onBack: () => void
    senderName: string
    senderAvatar: string
    characterId: string
    characterDescription?: string
    conversationId?: string
    lastMessagePreview?: string
}

interface MessageBubble {
    id: string
    content: string
    is_from_character: boolean
    created_at: string
}

export default function MessageDetail({
    onBack,
    senderName,
    senderAvatar,
    characterId,
    characterDescription,
    conversationId: initialConvId,
    lastMessagePreview
}: MessageDetailProps) {
    const [messages, setMessages] = useState<MessageBubble[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [replyText, setReplyText] = useState('')
    const [source, setSource] = useState<'database' | 'ai' | 'fallback'>('database')
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Scroll to bottom when messages load
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // Fetch conversation detail on mount
    useEffect(() => {
        async function fetchMessages() {
            setLoading(true)
            setError(null)

            try {
                const response = await fetch('/api/phone/get-conversation-detail', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        senderName,
                        characterId,
                        characterDescription,
                        conversationId: initialConvId,
                        lastMessagePreview
                    })
                })

                if (!response.ok) {
                    throw new Error('Failed to fetch messages')
                }

                const data = await response.json()
                setMessages(data.messages || [])
                setSource(data.source || 'database')

            } catch (err: any) {
                console.error('[MessageDetail] Fetch error:', err)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchMessages()
    }, [senderName, characterId, characterDescription, initialConvId, lastMessagePreview])

    // Handle reply (UI only for now)
    const handleSendReply = () => {
        if (!replyText.trim()) return

        // Add message locally (optimistic update)
        const newMessage: MessageBubble = {
            id: `local-${Date.now()}`,
            content: replyText.trim(),
            is_from_character: true,
            created_at: new Date().toISOString()
        }
        setMessages(prev => [...prev, newMessage])
        setReplyText('')

        // TODO: Save to database in future update
    }

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="flex items-center gap-3 px-2 py-3 border-b border-gray-100 bg-[#FFF9F0]">
                <button
                    onClick={onBack}
                    className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/50 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6 text-gray-600" />
                </button>

                {/* Contact Info */}
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl">
                    {senderAvatar}
                </div>
                <div className="flex-1">
                    <h2 className="text-base font-semibold text-gray-800">{senderName}</h2>
                    {source === 'ai' && (
                        <span className="text-[10px] text-green-500">✨ Mới tạo bởi AI</span>
                    )}
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {loading ? (
                    // Loading Skeleton
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                        <p className="text-sm text-gray-400">Đang tải tin nhắn...</p>
                        <p className="text-xs text-gray-300">Có thể mất vài giây nếu là lần đầu</p>
                    </div>
                ) : error ? (
                    // Error State
                    <div className="flex flex-col items-center justify-center h-full gap-2">
                        <span className="text-4xl">😢</span>
                        <p className="text-sm text-gray-500">Không thể tải tin nhắn</p>
                        <button
                            onClick={onBack}
                            className="text-xs text-blue-500 hover:underline"
                        >
                            Quay lại
                        </button>
                    </div>
                ) : messages.length === 0 ? (
                    // Empty State
                    <div className="flex flex-col items-center justify-center h-full gap-2">
                        <span className="text-4xl">💬</span>
                        <p className="text-sm text-gray-500">Chưa có tin nhắn nào</p>
                    </div>
                ) : (
                    // Message Bubbles
                    <>
                        {messages.map((msg, index) => (
                            <div
                                key={msg.id ? `${msg.id}-${index}` : `msg-${index}`}
                                className={`flex ${msg.is_from_character ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[75%] px-3 py-2 rounded-2xl ${msg.is_from_character
                                        ? 'bg-blue-500 text-white rounded-br-md'
                                        : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'
                                        }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Reply Input */}
            <div className="px-3 py-2 border-t border-gray-100 bg-white">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                        placeholder="Nhập tin nhắn..."
                        className="flex-1 px-4 py-2 rounded-full border border-gray-200 text-sm focus:outline-none focus:border-blue-300"
                    />
                    <button
                        onClick={handleSendReply}
                        disabled={!replyText.trim()}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${replyText.trim()
                            ? 'bg-blue-500 text-white hover:bg-blue-600'
                            : 'bg-gray-100 text-gray-400'
                            }`}
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
                <p className="text-[10px] text-gray-400 text-center mt-1">
                    Tin nhắn sẽ hiển thị trong phiên này
                </p>
            </div>
        </div>
    )
}
