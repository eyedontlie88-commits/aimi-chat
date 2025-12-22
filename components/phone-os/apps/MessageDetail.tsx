'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, Loader2, Send, Zap, HeartCrack, Heart } from 'lucide-react'
import { useLanguage } from '@/lib/i18n'

// 🔐 DEV EMAILS (Copy từ MessagesApp để check quyền tại chỗ)
const DEV_EMAILS = [
    'eyedontlie88@gmail.com',
    'giangcm987@gmail.com',
]

interface MessageDetailProps {
    onBack: () => void
    senderName: string
    senderAvatar: string
    characterId: string
    characterName?: string
    characterDescription?: string
    conversationId?: string
    lastMessagePreview?: string
    onUserReply?: (senderName: string, messageText: string) => void
    userEmail?: string // 👈 Nhận email để check quyền
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
    characterName,
    characterDescription,
    conversationId: initialConvId,
    lastMessagePreview,
    onUserReply,
    userEmail
}: MessageDetailProps) {
    const { t, lang } = useLanguage()
    const [messages, setMessages] = useState<MessageBubble[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [replyText, setReplyText] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [refusalToast, setRefusalToast] = useState<string | null>(null)
    const [source, setSource] = useState<'database' | 'ai' | 'fallback'>('database')
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // 🧠 SessionStorage cache key for user messages (DB fallback)
    const getLocalCacheKey = () => `phone_user_msgs_${characterId}_${senderName}`

    // Helper: Save user message to sessionStorage as backup
    const saveToLocalCache = (msg: MessageBubble) => {
        const key = getLocalCacheKey()
        const existing = JSON.parse(sessionStorage.getItem(key) || '[]') as MessageBubble[]
        // Avoid duplicates
        if (!existing.some(m => m.content === msg.content)) {
            existing.push(msg)
            sessionStorage.setItem(key, JSON.stringify(existing))
            console.log(`[MessageDetail] 💾 Saved to local cache: ${msg.content.slice(0, 30)}...`)
        }
    }

    // Helper: Get user messages from local cache
    const getLocalCache = (): MessageBubble[] => {
        try {
            return JSON.parse(sessionStorage.getItem(getLocalCacheKey()) || '[]')
        } catch {
            return []
        }
    }

    // 🕵️‍♂️ DEV HACK STATE - Director Console
    const isDevUser = userEmail && DEV_EMAILS.includes(userEmail)
    const [devMode, setDevMode] = useState<'NORMAL' | 'DRAMA' | 'LOVE'>('NORMAL')

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
                        lastMessagePreview,
                        userLanguage: lang,
                    })
                })
                if (!response.ok) throw new Error('Failed to fetch messages')
                const data = await response.json()

                // 🧠 MERGE: API messages + local cache (for user messages that may have failed to save)
                const apiMessages = data.messages || []
                const localUserMsgs = getLocalCache()

                // Merge: add local user messages that aren't in API result
                const merged = [...apiMessages]
                for (const localMsg of localUserMsgs) {
                    const exists = merged.some(m => m.content === localMsg.content)
                    if (!exists) {
                        merged.push(localMsg)
                        console.log(`[MessageDetail] 🔄 Merged from local cache: ${localMsg.content.slice(0, 30)}...`)
                    }
                }
                // Sort by created_at
                merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

                setMessages(merged)
                setSource(data.source || 'database')
            } catch (err: unknown) {
                console.error('[MessageDetail] Fetch error:', err)
                setError(err instanceof Error ? err.message : 'Unknown error')
            } finally {
                setLoading(false)
            }
        }
        fetchMessages()
    }, [senderName, characterId, characterDescription, initialConvId, lastMessagePreview, lang])

    // 🎭 EMOTIONAL GATEKEEPER with DEV OVERRIDE (Director Console)
    const handleSendReply = async () => {
        if (!replyText.trim() || isSending) return

        setIsSending(true)
        setRefusalToast(null)

        try {
            console.log(`[MessageDetail] 🎭 Requesting permission. DevMode: ${devMode}`)

            // 🧪 CHẾ TẠO CONTEXT GIẢ (DIRECTOR MODE)
            let fakeContext = undefined
            if (devMode === 'DRAMA') {
                fakeContext = {
                    intimacyLevel: 0,
                    status: 'ARGUING_INTENSELY', // Ép AI phải ghét
                    affectionPoints: -100
                }
            } else if (devMode === 'LOVE') {
                fakeContext = {
                    intimacyLevel: 4,
                    status: 'DEEPLY_IN_LOVE', // Ép AI phải yêu
                    affectionPoints: 100
                }
            }
            // Normal: Để undefined cho server tự lấy mặc định

            const response = await fetch('/api/phone/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    characterName: characterName || 'Character',
                    characterDescription,
                    recipientName: senderName,
                    userMessage: replyText.trim(),
                    userLanguage: lang,
                    relationshipContext: fakeContext // 👈 Gửi context giả đi
                })
            })

            const data = await response.json()

            if (data.allowed) {
                // ✅ ALLOWED - Save to database FIRST, then show in UI
                console.log('[MessageDetail] ✅ Permission GRANTED!')

                // 💾 Save to database to persist across reloads
                let savedMessageId = `temp-${Date.now()}`
                try {
                    const saveResponse = await fetch('/api/phone/save-user-message', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            characterId,
                            senderName,
                            content: replyText.trim()
                        })
                    })

                    if (saveResponse.ok) {
                        const saveData = await saveResponse.json()
                        if (saveData.message?.id) {
                            savedMessageId = saveData.message.id
                            console.log(`[MessageDetail] 💾 Saved to DB with ID: ${savedMessageId}`)
                        }
                    }
                } catch (saveErr) {
                    console.error('[MessageDetail] Failed to save to DB:', saveErr)
                    // Continue anyway with temp ID - graceful degradation
                }

                // Add to UI with real or temp ID
                const newMessage: MessageBubble = {
                    id: savedMessageId,
                    content: replyText.trim(),
                    is_from_character: true,
                    created_at: new Date().toISOString()
                }

                // 🧠 HACK: Always save to local cache as backup
                saveToLocalCache(newMessage)

                setMessages(prev => [...prev, newMessage])
                if (onUserReply) onUserReply(senderName, replyText.trim())
                setReplyText('')
            } else {
                // ❌ DENIED
                console.log('[MessageDetail] ❌ Permission DENIED:', data.refusalMessage)
                setRefusalToast(data.refusalMessage || 'Character denied action.')
                setTimeout(() => setRefusalToast(null), 5000)
            }
        } catch (err) {
            console.error('[MessageDetail] Send error:', err)
            setRefusalToast('Error sending message')
        } finally {
            setIsSending(false)
        }
    }

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="flex items-center gap-3 px-2 py-3 border-b border-gray-100 bg-[#FFF9F0]">
                <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/50 transition-colors">
                    <ChevronLeft className="w-6 h-6 text-gray-600" />
                </button>
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl">
                    {senderAvatar}
                </div>
                <div className="flex-1">
                    <h2 className="text-base font-semibold text-gray-800">{senderName}</h2>
                    {/* DEV MODE INDICATOR */}
                    {isDevUser && devMode !== 'NORMAL' && (
                        <span className={`text-[10px] font-bold px-1 rounded ${devMode === 'DRAMA' ? 'bg-red-100 text-red-600' : 'bg-pink-100 text-pink-600'}`}>
                            [FORCE: {devMode}]
                        </span>
                    )}
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                        <p className="text-sm text-gray-400">{t.phone.loadingDetail}</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2">
                        <span className="text-4xl">😢</span>
                        <p className="text-sm text-gray-500">{t.phone.cannotLoadMessages}</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2">
                        <span className="text-4xl">💬</span>
                        <p className="text-sm text-gray-500">{t.phone.noMessagesYet}</p>
                    </div>
                ) : (
                    <>
                        {messages.map((msg, index) => (
                            <div key={msg.id || index} className={`flex ${msg.is_from_character ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[75%] px-3 py-2 rounded-2xl ${msg.is_from_character ? 'bg-blue-500 text-white rounded-br-md' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'}`}>
                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Refusal Toast */}
            {refusalToast && (
                <div className="px-4 py-3 bg-red-50 border-t border-red-100 animate-in slide-in-from-bottom-5">
                    <p className="text-sm text-red-700 text-center font-bold">⚠️ {refusalToast}</p>
                </div>
            )}

            {/* Reply Input + DEV DIRECTOR CONSOLE */}
            <div className="px-3 py-2 border-t border-gray-100 bg-white">

                {/* 🎬 DEV DIRECTOR TOOLBAR (Chỉ hiện cho Dev) */}
                {isDevUser && (
                    <div className="flex gap-2 mb-2 justify-center">
                        <button
                            onClick={() => setDevMode('DRAMA')}
                            className={`p-1.5 rounded-full transition-all ${devMode === 'DRAMA' ? 'bg-red-500 text-white scale-110' : 'bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-500'}`}
                            title="🔴 Force DRAMA (Test DENY)"
                        >
                            <HeartCrack className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setDevMode('NORMAL')}
                            className={`p-1.5 rounded-full transition-all ${devMode === 'NORMAL' ? 'bg-blue-500 text-white scale-110' : 'bg-gray-100 text-gray-400 hover:bg-blue-100 hover:text-blue-500'}`}
                            title="⚡ Normal Mode"
                        >
                            <Zap className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setDevMode('LOVE')}
                            className={`p-1.5 rounded-full transition-all ${devMode === 'LOVE' ? 'bg-pink-500 text-white scale-110' : 'bg-gray-100 text-gray-400 hover:bg-pink-100 hover:text-pink-500'}`}
                            title="🟢 Force LOVE (Test ALLOW)"
                        >
                            <Heart className="w-4 h-4" />
                        </button>
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                        placeholder={devMode === 'DRAMA'
                            ? "🔴 Thử nhắn gì đó xem có bị chặn k..."
                            : devMode === 'LOVE'
                                ? "💕 Nhắn gì cũng được qua hết..."
                                : (lang === 'en' ? `Reply as ${characterName}...` : `Trả lời thay ${characterName}...`)}
                        disabled={isSending}
                        className={`flex-1 px-4 py-2 rounded-full border text-sm focus:outline-none disabled:bg-gray-50 transition-colors ${devMode === 'DRAMA'
                            ? 'border-red-300 bg-red-50 focus:border-red-400'
                            : devMode === 'LOVE'
                                ? 'border-pink-300 bg-pink-50 focus:border-pink-400'
                                : 'border-gray-200 focus:border-blue-300'
                            }`}
                    />
                    <button
                        onClick={handleSendReply}
                        disabled={!replyText.trim() || isSending}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isSending
                            ? 'bg-gray-100 text-gray-400'
                            : replyText.trim()
                                ? 'bg-blue-500 text-white hover:bg-blue-600'
                                : 'bg-gray-100 text-gray-400'
                            }`}
                    >
                        {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                </div>
            </div>
        </div>
    )
}
