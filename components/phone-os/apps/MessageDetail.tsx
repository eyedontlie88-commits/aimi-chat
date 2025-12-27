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
    role: 'user' | 'contact' // ✅ FIXED: Use role from DB instead of is_from_character
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
    const [conversationId, setConversationId] = useState<string | null>(initialConvId || null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const hasFetchedRef = useRef<string | null>(null) // 🔥 Track per-conversation to allow switching

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

    // 🎬 DEV AUTO-CONVERSATION GENERATOR STATE
    const [showDevPanel, setShowDevPanel] = useState(false)
    const [devTopic, setDevTopic] = useState('caring')
    const [devMessageCount, setDevMessageCount] = useState(10)
    const [devPreviewMessages, setDevPreviewMessages] = useState<MessageBubble[]>([])
    const [isDevGenerating, setIsDevGenerating] = useState(false)
    const [isDevSaving, setIsDevSaving] = useState(false)

    const DEV_TOPICS = [
        { value: 'arguing', label: '🔥 Cãi nhau' },
        { value: 'flirting', label: '💕 Thả thính' },
        { value: 'work', label: '💼 Công việc gấp' },
        { value: 'debt', label: '💸 Nhắc nợ' },
        { value: 'caring', label: '❤️ Quan tâm' },
        { value: 'gossip', label: '🗣️ Buôn chuyện' },
        { value: 'planning', label: '📅 Lên kế hoạch' },
    ]

    // Scroll to bottom when messages load
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    // 🏦 Detect banking contact (notification-only, no replies allowed)
    const isBankingContact = senderName.toLowerCase().includes('ngân hàng') ||
        senderName.toLowerCase().includes('bank')

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // Fetch conversation detail on mount (ONLY ONCE!)
    useEffect(() => {
        // 🔥 Track per-conversation to allow switching between conversations
        const conversationKey = `${senderName}-${characterId}`
        if (hasFetchedRef.current === conversationKey) {
            console.log('[MessageDetail] ⏭️ Skipping duplicate fetch for:', conversationKey)
            return
        }
        hasFetchedRef.current = conversationKey
        console.log('[MessageDetail] 🆕 New conversation detected:', conversationKey)

        async function fetchMessages() {
            setLoading(true)
            setError(null)

            try {
                const reloadFlagKey = `phone_reload_${conversationKey}`
                const isReload = sessionStorage.getItem(reloadFlagKey) === 'true'
                if (isReload) {
                    sessionStorage.removeItem(reloadFlagKey)
                    console.log('[MessageDetail] 🔄 Reload detected for:', conversationKey)
                } else {
                    console.log('[MessageDetail] 🆕 First open of:', conversationKey)
                }

                // 🔥 STEP 1: Fetch existing conversation
                const response = await fetch('/api/phone/get-conversation-detail', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        senderName,
                        characterId,
                        characterName,
                        characterDescription,
                        conversationId: initialConvId,
                        lastMessagePreview,
                        userLanguage: lang,
                        forceRegenerate: false,
                        userEmail
                    })
                })

                if (!response.ok) {
                    throw new Error('Failed to load conversation')
                }

                const data = await response.json()
                const fetchedMessages = data.messages || []

                console.log(`[MessageDetail] 📖 Loaded ${fetchedMessages.length} messages`)

                // � Debug checkpoint
                console.log('[MessageDetail] 🔍 Debug check:', {
                    messagesLength: fetchedMessages.length,
                    isReload: isReload,
                    shouldGenerate: fetchedMessages.length === 0 && !isReload
                })

                // 🔥 STEP 2: Generate initial messages if conversation is empty
                if (fetchedMessages.length === 0) { // 🔥 Generate even on reload if empty
                    console.log('[MessageDetail] 🆕 Empty conversation detected')
                    console.log('[MessageDetail] 📞 Calling generate-messages API...')
                    console.log('[MessageDetail] 📦 Payload:', {
                        characterId,
                        characterName,
                        senderName,
                        language: lang,
                        isInitial: true
                    })

                    try {
                        const genResponse = await fetch('/api/phone/generate-messages', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                characterId,
                                characterName,
                                characterDescription,
                                language: lang,
                                isInitial: true,
                                forceGenerate: true,
                                contactName: senderName,
                                userEmail
                            })
                        })

                        console.log('[MessageDetail] 📡 generate-messages response status:', genResponse.status)

                        if (genResponse.ok) {
                            const genData = await genResponse.json()
                            console.log('[MessageDetail] ✅ Initial messages generated:', genData.count || 'unknown count')

                            // Wait a bit for DB to save
                            await new Promise(resolve => setTimeout(resolve, 500))

                            // Fetch again to get the new messages
                            console.log('[MessageDetail] 🔄 Refreshing conversation...')
                            const refreshResponse = await fetch('/api/phone/get-conversation-detail', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    senderName,
                                    characterId,
                                    characterName,
                                    characterDescription,
                                    conversationId: data.conversationId,
                                    userLanguage: lang,
                                    forceRegenerate: false,
                                    userEmail
                                })
                            })

                            if (refreshResponse.ok) {
                                const refreshData = await refreshResponse.json()
                                setMessages(refreshData.messages || [])
                                setConversationId(refreshData.conversationId)
                                console.log(`[MessageDetail] 📱 Loaded ${refreshData.messages?.length || 0} messages after generation`)
                            } else {
                                console.error('[MessageDetail] ❌ Refresh failed:', refreshResponse.status)
                                setMessages([])
                            }
                        } else {
                            const errorText = await genResponse.text()
                            console.error('[MessageDetail] ❌ generate-messages failed:', genResponse.status, errorText)
                            setMessages([])
                            setConversationId(data.conversationId)
                        }
                    } catch (error) {
                        console.error('[MessageDetail] ❌ Exception during initial message generation:', error)
                        setMessages([])
                        setConversationId(data.conversationId)
                    }
                }
                // 🔥 STEP 3: Smart reload - check if AI should reply
                else if (isReload && fetchedMessages.length > 0) {
                    const lastMessage = fetchedMessages[fetchedMessages.length - 1]
                    // ✅ FIXED: Check role instead of is_from_character
                    // role='user' = last message from user (Hiếu) → AI should reply
                    const shouldRegenerate = lastMessage.role === 'user'

                    if (shouldRegenerate) {
                        console.log('[MessageDetail] 🤖 Last message from user, triggering AI reply...')

                        const aiResponse = await fetch('/api/phone/generate-ai-reply', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                conversationId: data.conversationId,
                                characterId,
                                senderName,
                                characterName,
                                characterDescription,
                                userLanguage: lang,
                                userEmail
                            })
                        })

                        if (aiResponse.ok) {
                            console.log('[MessageDetail] ✅ AI reply generated on reload')

                            const refreshResponse = await fetch('/api/phone/get-conversation-detail', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    senderName,
                                    characterId,
                                    conversationId: data.conversationId,
                                    forceRegenerate: false,
                                    userEmail
                                })
                            })

                            if (refreshResponse.ok) {
                                const refreshData = await refreshResponse.json()
                                setMessages(refreshData.messages || [])
                                setConversationId(refreshData.conversationId)
                            }
                        } else {
                            const errorData = await aiResponse.json().catch(() => ({}))
                            console.log('[MessageDetail] ⚠️ AI reply failed/rate-limited:', errorData.message || 'Unknown')
                            setMessages(fetchedMessages)
                            setConversationId(data.conversationId)
                        }
                    } else {
                        console.log('[MessageDetail] ℹ️ Last message from AI, no regeneration needed')
                        setMessages(fetchedMessages)
                        setConversationId(data.conversationId)
                    }
                }
                // 🔥 Normal case: just show messages
                else {
                    setMessages(fetchedMessages)
                    setConversationId(data.conversationId)
                }

                setSource('database')

            } catch (err) {
                console.error('[MessageDetail] ❌ Error loading messages:', err)
                setError('Failed to load messages')
            } finally {
                setLoading(false)
            }
        }

        fetchMessages()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []) // 🔥 EMPTY DEPS = Only run ONCE on mount

    // 🔥 Set reload flag when component unmounts (for next mount to detect reload)
    useEffect(() => {
        const conversationKey = `${senderName}-${characterId}`
        return () => {
            const reloadFlagKey = `phone_reload_${conversationKey}`
            sessionStorage.setItem(reloadFlagKey, 'true')
            console.log('[MessageDetail] 🚭 Unmounting, set reload flag for:', conversationKey)
        }
    }, [senderName, characterId])

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
                            content: replyText.trim(),
                            is_from_character: false // ✅ FIXED: User replying = NOT from contact (will be saved as role='user')
                        })
                    })

                    if (saveResponse.ok) {
                        const saveData = await saveResponse.json()
                        if (saveData.message?.id) {
                            savedMessageId = saveData.message.id
                            console.log(`[MessageDetail] 💾 Saved to DB with ID: ${savedMessageId}`)
                        }

                        // 🔥 TRIGGER AI REPLY via get-conversation-detail with forceRegenerate
                        const realConvId = saveData.conversationId
                        console.log(`[MessageDetail] 🤖 Triggering AI reply for: ${realConvId}`)

                        // Add user message to UI immediately (before AI responds)
                        const userMessage: MessageBubble = {
                            id: savedMessageId,
                            content: replyText.trim(),
                            role: 'user', // ✅ FIXED: User message = RIGHT side
                            created_at: new Date().toISOString()
                        }
                        saveToLocalCache(userMessage)
                        setMessages(prev => [...prev, userMessage])
                        setReplyText('')

                        // 🔥 Call API to generate AI reply (async, will update UI after)
                        setTimeout(async () => {
                            try {
                                const aiRes = await fetch('/api/phone/get-conversation-detail', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        senderName,
                                        characterId,
                                        characterName,
                                        characterDescription,
                                        conversationId: realConvId,
                                        userLanguage: lang,
                                        forceRegenerate: true, // 🔥 Trigger AI reply
                                        userEmail
                                    })
                                })

                                if (aiRes.ok) {
                                    const aiData = await aiRes.json()
                                    if (aiData.messages && aiData.messages.length > 0) {
                                        // 🔥 FIX: Merge DB messages with local state to prevent race condition
                                        // Don't blindly overwrite - check if user message exists in DB response
                                        setMessages(prevMessages => {
                                            const dbMessages = aiData.messages as MessageBubble[]
                                            const userMsgContent = replyText.trim()

                                            // Check if our user message is in DB response
                                            // 🔥 Added timestamp check to handle duplicate content (e.g., "ok" sent twice)
                                            const now = Date.now()
                                            const userMsgInDb = dbMessages.some(m =>
                                                m.content === userMsgContent &&
                                                m.role === 'user' && // ✅ FIXED: Use role instead of is_from_character
                                                Math.abs(new Date(m.created_at).getTime() - now) < 10000 // Within 10s
                                            )

                                            if (userMsgInDb) {
                                                // DB has our message, safe to use DB messages
                                                console.log(`[MessageDetail] ✅ DB has user message, using DB state (${dbMessages.length} messages)`)
                                                return dbMessages
                                            } else {
                                                // Race condition! DB doesn't have our message yet
                                                // Keep local user message and append any new AI messages
                                                console.log(`[MessageDetail] ⚠️ Race condition detected! Preserving local user message`)

                                                // Find messages that are new (not in prev)
                                                const prevIds = new Set(prevMessages.map(m => m.id))
                                                const newMessages = dbMessages.filter(m => !prevIds.has(m.id))

                                                if (newMessages.length > 0) {
                                                    console.log(`[MessageDetail] 📥 Adding ${newMessages.length} new messages from DB`)
                                                    return [...prevMessages, ...newMessages]
                                                }
                                                return prevMessages
                                            }
                                        })
                                    }
                                }
                            } catch (aiErr) {
                                console.error('[MessageDetail] AI trigger error:', aiErr)
                            }
                        }, 1000) // 🔥 Increased delay to 1s for DB save to complete
                    }
                } catch (saveErr) {
                    console.error('[MessageDetail] Failed to save to DB:', saveErr)
                    // Continue anyway with temp ID - graceful degradation

                    // Add to UI with temp ID
                    const newMessage: MessageBubble = {
                        id: savedMessageId,
                        content: replyText.trim(),
                        role: 'user', // ✅ FIXED: User message = RIGHT side
                        created_at: new Date().toISOString()
                    }
                    saveToLocalCache(newMessage)
                    setMessages(prev => [...prev, newMessage])
                    setReplyText('')
                }

                if (onUserReply) onUserReply(senderName, replyText.trim())
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

    // 🎬 DEV: Generate conversation preview
    const handleDevGenerate = async () => {
        if (!isDevUser || isDevGenerating) return

        setIsDevGenerating(true)
        setDevPreviewMessages([])

        try {
            console.log(`🎬 [DEV] Generating ${devMessageCount} messages with topic: ${devTopic}`)

            const response = await fetch('/api/phone/dev-generate-conversation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userEmail,
                    characterId,
                    characterName,
                    characterDescription,
                    senderName,
                    topic: devTopic,
                    messageCount: devMessageCount,
                    userLanguage: lang,
                    saveToDb: false // Preview only
                })
            })

            const data = await response.json()

            if (data.messages && data.messages.length > 0) {
                setDevPreviewMessages(data.messages)
                console.log(`✅ [DEV] Preview generated: ${data.messages.length} messages`)
            } else {
                console.error('[DEV] No messages generated:', data.error)
            }
        } catch (err) {
            console.error('[DEV] Generate error:', err)
        } finally {
            setIsDevGenerating(false)
        }
    }

    // 🎬 DEV: Save preview to database
    const handleDevSave = async () => {
        if (!isDevUser || isDevSaving || devPreviewMessages.length === 0) return

        setIsDevSaving(true)

        try {
            console.log(`💾 [DEV] Saving ${devPreviewMessages.length} messages to DB...`)

            const response = await fetch('/api/phone/dev-generate-conversation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userEmail,
                    characterId,
                    characterName,
                    characterDescription,
                    senderName,
                    topic: devTopic,
                    messageCount: devMessageCount,
                    userLanguage: lang,
                    saveToDb: true, // Actually save this time
                    conversationId: initialConvId
                })
            })

            const data = await response.json()

            if (data.saved) {
                console.log(`✅ [DEV] Saved to DB successfully!`)
                // Merge with existing messages
                setMessages(prev => {
                    const combined = [...prev, ...data.messages]
                        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                    return combined
                })
                // Clear preview
                setDevPreviewMessages([])
                setShowDevPanel(false)
            } else {
                console.error('[DEV] Save failed:', data.error)
            }
        } catch (err) {
            console.error('[DEV] Save error:', err)
        } finally {
            setIsDevSaving(false)
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

                {/* 🎬 DEV PANEL TOGGLE */}
                {isDevUser && (
                    <button
                        onClick={() => setShowDevPanel(!showDevPanel)}
                        className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${showDevPanel ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-600 hover:bg-orange-200'}`}
                        title="DEV: Auto-Conversation Generator"
                    >
                        🎬
                    </button>
                )}
            </div>

            {/* 🎬 DEV AUTO-CONVERSATION GENERATOR PANEL */}
            {isDevUser && showDevPanel && (
                <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-3 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">🎬 Auto-Conversation Generator</span>
                        <span className="text-[10px] opacity-75">DEV ONLY</span>
                    </div>

                    {/* Topic Selector */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs">Chủ đề:</span>
                        <select
                            value={devTopic}
                            onChange={(e) => setDevTopic(e.target.value)}
                            className="flex-1 bg-white/20 text-white text-xs px-2 py-1 rounded border-none outline-none"
                        >
                            {DEV_TOPICS.map(t => (
                                <option key={t.value} value={t.value} className="text-gray-800">{t.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Message Count Slider */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs">Số tin:</span>
                        <input
                            type="range"
                            min="3"
                            max="20"
                            value={devMessageCount}
                            onChange={(e) => setDevMessageCount(Number(e.target.value))}
                            className="flex-1"
                        />
                        <span className="text-xs font-bold w-6">{devMessageCount}</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleDevGenerate}
                            disabled={isDevGenerating}
                            className="flex-1 bg-white text-orange-600 font-bold text-xs py-2 px-3 rounded hover:bg-orange-50 disabled:opacity-50 transition-colors"
                        >
                            {isDevGenerating ? '🔄 Đang tạo...' : '⚡ GENERATE PREVIEW'}
                        </button>
                        <button
                            onClick={handleDevSave}
                            disabled={isDevSaving || devPreviewMessages.length === 0}
                            className="bg-green-500 text-white font-bold text-xs py-2 px-3 rounded hover:bg-green-600 disabled:opacity-50 transition-colors"
                        >
                            {isDevSaving ? '💾 Saving...' : `💾 SAVE (${devPreviewMessages.length})`}
                        </button>
                    </div>

                    {/* Preview Count */}
                    {devPreviewMessages.length > 0 && (
                        <div className="text-xs opacity-75 text-center">
                            ✅ Preview: {devPreviewMessages.length} tin nhắn sẵn sàng lưu
                        </div>
                    )}
                </div>
            )}

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
                            <div key={msg.id || index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[75%] px-3 py-2 rounded-2xl ${msg.role === 'user' ? 'bg-blue-500 text-white rounded-br-md' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'}`}>
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

                {/* 🏦 Banking/Notification contacts: Auto-reply handled by backend, no UI notice needed */}

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
