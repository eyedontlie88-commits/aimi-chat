'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import MessageBubble from '@/components/MessageBubble'
import PhoneCheckModal, { type PhoneCheckData } from '@/components/PhoneCheckModal'
import MemoryViewer from '@/components/MemoryViewer'
import CreateMemoryModal, { type MemoryData } from '@/components/CreateMemoryModal'
import CharacterSettingsModal from '@/components/CharacterSettingsModal'
import HeartToast from '@/components/HeartToast'
import DevRelationshipTools from '@/components/DevRelationshipTools'
import type { SiliconPresetModel } from '@/lib/llm/silicon-presets'
import { getResolvedTheme, ChatTextMode, ChatThemeId } from '@/lib/ui/chatThemes'

// Intimacy level labels and emojis
const LEVEL_LABELS = ['Người lạ', 'Đã biết', 'Thân quen', 'Người yêu', 'Rất thân']
const LEVEL_EMOJIS = ['🙂', '😊', '🤝', '💖', '💍']

interface RelationshipConfig {
    intimacyLevel: number
    affectionPoints: number
    messageCount: number
    status: string
}

interface Character {
    id: string
    name: string
    avatarUrl: string
    provider?: string | null
    modelName?: string | null
    relationshipConfig?: RelationshipConfig
}

interface Message {
    id: string
    role: string
    content: string
    createdAt: string
    replyToMessageId?: string | null
    replyTo?: {
        id: string
        role: string
        content: string
    } | null
    reactionType?: string | null // NONE | LIKE | HEARTBEAT
}

interface Memory {
    id: string
    type: string
    content: string
    importanceScore: number
    createdAt: string
    characterId: string
    sourceMessageId: string | null
    category: string
    visibility: string
}

export default function ChatPage({ params }: { params: { characterId: string } }) {
    const router = useRouter()
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const messagesContainerRef = useRef<HTMLDivElement>(null)
    const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map())

    const [character, setCharacter] = useState<Character | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [memories, setMemories] = useState<Memory[]>([])
    const [inputMessage, setInputMessage] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isPhoneCheckOpen, setIsPhoneCheckOpen] = useState(false)
    const [isMemoryViewerOpen, setIsMemoryViewerOpen] = useState(false)
    const [isCreateMemoryOpen, setIsCreateMemoryOpen] = useState(false)
    const [selectedMessageForMemory, setSelectedMessageForMemory] = useState<string>('')
    const [isResetting, setIsResetting] = useState(false)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [siliconPresets, setSiliconPresets] = useState<SiliconPresetModel[]>([])
    const [themeId, setThemeId] = useState<ChatThemeId>('midnight')
    const [textMode, setTextMode] = useState<ChatTextMode>('auto')

    // Relationship state (updated after each message)
    const [affectionPoints, setAffectionPoints] = useState(0)
    const [intimacyLevel, setIntimacyLevel] = useState(0)
    const [relationshipStage, setRelationshipStage] = useState<string>('UNDEFINED')

    // Scroll helper state (single state for position)
    const [scrollPosition, setScrollPosition] = useState<'top' | 'middle' | 'bottom'>('bottom')

    // Search state
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<Message[]>([])
    const [highlightedId, setHighlightedId] = useState<string | null>(null)

    // Reply state
    const [replyTarget, setReplyTarget] = useState<Message | null>(null)

    // Heart reaction toast state
    const [heartToast, setHeartToast] = useState<{ show: boolean; charName: string }>({ show: false, charName: '' })
    // P0.3: Toast cooldown - prevent spam (8 seconds between toasts)
    const lastToastTimeRef = useRef<number>(0)
    const TOAST_COOLDOWN_MS = 8000

    // Dev force reaction (development only)
    const [devForceReaction, setDevForceReaction] = useState<'OFF' | 'LIKE' | 'HEARTBEAT'>('OFF')
    const isDev = process.env.NODE_ENV !== 'production'

    // TASK B: Micro-feedback for impact display
    const [impactFeedback, setImpactFeedback] = useState<{ value: number; show: boolean }>({ value: 0, show: false })

    useEffect(() => {
        loadCharacter()
        loadMessages()
        loadMemories()
        loadSiliconPresets()
        loadTheme()
    }, [params.characterId])

    useEffect(() => {
        scrollToBottom()
    }, [messages.length])

    // Scroll handler for helper buttons
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget
        const { scrollTop, scrollHeight, clientHeight } = target

        const threshold = 16
        const atTop = scrollTop <= threshold
        const atBottom = scrollTop + clientHeight >= scrollHeight - threshold

        if (atTop) {
            if (scrollPosition !== 'top') setScrollPosition('top')
        } else if (atBottom) {
            if (scrollPosition !== 'bottom') setScrollPosition('bottom')
        } else {
            if (scrollPosition !== 'middle') setScrollPosition('middle')
        }
    }

    const scrollToBottom = () => {
        const el = messagesContainerRef.current
        if (!el) return
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }

    const scrollToTop = () => {
        const el = messagesContainerRef.current
        if (!el) return
        el.scrollTo({ top: 0, behavior: 'smooth' })
    }

    // Message ref setter for scroll-to-message
    const setMessageRef = (id: string) => (el: HTMLDivElement | null) => {
        const map = messageRefs.current
        if (el) map.set(id, el)
        else map.delete(id)
    }

    // Search functions
    const runSearch = () => {
        const q = searchQuery.trim().toLowerCase()
        if (!q) {
            setSearchResults([])
            return
        }
        const results = messages.filter((m) => m.content.toLowerCase().includes(q))
        setSearchResults(results.slice(0, 50))
    }

    const jumpToMessage = (id: string) => {
        const el = messageRefs.current.get(id)
        const container = messagesContainerRef.current
        if (!el || !container) return

        const targetTop = el.offsetTop - 80
        container.scrollTo({ top: targetTop, behavior: 'smooth' })
        setHighlightedId(id)
        setTimeout(() => setHighlightedId(null), 2500)
        setIsSearchOpen(false)
    }

    // Reply handler
    const handleReply = (m: Message) => {
        setReplyTarget(m)
    }


    const loadCharacter = async () => {
        try {
            const res = await fetch(`/api/characters/${params.characterId}`)
            const data = await res.json()
            setCharacter(data.character)

            // Initialize relationship stats from character data
            if (data.character?.relationshipConfig) {
                setAffectionPoints(data.character.relationshipConfig.affectionPoints || 0)
                setIntimacyLevel(data.character.relationshipConfig.intimacyLevel || 0)
                setRelationshipStage(data.character.relationshipConfig.stage || 'UNDEFINED')
            }
        } catch (error) {
            console.error('Error loading character:', error)
        }
    }

    const loadSiliconPresets = async () => {
        try {
            const res = await fetch('/api/silicon-presets')
            const data = await res.json()
            setSiliconPresets(data.presets || [])
        } catch (error) {
            console.error('Error loading silicon presets:', error)
        }
    }

    const loadTheme = async () => {
        try {
            const res = await fetch('/api/user-profile')
            const data = await res.json()
            if (data.profile?.chatTheme) {
                setThemeId(data.profile.chatTheme as ChatThemeId)
            }
            if (data.profile?.chatTextTone) {
                setTextMode(data.profile.chatTextTone as ChatTextMode)
            }
            console.log('[ChatPage] Loaded theme:', data.profile?.chatTheme, 'textMode:', data.profile?.chatTextTone)
        } catch (error) {
            console.error('Error loading theme:', error)
        }
    }

    const loadMessages = async () => {
        try {
            const res = await fetch(`/api/messages?characterId=${params.characterId}&limit=50`)
            const data = await res.json()
            setMessages(data.messages)
        } catch (error) {
            console.error('Error loading messages:', error)
        }
    }

    const loadMemories = async () => {
        try {
            const res = await fetch(`/api/memories?characterId=${params.characterId}`)
            const data = await res.json()
            setMemories(data.memories)
        } catch (error) {
            console.error('Error loading memories:', error)
        }
    }

    const sendMessage = async (sceneState?: any) => {
        if (!inputMessage.trim() && !sceneState) return

        setIsLoading(true)
        const userMessage = inputMessage

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    characterId: params.characterId,
                    message: sceneState
                        ? `[Phone check scene] ${sceneState.description}`
                        : userMessage,
                    sceneState,
                    replyToMessageId: replyTarget?.id || null,
                    // Dev force reaction (only sent if not OFF and in dev mode)
                    ...(isDev && devForceReaction !== 'OFF' && { devForceReaction }),
                }),
            })

            if (!res.ok) {
                const errorBody = await res.json().catch(() => null)
                console.error('Send message error:', errorBody)
                throw new Error(errorBody?.detail || 'AI không trả lời được')
            }

            const data = await res.json()

            // Update relationship stats from response
            if (data.relationship) {
                setAffectionPoints(data.relationship.affectionPoints)
                setIntimacyLevel(data.relationship.intimacyLevel)
                setRelationshipStage(data.relationship.stage || 'UNDEFINED')
            }

            // TASK B: Show micro-feedback for impact (+6❤️ / -3💔)
            if (typeof data.impactScaled === 'number' && data.impactScaled !== 0) {
                setImpactFeedback({ value: data.impactScaled, show: true })
                setTimeout(() => setImpactFeedback(prev => ({ ...prev, show: false })), 1500)
            }

            // Show heart toast if reaction is HEARTBEAT (with cooldown to prevent spam)
            if (data.reaction === 'HEARTBEAT' && character) {
                const now = Date.now()
                if (now - lastToastTimeRef.current >= TOAST_COOLDOWN_MS) {
                    lastToastTimeRef.current = now
                    setHeartToast({ show: true, charName: character.name })
                }
            }

            // Reload messages to get the new ones
            await loadMessages()
            setInputMessage('')
            setReplyTarget(null)
            setIsPhoneCheckOpen(false)
        } catch (error: any) {
            console.error('Error sending message:', error)
            alert(`AI không trả lời được (lỗi máy chủ). Bạn thử nhắn lại sau một chút nhé.\n\nChi tiết: ${error?.message || 'Unknown error'}`)
        } finally {
            setIsLoading(false)
        }
    }

    const handlePhoneCheck = async (data: PhoneCheckData) => {
        const sceneState = {
            type: 'phone_check',
            description: `${character?.name} đang kiểm tra điện thoại của bạn và thấy: "${data.discovery ?? data.description}" 
            Bối cảnh: ${data.context ?? data.app}
            ${data.additionalInfo ? `Chi tiết thêm: ${data.additionalInfo}` : ''}${data.isSuspicious ? ' (Có điều đáng ngờ!)' : ''}`,
            severity: data.severity ?? (data.isSuspicious ? 3 : 1),
        }
        setInputMessage('')
        await sendMessage(sceneState)
    }

    const handleResetChat = async () => {
        const confirmed = confirm(
            '⚠️ RESET TOÀN BỘ CÂU CHUYỆN\n\n' +
            'Bạn có chắc muốn:\n' +
            '• Xoá toàn bộ tin nhắn\n' +
            '• Xoá tất cả ký ức\n' +
            '• Reset mối quan hệ về STRANGER\n' +
            '• Reset điểm tình cảm về 0\n\n' +
            'Hành động này không thể hoàn tác!'
        )
        if (!confirmed) return

        setIsResetting(true)
        try {
            const res = await fetch(`/api/messages?characterId=${params.characterId}`, {
                method: 'DELETE',
            })
            if (!res.ok) throw new Error('Failed to reset')

            const data = await res.json()

            // Reset all local state from API response
            setMessages([])
            setMemories([])

            // Reset relationship state from response
            if (data.relationship) {
                setAffectionPoints(data.relationship.affectionPoints)
                setIntimacyLevel(data.relationship.intimacyLevel)
                setRelationshipStage(data.relationship.stage)
            } else {
                // Fallback reset
                setAffectionPoints(0)
                setIntimacyLevel(0)
                setRelationshipStage('STRANGER')
            }

            // Reset dev force reaction
            setDevForceReaction('OFF')

            // Clear any pending toast
            setHeartToast({ show: false, charName: '' })
            lastToastTimeRef.current = 0

            console.log('[ChatPage] ✅ Reset complete:', data.relationship)
        } catch (error) {
            console.error('Error resetting chat:', error)
            alert('Không thể reset. Vui lòng thử lại.')
        } finally {
            setIsResetting(false)
        }
    }

    const handleDeleteMemory = async (memoryId: string) => {
        try {
            const res = await fetch(`/api/memories?id=${memoryId}`, {
                method: 'DELETE',
            })
            if (!res.ok) throw new Error('Failed to delete memory')
            loadMemories()
        } catch (error) {
            console.error('Error deleting memory:', error)
        }
    }

    const openCreateMemory = (messageContent?: string) => {
        setSelectedMessageForMemory(messageContent || '')
        setIsCreateMemoryOpen(true)
    }

    const handleCreateMemory = async (data: MemoryData) => {
        try {
            const res = await fetch('/api/memories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    characterId: params.characterId,
                    ...data,
                }),
            })
            if (!res.ok) throw new Error('Failed to create memory')
            loadMemories()
            setIsCreateMemoryOpen(false)
        } catch (error) {
            console.error('Error creating memory:', error)
        }
    }

    if (!character) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-pulse text-gray-400">Đang tải...</div>
            </div>
        )
    }

    // Get resolved theme with all text classes computed
    const theme = getResolvedTheme(themeId, textMode)

    return (
        <>
            {/* Fixed container covering viewport from nav to bottom - hides footer */}
            <div className={`fixed top-16 left-0 right-0 bottom-0 flex flex-col z-10 ${theme.layout.messagesBg}`}>
                {/* Header - fixed at top with solid bg */}
                <div className={`shrink-0 border-b backdrop-blur-md px-4 py-3 ${theme.layout.headerBg} ${theme.layout.headerBorder} ${theme.resolvedHeaderText}`}>
                    <div className="max-w-4xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => router.back()}
                                className={`opacity-80 hover:opacity-100 transition-opacity ${theme.resolvedHeaderText}`}
                            >
                                ← Quay lại
                            </button>
                            <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-primary/30">
                                <Image src={character.avatarUrl} alt={character.name} fill unoptimized />
                            </div>
                            <div>
                                <h2 className="font-semibold text-white">{character.name}</h2>
                                {/* Affection Bar */}
                                <div className="mt-0.5 text-xs text-slate-300">
                                    <div className="flex items-center gap-2">
                                        <span>{LEVEL_EMOJIS[intimacyLevel]} {LEVEL_LABELS[intimacyLevel]}</span>
                                        <span className="text-[11px] text-slate-400">
                                            {affectionPoints}/100
                                        </span>
                                        {/* TASK B: Micro-feedback (+6❤️ / -3💔) */}
                                        {impactFeedback.show && (
                                            <span
                                                className={`text-[11px] font-bold animate-pulse transition-opacity ${impactFeedback.value > 0 ? 'text-green-400' : 'text-red-400'
                                                    }`}
                                            >
                                                {impactFeedback.value > 0 ? `+${impactFeedback.value}❤️` : `${impactFeedback.value}💔`}
                                            </span>
                                        )}
                                    </div>
                                    <div className="w-32 h-1.5 bg-white/20 rounded-full overflow-hidden mt-1">
                                        <div
                                            className="h-full bg-pink-400 transition-all duration-500"
                                            style={{ width: `${Math.min(100, affectionPoints)}%` }}
                                        />
                                    </div>
                                    <div className="mt-1 flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-pink-300">
                                        STAGE: {relationshipStage}
                                    </div>
                                </div>
                                {/* Model Info */}
                                <div className="mt-1 text-[10px] text-slate-400">
                                    Model: {character.provider || 'mặc định'} · {character.modelName || 'default'}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsSettingsOpen(true)}
                                className={`flex items-center gap-1 px-4 py-2 rounded-xl text-sm transition ${theme.buttons.primaryBg} ${theme.resolvedButtonText} ${theme.buttons.primaryHover}`}
                            >
                                ⚙️ Settings
                            </button>
                            <button
                                onClick={() => setIsSearchOpen(true)}
                                className={`flex items-center gap-1 px-4 py-2 rounded-xl text-sm transition ${theme.buttons.primaryBg} ${theme.resolvedButtonText} ${theme.buttons.primaryHover}`}
                            >
                                🔍 Tìm
                            </button>
                            <button
                                onClick={() => setIsMemoryViewerOpen(true)}
                                className={`flex items-center gap-1 px-4 py-2 rounded-xl text-sm transition ${theme.buttons.primaryBg} ${theme.resolvedButtonText} ${theme.buttons.primaryHover}`}
                            >
                                💭 Ký ức ({memories.length})
                            </button>
                            <button
                                onClick={() => setIsPhoneCheckOpen(true)}
                                className={`flex items-center gap-1 px-4 py-2 rounded-xl text-sm transition ${theme.buttons.primaryBg} ${theme.resolvedButtonText} ${theme.buttons.primaryHover}`}
                            >
                                📱 Phone Check
                            </button>
                            <button
                                onClick={handleResetChat}
                                disabled={isResetting}
                                className={`flex items-center gap-1 px-4 py-2 rounded-xl text-sm transition disabled:opacity-50 ${theme.buttons.dangerBg} ${theme.resolvedDangerText}`}
                            >
                                {isResetting ? '⏳ Đang xoá…' : '🗑️ Reset'}
                            </button>

                            {/* Dev Force Reaction Toggle (dev mode only) */}
                            {isDev && (
                                <select
                                    value={devForceReaction}
                                    onChange={(e) => setDevForceReaction(e.target.value as 'OFF' | 'LIKE' | 'HEARTBEAT')}
                                    className={`px-3 py-2 rounded-xl text-xs font-mono border ${theme.layout.inputBorder} ${theme.layout.inputBg} ${theme.input.text}`}
                                    title="🧪 Dev: Force Reaction"
                                >
                                    <option value="OFF">🧪 OFF</option>
                                    <option value="LIKE">🧪 LIKE</option>
                                    <option value="HEARTBEAT">🧪 HEARTBEAT</option>
                                </select>
                            )}
                        </div>

                        {/* TASK C: Dev Relationship Tools (dev mode only) */}
                        {isDev && (
                            <DevRelationshipTools
                                characterId={params.characterId}
                                currentStage={relationshipStage}
                                currentAffection={affectionPoints}
                                onUpdate={(data) => {
                                    setAffectionPoints(data.affectionPoints)
                                    setIntimacyLevel(data.intimacyLevel)
                                    setRelationshipStage(data.stage)
                                }}
                            />
                        )}
                    </div>
                </div>

                {/* Messages */}
                <div
                    ref={messagesContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto px-4 py-6 relative"
                >
                    <div className="max-w-4xl mx-auto space-y-4">
                        {relationshipStage === 'UNDEFINED' && (
                            <div className={`mb-6 p-4 rounded-xl ${theme.notice.bg} ${theme.notice.border} ${theme.notice.text}`}>
                                <h3 className="font-bold text-sm mb-1">⚠️ Chưa xác định được mối quan hệ</h3>
                                <p className="text-xs opacity-90">
                                    Do thông tin "bối cảnh gặp nhau" chưa rõ ràng, AI chưa biết nên cư xử với bạn như thế nào (người lạ hay người quen).
                                    <button onClick={() => setIsSettingsOpen(true)} className={`ml-1 ${theme.notice.link}`}>
                                        Cập nhật ngay
                                    </button>
                                </p>
                            </div>
                        )}
                        {messages.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <p className="text-lg mb-2">Bắt đầu cuộc trò chuyện!</p>
                                <p className="text-sm">
                                    {character.name} đang chờ nghe từ bạn 💕
                                </p>
                            </div>
                        ) : (
                            messages.map((message) => (
                                <div
                                    key={message.id}
                                    ref={setMessageRef(message.id)}
                                    className={highlightedId === message.id ? 'animate-pulse bg-white/5 rounded-xl p-1' : ''}
                                >
                                    <MessageBubble
                                        role={message.role as 'user' | 'assistant'}
                                        content={message.content}
                                        characterName={character.name}
                                        onSaveMemory={() => openCreateMemory(message.content)}
                                        onReply={() => handleReply(message)}
                                        replyTo={message.replyTo}
                                        onScrollToMessage={jumpToMessage}
                                        reactionType={message.reactionType}
                                        theme={{
                                            userBubbleBg: theme.bubbles.userBg,
                                            userBubbleText: theme.resolvedUserText,
                                            aiBubbleBg: theme.bubbles.aiBg,
                                            aiBubbleText: theme.resolvedAiText,
                                            replyBg: theme.bubbles.replyPreviewBg,
                                            replyBorder: theme.bubbles.replyPreviewBorder,
                                            replyText: theme.resolvedReplyText,
                                        }}
                                    />
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="glass px-4 py-3 rounded-2xl rounded-bl-sm">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-150"></div>
                                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-300"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Scroll helper buttons */}
                <div className="pointer-events-none fixed right-6 bottom-24 flex flex-col gap-2 z-40">
                    {(scrollPosition === 'middle' || scrollPosition === 'bottom') && (
                        <button
                            type="button"
                            onClick={scrollToTop}
                            className={`pointer-events-auto w-9 h-9 rounded-full backdrop-blur border flex items-center justify-center text-lg shadow-lg transition ${theme.helpers.scrollButtonBg} ${theme.resolvedScrollIcon} ${theme.helpers.scrollButtonBorder}`}
                            title="Lên đầu"
                        >
                            ↑
                        </button>
                    )}

                    {(scrollPosition === 'middle' || scrollPosition === 'top') && (
                        <button
                            type="button"
                            onClick={scrollToBottom}
                            className={`pointer-events-auto w-9 h-9 rounded-full backdrop-blur border flex items-center justify-center text-lg shadow-lg transition ${theme.helpers.scrollButtonBg} ${theme.resolvedScrollIcon} ${theme.helpers.scrollButtonBorder}`}
                            title="Xuống cuối"
                        >
                            ↓
                        </button>
                    )}
                </div>

                {/* Reply Bar */}
                {replyTarget && (
                    <div className={`px-4 py-2 border-b ${theme.layout.inputBg} ${theme.bubbles.replyPreviewBorder}`}>
                        <div className="max-w-4xl mx-auto">
                            <div className={`flex justify-between items-start text-xs px-3 py-2 rounded-xl border ${theme.bubbles.replyPreviewBg} ${theme.bubbles.replyPreviewBorder}`}>
                                <div className="flex-1">
                                    <div className={`mb-1 opacity-70 ${theme.resolvedReplyText}`}>
                                        ↩ Trả lời {replyTarget.role === 'user' ? 'Bạn' : character.name}:
                                    </div>
                                    <div className={`line-clamp-2 whitespace-pre-wrap ${theme.resolvedReplyText}`}>
                                        {replyTarget.content}
                                    </div>
                                </div>
                                <button
                                    onClick={() => setReplyTarget(null)}
                                    className={`ml-2 hover:opacity-70 text-lg ${theme.resolvedReplyText}`}
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Input bar - fixed at bottom */}
                <div className={`shrink-0 border-t px-4 py-4 ${theme.layout.inputBg} ${theme.layout.inputBorder} ${theme.resolvedInputText}`}>
                    <div className="max-w-4xl mx-auto">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault()
                                sendMessage()
                            }}
                            className="flex gap-3"
                        >
                            <button
                                type="button"
                                onClick={() => openCreateMemory()}
                                className={`px-4 py-2 rounded-xl transition ${theme.buttons.primaryBg} ${theme.resolvedButtonText} ${theme.buttons.primaryHover}`}
                                title="Tạo ký ức mới"
                            >
                                💾
                            </button>
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                placeholder={`Nhắn cho ${character.name}...`}
                                className={`flex-1 px-4 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary/30 ${theme.layout.inputBg} ${theme.resolvedInputText} ${theme.input.placeholder} ${theme.layout.inputBorder}`}
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !inputMessage.trim()}
                                className="btn-primary px-8 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Gửi
                            </button>
                        </form>
                    </div>
                </div>
            </div>


            {/* Modals */}
            <PhoneCheckModal
                isOpen={isPhoneCheckOpen}
                onClose={() => setIsPhoneCheckOpen(false)}
                onSubmit={handlePhoneCheck}
                characterName={character.name}
            />

            {/* Convert memories createdAt to Date for MemoryViewer */}
            {(() => {
                const memoriesForViewer = memories.map((m) => ({
                    ...m,
                    createdAt: new Date(m.createdAt as any),
                }))

                return (
                    <MemoryViewer
                        isOpen={isMemoryViewerOpen}
                        onClose={() => setIsMemoryViewerOpen(false)}
                        characterName={character.name}
                        memories={memoriesForViewer}
                        onDelete={handleDeleteMemory}
                    />
                )
            })()}

            <CreateMemoryModal
                isOpen={isCreateMemoryOpen}
                onClose={() => {
                    setIsCreateMemoryOpen(false)
                    setSelectedMessageForMemory('')
                }}
                onSubmit={handleCreateMemory}
                messageContent=""
            />

            <CharacterSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                character={character as any}
                siliconPresets={siliconPresets}
                onUpdated={loadCharacter}
            />

            {/* Search Modal */}
            {isSearchOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="glass p-4 rounded-2xl w-full max-w-md max-h-[70vh] flex flex-col gap-3 mx-4">
                        <h3 className="text-lg font-semibold">🔍 Tìm kiếm tin nhắn</h3>

                        <div className="flex gap-2">
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                                className="input-field flex-1"
                                placeholder="Nhập từ khoá cần tìm..."
                                autoFocus
                            />
                            <button className="btn-primary px-4" onClick={runSearch}>
                                Tìm
                            </button>
                        </div>

                        <div className="text-xs text-gray-400">
                            Tìm trong {messages.length} tin nhắn gần đây.
                        </div>

                        <div className="mt-2 space-y-2 overflow-y-auto flex-1">
                            {searchResults.length === 0 ? (
                                <div className="text-sm text-gray-400 text-center py-4">
                                    {searchQuery ? 'Không tìm thấy kết quả nào.' : 'Nhập từ khoá để bắt đầu tìm.'}
                                </div>
                            ) : (
                                searchResults.map((m) => (
                                    <button
                                        key={m.id}
                                        onClick={() => jumpToMessage(m.id)}
                                        className="w-full text-left text-sm p-2 rounded-lg hover:bg-white/5 border border-white/10"
                                    >
                                        <div className="text-[11px] text-gray-400 mb-1">
                                            {m.role === 'user' ? 'Bạn' : character.name} • {new Date(m.createdAt).toLocaleString('vi-VN')}
                                        </div>
                                        <div className="line-clamp-2 whitespace-pre-wrap">
                                            {m.content}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>

                        <button
                            onClick={() => {
                                setIsSearchOpen(false)
                                setSearchQuery('')
                                setSearchResults([])
                            }}
                            className="btn-secondary w-full mt-2"
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            )}

            {/* Heart Toast - shows when character reacts with HEARTBEAT */}
            <HeartToast
                show={heartToast.show}
                characterName={heartToast.charName}
                onHide={() => setHeartToast({ show: false, charName: '' })}
                bgClass={theme.notice.bg}
                textClass={theme.notice.text}
            />
        </>
    )
}
