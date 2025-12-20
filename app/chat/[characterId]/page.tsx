'use client'

import { use, useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/firebase/auth-fetch'
import Image from 'next/image'
import MessageBubble from '@/components/MessageBubble'
import PhoneCheckModal, { type PhoneCheckData } from '@/components/PhoneCheckModal'
import MemoryViewer from '@/components/MemoryViewer'
import CreateMemoryModal, { type MemoryData } from '@/components/CreateMemoryModal'
import CharacterSettingsModal from '@/components/CharacterSettingsModal'
import HeartToast from '@/components/HeartToast'
import DevRelationshipTools from '@/components/DevRelationshipTools'
import ParseToolbar from '@/components/ParseToolbar'
import PlusDropdownModal from '@/components/PlusDropdownModal'
import SceneDirectorModal from '@/components/SceneDirectorModal'
import PhoneHomeScreen from '@/components/phone-os/PhoneHomeScreen'
import { useColors } from '@/lib/ColorContext'
import { useModal } from '@/contexts/ModalContext'
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

export default function ChatPage({ params }: { params: Promise<{ characterId: string }> }) {
    // Unwrap params Promise (Next.js 16 requirement)
    const { characterId } = use(params)

    const router = useRouter()
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const messagesContainerRef = useRef<HTMLDivElement>(null)
    const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map())
    const textareaRef = useRef<HTMLTextAreaElement>(null)

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

    // Error state for handling 403/404 fetch errors
    const [fetchError, setFetchError] = useState<{ code: number; message: string } | null>(null)
    const [isPageLoading, setIsPageLoading] = useState(true) // Track initial page load

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

    // Collapse menu state for mobile
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [showPlusModal, setShowPlusModal] = useState(false)
    const [showPhoneOS, setShowPhoneOS] = useState(false)

    // 🎬 Scene Director state
    const [showSceneDirector, setShowSceneDirector] = useState(false)
    const [sceneGoal, setSceneGoal] = useState('')  // Long-term narrative context
    const [nextDirection, setNextDirection] = useState('')  // One-time instruction for next message

    // 🟢 Live AI Monitor - track which model last responded
    const [activeModel, setActiveModel] = useState<{ provider: string; model: string } | null>(null)

    // Comforting Loading Messages (timer-based rotation)
    const [loadingText, setLoadingText] = useState('')
    const loadingStartRef = useRef<number>(0)
    const loadingIntervalRef = useRef<NodeJS.Timeout | null>(null)

    // Comforting loading messages based on elapsed time
    const getComfortingMessage = (elapsedMs: number, charName: string): string => {
        if (elapsedMs < 3000) {
            return `${charName} đang suy nghĩ...`
        } else if (elapsedMs < 8000) {
            return `Đợi em xíu, mạng đang hơi lag...`
        } else {
            return `Em đang chạy thật nhanh về phía anh đây... 💨`
        }
    }

    // Smart Auto-Memory state
    const [isAutoSaving, setIsAutoSaving] = useState(false)
    const [autoSaveToast, setAutoSaveToast] = useState<{ show: boolean; message: string; type: 'loading' | 'success' | 'error' }>({ show: false, message: '', type: 'loading' })
    const [showExitConfirm, setShowExitConfirm] = useState(false)

    // Get user's custom colors from ColorContext (must be before any conditional returns)
    const { textColor, backgroundColor } = useColors()

    // Get auth state from ModalContext
    const { user, loading: authLoading, openLogin } = useModal()

    // AUTH GATEKEEPER: Redirect to home if not authenticated
    useEffect(() => {
        if (!authLoading && !user) {
            console.log('[ChatPage] User not authenticated, redirecting to home...')
            router.replace('/characters')
            // Open login modal after redirect
            setTimeout(() => openLogin(), 100)
        }
    }, [authLoading, user, router, openLogin])

    useEffect(() => {
        // Only load data if user is authenticated
        if (user) {
            loadCharacter()
            loadMessages()
            loadMemories()
            loadSiliconPresets()
            loadTheme()

            // Load saved scene goal from localStorage
            const savedGoal = localStorage.getItem(`scene_goal_${characterId}`)
            if (savedGoal) {
                setSceneGoal(savedGoal)
            }
        }
    }, [characterId, user])

    useEffect(() => {
        scrollToBottom()
    }, [messages?.length])

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
            const res = await authFetch(`/api/characters/${characterId}`)

            // Handle 403/404 errors - character not found or no access
            if (res.status === 403 || res.status === 404) {
                console.error(`[ChatPage] Character fetch failed: ${res.status}`)
                setFetchError({
                    code: res.status,
                    message: res.status === 403
                        ? 'Bạn không có quyền truy cập cuộc trò chuyện này.'
                        : 'Không tìm thấy cuộc trò chuyện này.'
                })
                setIsPageLoading(false)
                return
            }

            const data = await res.json()

            if (!data.character) {
                setFetchError({
                    code: 404,
                    message: 'Không tìm thấy nhân vật này.'
                })
                setIsPageLoading(false)
                return
            }

            setCharacter(data.character)
            setFetchError(null)

            // Initialize relationship stats from character data
            if (data.character?.relationshipConfig) {
                setAffectionPoints(data.character.relationshipConfig.affectionPoints || 0)
                setIntimacyLevel(data.character.relationshipConfig.intimacyLevel || 0)
                setRelationshipStage(data.character.relationshipConfig.stage || 'UNDEFINED')
            }
        } catch (error) {
            console.error('Error loading character:', error)
            setFetchError({
                code: 500,
                message: 'Không thể tải dữ liệu. Vui lòng thử lại.'
            })
        } finally {
            setIsPageLoading(false)
        }
    }

    const loadSiliconPresets = async () => {
        try {
            const res = await authFetch('/api/silicon-presets')
            const data = await res.json()
            setSiliconPresets(data.presets || [])
        } catch (error) {
            console.error('Error loading silicon presets:', error)
        }
    }

    const loadTheme = async () => {
        try {
            const res = await authFetch('/api/user-profile')
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
            const res = await authFetch(`/api/messages?characterId=${characterId}&limit=50`)
            const data = await res.json()
            setMessages(data.messages)
        } catch (error) {
            console.error('Error loading messages:', error)
        }
    }

    const loadMemories = async () => {
        try {
            const res = await authFetch(`/api/memories?characterId=${characterId}`)
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

        // Start comforting loading timer
        loadingStartRef.current = Date.now()
        setLoadingText(getComfortingMessage(0, character?.name || 'AI'))

        // Update loading text every second
        loadingIntervalRef.current = setInterval(() => {
            const elapsed = Date.now() - loadingStartRef.current
            setLoadingText(getComfortingMessage(elapsed, character?.name || 'AI'))
        }, 1000)

        try {
            const res = await authFetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    characterId: characterId,
                    message: sceneState
                        ? `[Phone check scene] ${sceneState.description}`
                        : userMessage,
                    sceneState,
                    replyToMessageId: replyTarget?.id || null,
                    // Đạo diễn Cảnh - Scene Director
                    sceneGoal: sceneGoal || undefined,
                    nextDirection: nextDirection || undefined,
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

            // 🟢 Live AI Monitor: Update active model from response
            if (data.meta) {
                setActiveModel({
                    provider: data.meta.provider,
                    model: data.meta.model,
                })
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

            // Đạo diễn Cảnh: Clear one-time direction after sending
            if (nextDirection) {
                setNextDirection('')
            }
        } catch (error: any) {
            console.error('Error sending message:', error)
            alert(`AI không trả lời được (lỗi máy chủ). Bạn thử nhắn lại sau một chút nhé.\n\nChi tiết: ${error?.message || 'Unknown error'}`)
        } finally {
            // Clear comforting loading timer
            if (loadingIntervalRef.current) {
                clearInterval(loadingIntervalRef.current)
                loadingIntervalRef.current = null
            }
            setLoadingText('')
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
            const res = await authFetch(`/api/messages?characterId=${characterId}`, {
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
                    characterId: characterId,
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

    // ============================================
    // SMART AUTO-MEMORY
    // AI-powered conversation summarization
    // ============================================
    const handleAutoSaveMemory = async (trigger: 'button' | 'exit' = 'button') => {
        if (isAutoSaving) return
        if (messages.length < 3) {
            setAutoSaveToast({ show: true, message: 'Cuộc trò chuyện quá ngắn để lưu kỷ niệm.', type: 'error' })
            setTimeout(() => setAutoSaveToast(prev => ({ ...prev, show: false })), 3000)
            return
        }

        setIsAutoSaving(true)
        setAutoSaveToast({ show: true, message: 'Đang ghi lại khoảnh khắc...', type: 'loading' })

        try {
            const res = await authFetch('/api/memory/auto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ characterId, trigger })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.message || 'Không thể lưu kỷ niệm')
            }

            setAutoSaveToast({ show: true, message: 'Đã lưu kỷ niệm vào nhật ký! 📒', type: 'success' })
            loadMemories() // Refresh memories list
            setTimeout(() => setAutoSaveToast(prev => ({ ...prev, show: false })), 3000)

        } catch (error: any) {
            console.error('[AutoMemory] Error:', error)
            setAutoSaveToast({ show: true, message: error.message || 'Có lỗi xảy ra', type: 'error' })
            setTimeout(() => setAutoSaveToast(prev => ({ ...prev, show: false })), 3000)
        } finally {
            setIsAutoSaving(false)
        }
    }

    // Handle back navigation with exit confirmation
    const handleBackNavigation = () => {
        // If conversation has meaningful content, show exit confirmation
        if (messages.length >= 5) {
            setShowExitConfirm(true)
        } else {
            router.back()
        }
    }

    // Goodnight keyword detection
    const GOODNIGHT_KEYWORDS = ['ngủ ngon', 'bye', 'tạm biệt', 'chúc ngủ ngon', 'good night', 'goodnight', 'bye bye']
    const checkForGoodnightKeyword = (text: string): boolean => {
        const lowerText = text.toLowerCase()
        return GOODNIGHT_KEYWORDS.some(keyword => lowerText.includes(keyword))
    }

    // Error state - show error message with back button
    if (fetchError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
                <div className="glass rounded-2xl p-8 max-w-md text-center">
                    <div className="text-5xl mb-4">
                        {fetchError.code === 403 ? '🔒' : fetchError.code === 404 ? '😔' : '⚠️'}
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">
                        {fetchError.code === 403 ? 'Không có quyền truy cập' : 'Không tìm thấy'}
                    </h2>
                    <p className="text-secondary mb-6">
                        {fetchError.message}
                    </p>
                    <button
                        onClick={() => router.push('/characters')}
                        className="btn-primary px-6 py-3 rounded-xl font-medium"
                    >
                        ← Quay về trang chủ
                    </button>
                </div>
            </div>
        )
    }

    // Loading state - ONLY show if not in error state
    // Without the !fetchError check, loading would override error UI because character is still null
    if ((!character || isPageLoading) && !fetchError) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-pulse text-secondary">Đang tải...</div>
            </div>
        )
    }

    // Get resolved theme with all text classes computed
    const theme = getResolvedTheme(themeId, textMode)

    // Check if user has custom colors (not defaults)
    const hasCustomColors = textColor !== '#F9D47E' || backgroundColor !== '#1A1A1A'

    // Helper function to darken a color for AI bubbles
    const darkenColor = (hex: string, percent: number = 20): string => {
        // Remove # if present
        const h = hex.replace('#', '')
        // Parse RGB
        const r = Math.max(0, parseInt(h.substring(0, 2), 16) - Math.round(2.55 * percent))
        const g = Math.max(0, parseInt(h.substring(2, 4), 16) - Math.round(2.55 * percent))
        const b = Math.max(0, parseInt(h.substring(4, 6), 16) - Math.round(2.55 * percent))
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
    }

    return (
        <>
            {/* Fixed container covering viewport from nav to bottom - hides footer */}
            <div className={`absolute inset-0 top-16 w-full max-w-full flex flex-col overflow-x-hidden overflow-y-hidden z-10 ${theme.layout.messagesBg}`}>
                {/* Header - fixed at top with solid bg */}
                <div className={`shrink-0 border-b backdrop-blur-md px-4 py-3 relative z-[9999] ${theme.layout.headerBg} ${theme.layout.headerBorder} ${theme.resolvedHeaderText}`}>
                    <div className="max-w-4xl mx-auto flex items-center justify-between">
                        <div className="flex items-start sm:items-center gap-2 min-w-0 flex-1">
                            <button
                                onClick={handleBackNavigation}
                                className={`opacity-80 hover:opacity-100 transition-opacity ${hasCustomColors ? '' : theme.resolvedHeaderText} flex-shrink-0 text-xl`}
                                style={hasCustomColors ? { color: textColor } : undefined}
                                title="Quay lại"
                            >
                                ←
                            </button>
                            <div className="relative w-8 sm:w-10 h-8 sm:h-10 rounded-full overflow-hidden ring-2 ring-primary/30 flex-shrink-0">
                                <Image src={character.avatarUrl} alt={character.name} fill unoptimized />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h2 className={`font-semibold text-sm sm:text-base truncate ${theme.bubbles.userText}`}>{character.name}</h2>
                                {/* Affection Bar */}
                                <div className={`text-xs space-y-0.5 ${theme.bubbles.aiText}`}>
                                    <div className="flex items-center gap-1">
                                        <span className="text-[10px]">{LEVEL_EMOJIS[intimacyLevel]}</span>
                                        <span className="truncate text-[10px]">{LEVEL_LABELS[intimacyLevel]}</span>
                                        <span className="text-[9px] opacity-70 whitespace-nowrap">
                                            {affectionPoints}/100
                                        </span>
                                        {/* TASK B: Micro-feedback (+6❤️ / -3💔) */}
                                        {impactFeedback.show && (
                                            <span
                                                className={`text-[10px] font-bold ${impactFeedback.value > 0 ? 'text-green-400' : 'text-red-400'
                                                    }`}
                                            >
                                                {impactFeedback.value > 0 ? `+${impactFeedback.value}❤️` : `${impactFeedback.value}💔`}
                                            </span>
                                        )}
                                    </div>
                                    <div className="w-full max-w-32 h-1 bg-white/20 rounded-full overflow-hidden mt-1">
                                        <div
                                            className={`h-full ${theme.bubbles.userBg} transition-all duration-500`}
                                            style={{ width: `${Math.min(100, affectionPoints)}%` }}
                                        />
                                    </div>
                                    <div className={`mt-1 text-[9px] uppercase font-bold tracking-wider truncate ${theme.bubbles.userText}`}>
                                        STAGE: {relationshipStage}
                                    </div>
                                </div>
                                {/* 🟢 Live AI Monitor - Show active model with pulsing indicator */}
                                <div className={`flex items-center gap-1.5 text-[9px] font-mono opacity-70 ${theme.bubbles.aiText}`}>
                                    {activeModel ? (
                                        <>
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                            </span>
                                            <span className="truncate max-w-[180px]">
                                                {activeModel.provider} / {activeModel.model}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                                            <span className="truncate max-w-[180px]">
                                                {character.provider || 'Mặc định'} / {character.modelName || 'Ready'}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Header buttons: Memory + Plus */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Auto-Save Memory button */}
                            <button
                                onClick={() => handleAutoSaveMemory('button')}
                                disabled={isAutoSaving}
                                className={`flex items-center justify-center w-8 h-8 rounded-lg text-lg transition ${theme.buttons.primaryBg} ${theme.resolvedButtonText} ${theme.buttons.primaryHover} ${isAutoSaving ? 'opacity-50 cursor-wait' : ''}`}
                                title="Lưu kỷ niệm (AI tự tóm tắt)"
                            >
                                {isAutoSaving ? '⏳' : '💾'}
                            </button>
                            {/* Plus button - opens Plus modal */}
                            <button
                                onClick={() => setShowPlusModal(true)}
                                className={`flex items-center justify-center w-8 h-8 rounded-lg text-lg transition ${theme.buttons.primaryBg} ${theme.resolvedButtonText} ${theme.buttons.primaryHover}`}
                                title="Menu"
                            >
                                ➕
                            </button>
                        </div>
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
                            <div className="text-center py-12 text-secondary">
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
                                        // Custom color support from user settings
                                        useCustomColors={hasCustomColors}
                                        customUserBg={backgroundColor}
                                        customUserText={textColor}
                                        customAiBg={darkenColor(backgroundColor, 15)}
                                        customAiText={textColor}
                                    />
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="glass px-4 py-3 rounded-2xl rounded-bl-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="flex gap-1">
                                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-150"></div>
                                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-300"></div>
                                        </div>
                                        <span className="text-sm text-secondary italic">
                                            {loadingText || `${character?.name || 'AI'} đang suy nghĩ...`}
                                        </span>
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
                            className={`pointer-events-auto w-9 h-9 rounded-full backdrop-blur border flex items-center justify-center text-lg shadow-lg transition ${hasCustomColors ? '' : theme.helpers.scrollButtonBg} ${hasCustomColors ? '' : theme.resolvedScrollIcon} ${hasCustomColors ? 'border-white/30' : theme.helpers.scrollButtonBorder}`}
                            style={hasCustomColors ? { backgroundColor: darkenColor(backgroundColor, 10), color: textColor } : undefined}
                            title="Lên đầu"
                        >
                            ↑
                        </button>
                    )}

                    {(scrollPosition === 'middle' || scrollPosition === 'top') && (
                        <button
                            type="button"
                            onClick={scrollToBottom}
                            className={`pointer-events-auto w-9 h-9 rounded-full backdrop-blur border flex items-center justify-center text-lg shadow-lg transition ${hasCustomColors ? '' : theme.helpers.scrollButtonBg} ${hasCustomColors ? '' : theme.resolvedScrollIcon} ${hasCustomColors ? 'border-white/30' : theme.helpers.scrollButtonBorder}`}
                            style={hasCustomColors ? { backgroundColor: darkenColor(backgroundColor, 10), color: textColor } : undefined}
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
                            <ParseToolbar
                                textareaRef={textareaRef}
                                textValue={inputMessage}
                                onChange={setInputMessage}
                                theme={{ bubbles: theme.bubbles }}
                            />
                            <textarea
                                ref={textareaRef}
                                value={inputMessage}
                                onChange={(e) => {
                                    setInputMessage(e.target.value)
                                    // Auto-resize: reset height first, then set to scrollHeight
                                    const textarea = e.currentTarget
                                    textarea.style.height = 'auto'
                                    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
                                }}
                                onKeyDown={(e) => {
                                    // Allow Shift+Enter for new line, Enter to send
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        if (inputMessage.trim() && !isLoading) {
                                            sendMessage()
                                        }
                                    }
                                }}
                                placeholder={`Nhắn cho ${character.name}...`}
                                className={`flex-1 px-4 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none overflow-y-auto ${theme.layout.inputBg} ${theme.layout.inputBorder}`}
                                disabled={isLoading}
                                rows={1}
                                style={{
                                    minHeight: '40px',
                                    maxHeight: '120px',
                                    color: 'var(--user-text-color)',
                                }}
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !inputMessage.trim()}
                                className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                ➤
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
                theme={{ bubbles: theme.bubbles }}
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

                        <div className="text-xs text-secondary">
                            Tìm trong {messages.length} tin nhắn gần đây.
                        </div>

                        <div className="mt-2 space-y-2 overflow-y-auto flex-1">
                            {searchResults.length === 0 ? (
                                <div className="text-sm text-secondary text-center py-4">
                                    {searchQuery ? 'Không tìm thấy kết quả nào.' : 'Nhập từ khoá để bắt đầu tìm.'}
                                </div>
                            ) : (
                                searchResults.map((m) => (
                                    <button
                                        key={m.id}
                                        onClick={() => jumpToMessage(m.id)}
                                        className="w-full text-left text-sm p-2 rounded-lg hover:bg-white/5 border border-white/10"
                                    >
                                        <div className="text-[11px] text-secondary mb-1">
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

            {/* Plus Dropdown Modal */}
            <PlusDropdownModal
                isOpen={showPlusModal}
                onClose={() => setShowPlusModal(false)}
                characterId={characterId}
                devMode={isDev}
                onPhoneCheck={() => {
                    // ⏰ Clock - opens narrative phone check scenario
                    setIsPhoneCheckOpen(true)
                }}
                onPhone={() => {
                    // 📱 Phone - opens new Phone OS screen
                    setShowPhoneOS(true)
                }}
                onMemory={() => {
                    setIsMemoryViewerOpen(true)
                }}
                onSettings={() => {
                    setIsSettingsOpen(true)
                }}
                onSearch={() => {
                    setIsSearchOpen(true)
                }}
                onReset={handleResetChat}
                onSceneDirector={() => {
                    setShowSceneDirector(true)
                }}
            />

            {/* 🎬 Scene Director Modal */}
            <SceneDirectorModal
                isOpen={showSceneDirector}
                onClose={() => setShowSceneDirector(false)}
                characterId={characterId}
                sceneGoal={sceneGoal}
                onSceneGoalChange={setSceneGoal}
                nextDirection={nextDirection}
                onNextDirectionChange={setNextDirection}
            />

            {/* Phone OS Home Screen */}
            <PhoneHomeScreen
                isOpen={showPhoneOS}
                onClose={() => setShowPhoneOS(false)}
                characterId={characterId}
                characterName={character.name}
                messageCount={messages.length}
                onAppClick={(appId) => {
                    console.log('Phone app clicked:', appId)
                }}
            />

            {/* Auto-Save Toast */}
            {autoSaveToast.show && (
                <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
                    <div className={`px-4 py-3 rounded-xl backdrop-blur-md shadow-lg flex items-center gap-2 ${autoSaveToast.type === 'loading' ? 'bg-blue-500/90' :
                        autoSaveToast.type === 'success' ? 'bg-green-500/90' :
                            'bg-red-500/90'
                        } text-white`}>
                        {autoSaveToast.type === 'loading' && (
                            <span className="animate-spin">⏳</span>
                        )}
                        {autoSaveToast.type === 'success' && <span>✅</span>}
                        {autoSaveToast.type === 'error' && <span>❌</span>}
                        <span className="text-sm font-medium">{autoSaveToast.message}</span>
                    </div>
                </div>
            )}

            {/* Exit Confirmation Modal */}
            {showExitConfirm && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
                    <div className="glass p-6 rounded-2xl w-full max-w-sm text-center space-y-4">
                        <div className="text-4xl">💕</div>
                        <h3 className="text-lg font-semibold">
                            Hôm nay tụi mình nói chuyện vui quá!
                        </h3>
                        <p className="text-sm text-secondary">
                            Bạn có muốn lưu lại kỷ niệm ngày hôm nay không?
                        </p>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={async () => {
                                    setShowExitConfirm(false)
                                    await handleAutoSaveMemory('exit')
                                    setTimeout(() => router.back(), 1500) // Wait for toast
                                }}
                                className="btn-primary w-full flex items-center justify-center gap-2"
                                disabled={isAutoSaving}
                            >
                                {isAutoSaving ? '⏳ Đang lưu...' : '💾 Lưu kỷ niệm & Thoát'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowExitConfirm(false)
                                    router.back()
                                }}
                                className="btn-secondary w-full"
                            >
                                Thoát không lưu
                            </button>
                            <button
                                onClick={() => setShowExitConfirm(false)}
                                className="text-sm text-secondary hover:text-white transition"
                            >
                                Ở lại chat
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
