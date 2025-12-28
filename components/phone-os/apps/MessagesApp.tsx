'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, Loader2, RotateCw } from 'lucide-react'
import MessageDetail from './MessageDetail'
import { useLanguage } from '@/lib/i18n'

interface MessagesAppProps {
    onBack: () => void
    characterId?: string
    characterName?: string
    characterDescription?: string
    messageCount?: number  // Current number of messages in chat
    userEmail?: string     // For DEV identity check (Rule #7)
}

interface ConversationItem {
    id: number
    name: string
    avatar: string
    lastMessage: string
    time: string
    unread: number
}

// Cache keys
const getCacheKey = (characterId: string) => `phone_cached_messages_${characterId}`
const getCountKey = (characterId: string) => `phone_last_fetch_count_${characterId}`
const getCooldownKey = (characterId: string) => `phone_refresh_cooldown_${characterId}`

// Threshold: regenerate only if 10+ new messages
const MESSAGE_THRESHOLD = 10
// Cooldown: 60 seconds
const REFRESH_COOLDOWN = 60

// 🔐 DEV EMAILS WHITELIST
const DEV_EMAILS = [
    'eyedontlie88@gmail.com',
    'giangcm987@gmail.com', // <-- Thêm mới chuẩn rồi!
]

/**
 * 🧠 RULE #6: Smart Context - Merge messages instead of wiping
 * Null-safe merge: updates existing senders, adds new ones to top
 */
const mergeMessages = (existing: ConversationItem[], incoming: ConversationItem[]): ConversationItem[] => {
    // Null safety - ensure both are arrays
    const safeExisting = existing || []
    const safeIncoming = incoming || []

    if (safeIncoming.length === 0) return safeExisting
    if (safeExisting.length === 0) return safeIncoming

    const merged = [...safeExisting]

    for (const msg of safeIncoming) {
        const existingIdx = merged.findIndex(m => m.name === msg.name)
        if (existingIdx >= 0) {
            // Update existing: newer lastMessage, time, add to unread
            merged[existingIdx] = {
                ...merged[existingIdx],
                lastMessage: msg.lastMessage,
                time: msg.time,
                unread: (merged[existingIdx].unread || 0) + (msg.unread || 1)
            }
        } else {
            // New sender: add to top
            merged.unshift(msg)
        }
    }

    console.log(`[MessagesApp] mergeMessages: existing=${safeExisting.length}, incoming=${safeIncoming.length}, merged=${merged.length}`)
    return merged
}

export default function MessagesApp({
    onBack,
    characterId = 'default',
    characterName,
    characterDescription,
    messageCount = 0,
    userEmail
}: MessagesAppProps) {
    const { t, lang } = useLanguage()
    const [conversations, setConversations] = useState<ConversationItem[]>([])
    const [loading, setLoading] = useState(true)
    const [source, setSource] = useState<'ai' | 'cached' | 'fallback' | 'empty'>('fallback')
    const [cooldownRemaining, setCooldownRemaining] = useState(0)
    const [isRefreshing, setIsRefreshing] = useState(false)

    // 📡 PASSIVE SYNC: Fast polling mode after user sends message
    const [fastPollingMode, setFastPollingMode] = useState(false)
    const fastPollingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // 🧠 RULE #6: Ref to access current conversations from callback without stale closure
    const conversationsRef = useRef<ConversationItem[]>([])
    useEffect(() => {
        conversationsRef.current = conversations
    }, [conversations])

    // NO MORE FAKE FALLBACK - UI will show "Locked State" when empty

    // Selected conversation for detail view
    const [selectedConversation, setSelectedConversation] = useState<ConversationItem | null>(null)

    // 🔐 RULE #7: DEV Identity Check - Only whitelisted emails can see DEV tools
    const isDevUser = userEmail && DEV_EMAILS.includes(userEmail)

    // 📱 Triple-tap gesture to reveal DEV button (mobile-friendly)
    const [devVisible, setDevVisible] = useState(false)
    const [debugToast, setDebugToast] = useState<{ message: string; details: string } | null>(null)
    const tapCountRef = useRef(0)
    const lastTapTimeRef = useRef(0)

    // 🔧 DEV PANEL: Test states (one-time use per session)
    const [devTestInitialDone, setDevTestInitialDone] = useState(false)
    const [devTestInChatDone, setDevTestInChatDone] = useState(false)
    const [devTestSelfContDone, setDevTestSelfContDone] = useState(false)
    const [devTestRunning, setDevTestRunning] = useState<'initial' | 'inchat' | 'selfcont' | null>(null)

    const handleLockIconTap = useCallback(() => {
        // Only DEV users can trigger this
        if (!isDevUser) return

        const now = Date.now()
        const timeDiff = now - lastTapTimeRef.current

        // Reset if too slow (> 2 seconds between taps)
        if (timeDiff > 2000) {
            tapCountRef.current = 1
        } else {
            tapCountRef.current += 1
        }

        lastTapTimeRef.current = now

        // Triple tap detected!
        if (tapCountRef.current >= 3) {
            setDevVisible(prev => !prev)
            tapCountRef.current = 0
            console.log(`[MessagesApp] 🔧 DEV mode: ${!devVisible ? 'VISIBLE' : 'HIDDEN'} (triple-tap by ${userEmail})`)
        }
    }, [isDevUser, devVisible, userEmail])

    // 🧪 DEV TEST 1: Initial Messages Generation
    const runDevTestInitial = useCallback(async () => {
        if (devTestInitialDone || devTestRunning) return

        console.log('%c🔓 [DEV TEST 1/3] INITIAL MESSAGES BYPASS', 'background: #FF6B00; color: white; font-size: 14px; padding: 4px 8px; border-radius: 4px;')
        console.log('%c📍 Bypassing message threshold check...', 'color: #FF6B00; font-weight: bold;')
        console.log(`%c📍 Character: ${characterName}`, 'color: #FF6B00;')
        console.log('%c📍 Expected: LOCKED screen → conversation list appears', 'color: #22C55E; font-weight: bold;')

        setDevTestRunning('initial')
        setLoading(true)

        try {
            const response = await fetch('/api/phone/generate-messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    characterId,
                    characterName: characterName || 'Character',
                    characterDescription: characterDescription || '',
                    userLanguage: lang,
                    isInitial: true,
                    forceGenerate: true, // DEV bypass
                    currentMessages: conversationsRef.current,
                    userEmail: userEmail,
                }),
            })

            if (!response.ok) throw new Error('API request failed')

            const data = await response.json()
            const messages = data.messages || []

            if (messages.length > 0) {
                sessionStorage.setItem(getCacheKey(characterId), JSON.stringify(messages))
                setConversations(messages)
                setSource('ai')
                console.log(`%c✅ [DEV TEST 1/3] SUCCESS! Generated ${messages.length} conversations`, 'color: #22C55E; font-weight: bold; font-size: 14px;')
                setDevTestInitialDone(true)
            } else {
                console.log('%c⚠️ [DEV TEST 1/3] AI returned empty messages', 'color: #EAB308; font-weight: bold;')
            }
        } catch (err: unknown) {
            console.error('%c❌ [DEV TEST 1/3] FAILED!', 'background: #EF4444; color: white; font-size: 14px; padding: 4px 8px; border-radius: 4px;')
            console.error(err)
        } finally {
            setLoading(false)
            setDevTestRunning(null)
        }
    }, [devTestInitialDone, devTestRunning, characterId, characterName, characterDescription, lang, userEmail])

    // 🧪 DEV TEST 2: In-Chat Instant Reply
    const runDevTestInChat = useCallback(() => {
        if (devTestInChatDone || devTestRunning) return

        console.log('%c💬 [DEV TEST 2/3] IN-CHAT INSTANT REPLY', 'background: #3B82F6; color: white; font-size: 14px; padding: 4px 8px; border-radius: 4px;')
        console.log('%c📍 Instruction: Open any conversation, send a message', 'color: #3B82F6; font-weight: bold;')
        console.log('%c📍 Expected: AI replies within 2-10 seconds (dev cooldown)', 'color: #22C55E; font-weight: bold;')
        console.log('%c📍 Watch for console log: "User in active chat - INSTANT REPLY"', 'color: #3B82F6;')

        setDevTestRunning('inchat')

        // Enable fast polling mode to catch AI reply quickly
        setFastPollingMode(true)
        console.log('%c⚡ Fast polling enabled (2s interval) for 30s', 'color: #3B82F6; font-style: italic;')

        // Mark as done after 5 seconds (enough time for user to see the effect)
        setTimeout(() => {
            console.log('%c✅ [DEV TEST 2/3] In-Chat mode activated. Now send a message and wait for AI reply.', 'color: #22C55E; font-weight: bold; font-size: 14px;')
            setDevTestInChatDone(true)
            setDevTestRunning(null)
        }, 5000)
    }, [devTestInChatDone, devTestRunning])

    // 🧪 DEV TEST 3: Self-Continuation
    const runDevTestSelfCont = useCallback(async () => {
        if (devTestSelfContDone || devTestRunning || conversations.length === 0) return

        console.log('%c🔄 [DEV TEST 3/3] SELF-CONTINUATION BYPASS', 'background: #8B5CF6; color: white; font-size: 14px; padding: 4px 8px; border-radius: 4px;')
        console.log('%c📍 Triggering AI follow-up for all conversations...', 'color: #8B5CF6; font-weight: bold;')
        console.log('%c📍 Expected: AI generates new messages even without user reply', 'color: #22C55E; font-weight: bold;')

        setDevTestRunning('selfcont')

        let successCount = 0

        for (const conv of conversations) {
            // Skip notification contacts
            const lowerName = conv.name.toLowerCase()
            const isNotification = ['ngân hàng', 'bank', 'shopee', 'lazada', 'grab', 'momo', 'zalopay']
                .some(keyword => lowerName.includes(keyword))

            if (isNotification) {
                console.log(`%c⏭️ Skipping notification contact: ${conv.name}`, 'color: #6B7280; font-style: italic;')
                continue
            }

            try {
                const response = await fetch('/api/phone/get-conversation-detail', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        characterId: characterId,
                        senderName: conv.name,
                        characterName: characterName,
                        characterDescription: characterDescription,
                        forceRegenerate: true, // DEV bypass cooldown
                        userEmail: userEmail,
                        userLanguage: lang,
                    }),
                })

                if (response.ok) {
                    const data = await response.json()
                    if (data.regenerated) {
                        successCount++
                        console.log(`%c✓ AI self-continuation for ${conv.name}`, 'color: #22C55E; font-weight: bold;')
                    }
                }
            } catch (err) {
                console.warn(`Self-continuation failed for ${conv.name}:`, err)
            }
        }

        // Refresh list to show new messages
        console.log(`%c🔄 Refreshing conversation list to show ${successCount} new AI messages...`, 'color: #8B5CF6; font-weight: bold;')
        // Note: We can't use fetchMessages here due to hook order, so manually refresh
        window.location.reload() // Simple refresh to show new messages

        console.log(`%c✅ [DEV TEST 3/3] SUCCESS! Generated ${successCount} self-continuation messages`, 'color: #22C55E; font-weight: bold; font-size: 14px;')
        setDevTestSelfContDone(true)
        setDevTestRunning(null)
    }, [devTestSelfContDone, devTestRunning, conversations, characterId, characterName, characterDescription, userEmail, lang])

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
            // 🔥 STEP 1: Always try to fetch EXISTING conversations from database first
            console.log(`[MessagesApp] 📖 Fetching existing conversations from DB...`)
            const dbRes = await fetch(`/api/phone/get-conversations?characterId=${characterId}`)

            if (dbRes.ok) {
                const dbData = await dbRes.json()
                const existingConversations = dbData.conversations || []

                console.log(`[MessagesApp] ✅ Loaded ${existingConversations.length} conversations from DB`)

                if (existingConversations.length > 0) {
                    // 🎉 We have real conversations in DB - show them!
                    setConversations(existingConversations)
                    setSource('cached') // Mark as cached/database data
                    sessionStorage.setItem(getCacheKey(characterId), JSON.stringify(existingConversations))
                    setLoading(false)

                    // If forceRefresh, also trigger AI to generate MORE messages
                    if (forceRefresh) {
                        console.log(`[MessagesApp] 🔄 Force refresh: Requesting more AI messages...`)
                        // Fire-and-forget AI generation in background
                        fetch('/api/phone/generate-messages', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                characterId,
                                characterName: characterName || 'Character',
                                characterDescription: characterDescription || '',
                                userLanguage: lang,
                                isInitial: false,
                                forceGenerate: forceRefresh,
                                currentMessages: existingConversations,
                                userEmail: userEmail,
                            }),
                        }).then(async (res) => {
                            if (res.ok) {
                                const data = await res.json()
                                if (data.messages?.length > 0) {
                                    const merged = mergeMessages(conversationsRef.current, data.messages)
                                    setConversations(merged)
                                    sessionStorage.setItem(getCacheKey(characterId), JSON.stringify(merged))
                                    setSource('ai')
                                }
                            }
                        }).catch(err => console.error('[MessagesApp] Background AI error:', err))
                    }
                    return
                }
            }

            // 🔒 STEP 2: No conversations in DB - check if we should generate or show Locked
            // Check cache first (unless force refresh)
            const cachedData = sessionStorage.getItem(getCacheKey(characterId))

            if (!forceRefresh && cachedData) {
                console.log(`[MessagesApp] Using cached data`)
                setConversations(JSON.parse(cachedData))
                setSource('cached')
                setLoading(false)
                return
            }

            // 🔒 LOCKED DEFAULT LOGIC:
            // If no DB data AND not forceRefresh -> Show Locked State, DON'T call AI
            if (!forceRefresh) {
                console.log('[MessagesApp] 🔒 No DB data, no force refresh -> Showing LOCKED state')
                setConversations([])
                setSource('empty')
                setLoading(false)
                return
            }

            // 🔥 STEP 3: forceRefresh is true - Generate initial messages via AI
            console.log(`[MessagesApp] 🤖 No DB data, generating via AI...`)
            const response = await fetch('/api/phone/generate-messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    characterId,
                    characterName: characterName || 'Character',
                    characterDescription: characterDescription || '',
                    userLanguage: lang,
                    isInitial: true,
                    forceGenerate: true,
                    currentMessages: conversationsRef.current,
                    userEmail: userEmail,
                }),
            })

            if (!response.ok) {
                throw new Error('API request failed')
            }

            const data = await response.json()
            const incomingMessages = data.messages || []

            // Merge with existing (if any)
            const mergedMessages = mergeMessages(conversationsRef.current, incomingMessages)

            // Update cache with merged data
            if (mergedMessages.length > 0) {
                sessionStorage.setItem(getCacheKey(characterId), JSON.stringify(mergedMessages))
                sessionStorage.setItem(getCountKey(characterId), messageCount.toString())
            }

            setConversations(mergedMessages)
            setSource(data.source === 'ai' ? 'ai' : data.source === 'empty' ? 'empty' : 'fallback')

        } catch (error) {
            console.error('[MessagesApp] Failed to fetch:', error)
            // Try to use cache on error
            const cachedData = sessionStorage.getItem(getCacheKey(characterId))
            if (cachedData) {
                setConversations(JSON.parse(cachedData))
                setSource('cached')
            } else {
                // No cache, no messages - show Locked State
                setConversations([])
                setSource('empty')
            }
        } finally {
            setLoading(false)
            setIsRefreshing(false)
        }
    }, [characterId, characterName, characterDescription, messageCount, lang, userEmail])

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

    // Handle conversation click - mark as read
    const handleConversationClick = (conv: ConversationItem) => {
        // 1. Update local state: Set unread to 0 for this conversation
        const updatedConversations = conversations.map(c =>
            c.id === conv.id ? { ...c, unread: 0 } : c
        )
        setConversations(updatedConversations)

        // 2. Update Cache (SessionStorage) to persist read status
        sessionStorage.setItem(getCacheKey(characterId), JSON.stringify(updatedConversations))

        // 3. Open conversation detail with unread set to 0
        setSelectedConversation({ ...conv, unread: 0 })
    }

    // 🎭 Handle user reply - sync to parent state for Continuity
    const handleUserReply = useCallback((senderName: string, messageText: string) => {
        console.log(`[MessagesApp] 🎭 User replied to ${senderName}: "${messageText.slice(0, 50)}..."`)

        // Update the conversation with user's message as lastMessage
        setConversations(prev => prev.map(conv =>
            conv.name === senderName
                ? {
                    ...conv,
                    lastMessage: messageText, // User's message becomes the last message
                    time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                    unread: 0 // Clear unread since user just replied
                }
                : conv
        ))

        // Update cache immediately
        setConversations(current => {
            const updated = current.map(conv =>
                conv.name === senderName
                    ? { ...conv, lastMessage: messageText, time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) }
                    : conv
            )
            sessionStorage.setItem(getCacheKey(characterId), JSON.stringify(updated))
            return current // Don't change state again, just update cache
        })

        // 📡 Enable fast polling to catch AI reply quickly
        console.log('[MessagesApp] 📡 Enabling fast polling mode (2s) to catch AI reply...')
        setFastPollingMode(true)

        // Clear any existing timeout
        if (fastPollingTimeoutRef.current) {
            clearTimeout(fastPollingTimeoutRef.current)
        }

        // Return to normal polling after 30s
        fastPollingTimeoutRef.current = setTimeout(() => {
            console.log('[MessagesApp] 📡 Fast polling ended, returning to normal mode')
            setFastPollingMode(false)
        }, 30000)
    }, [characterId])

    // 📡 PASSIVE SYNC: Polling to catch AI replies
    useEffect(() => {
        if (!characterId || loading) return

        const pollInterval = fastPollingMode ? 2000 : 10000 // 2s fast, 10s normal
        console.log(`[MessagesApp] 📡 Polling mode: ${fastPollingMode ? 'FAST (2s)' : 'NORMAL (10s)'}`)

        const interval = setInterval(async () => {
            if (!fastPollingMode) return // Only poll in fast mode

            console.log('[MessagesApp] 🔄 Polling for AI reply...')
            try {
                // Fetch fresh data from DB
                const response = await fetch('/api/phone/generate-messages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        characterId,
                        characterName: characterName || 'Character',
                        characterDescription: characterDescription || '',
                        userLanguage: lang,
                        isInitial: false,
                        forceGenerate: false,
                        currentMessages: conversationsRef.current,
                        userEmail: userEmail,
                    }),
                })

                if (response.ok) {
                    const data = await response.json()
                    const incomingMessages = data.messages || []

                    if (incomingMessages.length > 0) {
                        const mergedMessages = mergeMessages(conversationsRef.current, incomingMessages)
                        if (mergedMessages.length > conversationsRef.current.length) {
                            console.log('[MessagesApp] ✅ New messages detected, updating list')
                            setConversations(mergedMessages)
                            sessionStorage.setItem(getCacheKey(characterId), JSON.stringify(mergedMessages))
                        }
                    }
                }
            } catch (err) {
                console.error('[MessagesApp] Polling error:', err)
            }
        }, pollInterval)

        return () => clearInterval(interval)
    }, [characterId, fastPollingMode, loading, characterName, characterDescription, lang, userEmail])

    // 🤖 AI SELF-CONTINUATION POLLING
    // Check if any conversation needs AI follow-up (user hasn't replied after cooldown)
    useEffect(() => {
        if (!characterId || conversations.length === 0 || loading) return

        // Notification contact filter
        const isNotificationContact = (name: string): boolean => {
            const lower = name.toLowerCase()
            const keywords = ['ngân hàng', 'bank', 'shopee', 'lazada', 'grab', 'momo', 'zalopay']
            return keywords.some(keyword => lower.includes(keyword))
        }

        // Poll every 30 seconds for AI self-continuation
        const interval = setInterval(async () => {
            console.log('[MessagesApp] 🔍 Checking for AI self-continuation opportunities...')

            let continuationCount = 0

            for (const conv of conversations) {
                // Skip notification contacts
                if (isNotificationContact(conv.name)) {
                    continue
                }

                try {
                    // Trigger AI continuation check via get-conversation-detail
                    // The API will determine if cooldown has passed and if last message was from AI
                    const response = await fetch('/api/phone/get-conversation-detail', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            characterId: characterId,
                            senderName: conv.name,
                            characterName: characterName,
                            characterDescription: characterDescription,
                            forceRegenerate: true, // Trigger AI check
                            userEmail: userEmail,
                            userLanguage: lang
                        })
                    })

                    if (response.ok) {
                        const data = await response.json()

                        if (data.regenerated) {
                            console.log(`[MessagesApp] ✅ AI self-continuation generated for ${conv.name}`)
                            continuationCount++
                        }
                    } else if (response.status === 429) {
                        // Cooldown active - expected, skip silently
                    }
                } catch (error) {
                    // Silent fail - don't spam console
                }
            }

            // If any continuations happened, refresh the list
            if (continuationCount > 0) {
                console.log(`[MessagesApp] 🔄 Refreshing list after ${continuationCount} AI continuations`)
                fetchMessages(false)
            }
        }, 30000) // Check every 30 seconds

        return () => clearInterval(interval)
    }, [conversations, characterId, characterName, characterDescription, userEmail, lang, loading, fetchMessages])

    // If a conversation is selected, show the detail view
    if (selectedConversation) {
        return (
            <MessageDetail
                onBack={() => setSelectedConversation(null)}
                senderName={selectedConversation.name}
                senderAvatar={selectedConversation.avatar}
                characterId={characterId}
                characterName={characterName}
                characterDescription={characterDescription}
                lastMessagePreview={selectedConversation.lastMessage}
                onUserReply={handleUserReply}
                onConversationUpdate={() => {
                    // ✅ Reload conversation list to show updated preview (AI reply)
                    console.log('[MessagesApp] 🔄 Reloading conversation list after AI reply...')
                    fetchMessages(true)
                }}
                userEmail={userEmail}
            />
        )
    }

    return (
        <div className="flex flex-col h-full bg-white">
            {/* 🚨 DEV DEBUG TOAST - Only for dev users */}
            {debugToast && isDevUser && (
                <div
                    className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] max-w-[90vw] bg-red-600 text-white px-4 py-3 rounded-lg shadow-2xl cursor-pointer animate-pulse"
                    onClick={() => setDebugToast(null)}
                >
                    <div className="font-bold text-sm">{debugToast.message}</div>
                    <div className="text-xs opacity-90 mt-1 font-mono break-all">{debugToast.details}</div>
                    <div className="text-[10px] opacity-70 mt-2">Tap to dismiss</div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center gap-2 px-2 py-3 border-b border-gray-100 bg-[#FFF9F0]">
                <button
                    onClick={onBack}
                    className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/50 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6 text-gray-600" />
                </button>
                <h2 className="text-lg font-semibold text-gray-800">{t.phone.messagesTitle}</h2>

                {/* Source badge */}
                {source === 'ai' && (
                    <span className="text-[10px] text-green-500 bg-green-50 px-2 py-0.5 rounded-full">
                        {t.phone.newBadge}
                    </span>
                )}
                {source === 'cached' && (
                    <span className="text-[10px] text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">
                        {t.phone.cachedBadge}
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
                    title={cooldownRemaining > 0 ? t.phone.waitSeconds.replace('{n}', String(cooldownRemaining)) : t.phone.refreshTitle}
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
                        {t.phone.cachedNotice.replace('{n}', String(MESSAGE_THRESHOLD - (messageCount - parseInt(sessionStorage.getItem(getCountKey(characterId)) || '0'))))}
                    </p>
                </div>
            )}

            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                    <p className="text-sm text-gray-400">{t.phone.loadingMessages}</p>
                </div>
            ) : (
                /* Conversations List or Locked State */
                <div className="flex-1 overflow-y-auto">
                    {conversations.length === 0 ? (
                        /* 🔒 LOCKED STATE - Beautiful empty UI */
                        <div className="h-full flex flex-col items-center justify-center px-6 py-12 text-center">
                            <div
                                className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mb-4 shadow-inner cursor-pointer hover:scale-105 transition-transform"
                                onClick={handleLockIconTap}
                                title={isDevUser ? 'Triple-tap to reveal DEV tools' : undefined}
                            >
                                <span className="text-4xl">🔒</span>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                {lang === 'en' ? 'Messages Locked' : 'Tin nhắn đã khóa'}
                            </h3>
                            <p className="text-sm text-gray-500 max-w-[200px] leading-relaxed">
                                {lang === 'en'
                                    ? `Chat more with ${characterName} to unlock their private messages!`
                                    : `Hãy trò chuyện nhiều hơn với ${characterName} để mở khóa tin nhắn riêng tư!`
                                }
                            </p>
                            <div className="mt-6 px-4 py-2 bg-gradient-to-r from-pink-50 to-purple-50 rounded-full">
                                <span className="text-xs text-purple-600">
                                    {lang === 'en' ? '💬 Keep chatting to unlock!' : '💬 Tiếp tục trò chuyện nhé!'}
                                </span>
                            </div>

                            {/* 🛠️ DEV PANEL - Permanent test interface for dev users */}
                            {isDevUser && (
                                <div className="mt-8 border-t-2 border-orange-300 pt-4">
                                    <div className="flex items-center justify-center gap-2 mb-3">
                                        <span className="text-xs font-bold text-orange-600">🔧 DEV TEST PANEL</span>
                                        <span className="text-[10px] text-gray-500">
                                            {devTestInitialDone && devTestInChatDone && devTestSelfContDone
                                                ? '✅ All tests complete'
                                                : `${[devTestInitialDone, devTestInChatDone, devTestSelfContDone].filter(Boolean).length}/3 done`}
                                        </span>
                                    </div>

                                    <div className="space-y-2 px-4">
                                        {/* Test 1: Initial Messages */}
                                        <button
                                            onClick={runDevTestInitial}
                                            disabled={devTestInitialDone || devTestRunning !== null || loading}
                                            className={`w-full px-3 py-2 text-xs font-medium rounded-lg transition-all ${devTestInitialDone
                                                ? 'bg-green-100 text-green-700 cursor-not-allowed'
                                                : devTestRunning === 'initial'
                                                    ? 'bg-orange-200 text-orange-800 animate-pulse'
                                                    : 'bg-orange-500 hover:bg-orange-600 text-white'
                                                }`}
                                        >
                                            {devTestInitialDone
                                                ? '✅ 1. Initial Messages (Done)'
                                                : devTestRunning === 'initial'
                                                    ? '⏳ Running Test 1...'
                                                    : '🔓 1. Test Initial Unlock'}
                                        </button>

                                        {/* Test 2: In-Chat Reply */}
                                        <button
                                            onClick={runDevTestInChat}
                                            disabled={devTestInChatDone || devTestRunning !== null || conversations.length === 0}
                                            className={`w-full px-3 py-2 text-xs font-medium rounded-lg transition-all ${devTestInChatDone
                                                ? 'bg-green-100 text-green-700 cursor-not-allowed'
                                                : devTestRunning === 'inchat'
                                                    ? 'bg-blue-200 text-blue-800 animate-pulse'
                                                    : conversations.length === 0
                                                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                                                }`}
                                        >
                                            {devTestInChatDone
                                                ? '✅ 2. In-Chat Reply (Done)'
                                                : devTestRunning === 'inchat'
                                                    ? '⏳ Running Test 2...'
                                                    : conversations.length === 0
                                                        ? '🔒 2. In-Chat Reply (unlock first)'
                                                        : '💬 2. Test In-Chat Reply'}
                                        </button>

                                        {/* Test 3: Self-Continuation */}
                                        <button
                                            onClick={runDevTestSelfCont}
                                            disabled={devTestSelfContDone || devTestRunning !== null || conversations.length === 0}
                                            className={`w-full px-3 py-2 text-xs font-medium rounded-lg transition-all ${devTestSelfContDone
                                                ? 'bg-green-100 text-green-700 cursor-not-allowed'
                                                : devTestRunning === 'selfcont'
                                                    ? 'bg-purple-200 text-purple-800 animate-pulse'
                                                    : conversations.length === 0
                                                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                                        : 'bg-purple-500 hover:bg-purple-600 text-white'
                                                }`}
                                        >
                                            {devTestSelfContDone
                                                ? '✅ 3. Self-Continuation (Done)'
                                                : devTestRunning === 'selfcont'
                                                    ? '⏳ Running Test 3...'
                                                    : conversations.length === 0
                                                        ? '🔒 3. Self-Continuation (unlock first)'
                                                        : '🔄 3. Test Self-Continuation'}
                                        </button>
                                    </div>

                                    <p className="text-[10px] text-center text-gray-500 mt-3 px-4">
                                        Each test runs once to prove the flow. Check console for detailed logs.
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        conversations.map((conv) => (
                            <button
                                key={conv.id}
                                onClick={() => handleConversationClick(conv)}
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
                        ))
                    )}
                </div>
            )}

            {/* Footer hint */}
            <div className="px-4 py-2 border-t border-gray-100 text-center bg-[#FFF9F0]">
                <p className="text-[10px] text-gray-400">
                    {source === 'ai'
                        ? t.phone.aiGenerated.replace('{character}', characterName || 'character')
                        : source === 'cached'
                            ? t.phone.cachedSession
                            : t.phone.simulatedMessages}
                </p>
            </div>
        </div>
    )
}
