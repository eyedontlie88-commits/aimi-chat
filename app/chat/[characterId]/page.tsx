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
import ParseToolbar from '@/components/ParseToolbar'
import PlusDropdownModal from '@/components/PlusDropdownModal'
import SceneDirectorModal from '@/components/SceneDirectorModal'
import PhoneHomeScreen from '@/components/phone-os/PhoneHomeScreen'
import { MissingInfoWarningPopup } from '@/components/MissingInfoWarningPopup'
import DevRelationshipTools from '@/components/DevRelationshipTools'
import { useColors } from '@/lib/ColorContext'
import { useLanguage } from '@/lib/i18n'
import { useModal } from '@/contexts/ModalContext'
import type { SiliconPresetModel } from '@/lib/llm/silicon-presets'
import type { MoonshotPresetModel } from '@/lib/llm/moonshot-presets'
import type { OpenRouterPresetModel } from '@/lib/llm/openrouter-presets'
import { getResolvedTheme, ChatTextMode, ChatThemeId } from '@/lib/ui/chatThemes'

// Intimacy level emojis (labels come from t.chat.intimacyLevels)
const LEVEL_EMOJIS = ['🙂', '😊', '🤝', '💖', '💍']

// 🔒 ADMIN WHITELIST: Only these emails can see Dev Tools
const ADMIN_EMAILS = ['eyedontlie88@gmail.com', 'giangcm987@gmail.com']

// 📊 DYNAMIC SCALING: Max points for each stage (for visual progress)
const STAGE_MAX_POINTS: Record<string, number> = {
    'BROKEN': 0,
    'STRANGER': 10,
    'ACQUAINTANCE': 100,
    'CRUSH': 1000,
    'DATING': 3000,
    'COMMITTED': 5000,
    'UNDEFINED': 10
}

interface RelationshipConfig {
    intimacyLevel: number
    affectionPoints: number
    messageCount: number
    status: string
    phoneUnlocked?: boolean
    phoneJustUnlocked?: boolean
}

interface Character {
    id: string
    name: string
    avatarUrl: string
    persona?: string       // ADDED: Character persona/description for AI generation
    gender?: string | null  // ADDED: For missing info check
    age?: number | null     // ADDED: For missing info check
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
    const [moonshotPresets, setMoonshotPresets] = useState<MoonshotPresetModel[]>([])
    const [openrouterPresets, setOpenrouterPresets] = useState<OpenRouterPresetModel[]>([])
    const [themeId, setThemeId] = useState<ChatThemeId>('midnight')
    const [textMode, setTextMode] = useState<ChatTextMode>('auto')

    // Error state for handling 403/404 fetch errors
    const [fetchError, setFetchError] = useState<{ code: number; message: string } | null>(null)
    const [isPageLoading, setIsPageLoading] = useState(true) // Track initial page load

    // Relationship state (updated after each message)
    const [affectionPoints, setAffectionPoints] = useState(0)
    const [intimacyLevel, setIntimacyLevel] = useState(0)
    const [relationshipStage, setRelationshipStage] = useState<string>('UNDEFINED')

    // 🔓 Phone unlock state
    const [phoneUnlocked, setPhoneUnlocked] = useState(false)
    const [phoneJustUnlocked, setPhoneJustUnlocked] = useState(false)
    const [showPhoneLockedModal, setShowPhoneLockedModal] = useState(false)

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
    // 🔒 isDev is computed AFTER user loads - see line ~199
    const { t } = useLanguage()
    // user is obtained from useModal() at line 175 for auth gating
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

    // 💔 AI Breakup - track if relationship is broken
    const [isBrokenUp, setIsBrokenUp] = useState(false)

    // 🔒 Client-side mount state to prevent hydration errors
    const [isMounted, setIsMounted] = useState(false)

    // Comforting Loading Messages (timer-based rotation)
    const [loadingText, setLoadingText] = useState('')
    const loadingStartRef = useRef<number>(0)
    const loadingIntervalRef = useRef<NodeJS.Timeout | null>(null)

    // Comforting loading messages based on elapsed time - uses t translations
    const getComfortingMessage = (elapsedMs: number, charName: string): string => {
        if (elapsedMs < 3000) {
            return t.chat.thinking.replace('{name}', charName)
        } else if (elapsedMs < 8000) {
            return t.chat.networkDelay
        } else {
            return t.chat.running
        }
    }

    // Smart Auto-Memory state
    const [isAutoSaving, setIsAutoSaving] = useState(false)
    const [autoSaveToast, setAutoSaveToast] = useState<{ show: boolean; message: string; type: 'loading' | 'success' | 'error' }>({ show: false, message: '', type: 'loading' })
    const [showExitConfirm, setShowExitConfirm] = useState(false)

    // Smart Semantic Gatekeeper state
    const lastAnalysedMsgCountRef = useRef<number>(0)
    const [hasNewPhoneMessages, setHasNewPhoneMessages] = useState(false)
    const [isGeneratingPhoneMessages, setIsGeneratingPhoneMessages] = useState(false)
    const lastSeenPhoneTimestampRef = useRef<number>(0) // Track when user last viewed phone messages

    // 🎬 DEV FLOATING BUBBLE STATE
    const [showDevMenu, setShowDevMenu] = useState(false)
    const [isQuickGenerating, setIsQuickGenerating] = useState(false) // Loading state for Quick Gen

    // 🔥 NEW: Missing info warning state
    const [showMissingInfoWarning, setShowMissingInfoWarning] = useState(false)

    // Get user's custom colors from ColorContext (must be before any conditional returns)
    const { textColor, backgroundColor } = useColors()

    // Get auth state from ModalContext
    const { user, loading: authLoading, openLogin } = useModal()
    const { lang: userLanguage } = useLanguage()

    // 🔒 STRICT DEV MODE: Only admin emails can see dev tools (client-side only)
    const isDev = isMounted &&
        process.env.NODE_ENV !== 'production' &&
        !!user?.email &&
        ADMIN_EMAILS.includes(user.email)

    // 🔒 Mount detection: Prevent hydration errors by waiting for client-side render
    useEffect(() => {
        setIsMounted(true)
    }, [])

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
            loadMoonshotPresets()
            loadOpenRouterPresets()
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
        // 1. RESET STATE AT START - Always set loading true and clear old errors
        setIsPageLoading(true)
        setFetchError(null)

        try {
            // 🔥 Cache buster: Add timestamp to force fresh fetch
            const res = await authFetch(`/api/characters/${characterId}?t=${Date.now()}`)

            // 2. CHECK HTTP ERRORS IMMEDIATELY - Handle ANY non-ok response
            if (!res.ok) {
                console.error(`[ChatPage] Character fetch failed: ${res.status}`)
                setFetchError({
                    code: res.status,
                    message: res.status === 403
                        ? 'Bạn không có quyền truy cập cuộc trò chuyện này.'
                        : res.status === 404
                            ? 'Không tìm thấy cuộc trò chuyện này.'
                            : `Lỗi server: ${res.status}`
                })
                // CRITICAL: Stop loading immediately on error and exit
                setIsPageLoading(false)
                return
            }

            // 3. PARSE JSON DATA
            const data = await res.json()

            // 4. CHECK FOR EMPTY DATA
            if (!data.character) {
                setFetchError({
                    code: 404,
                    message: 'Không tìm thấy nhân vật này.'
                })
                setIsPageLoading(false)
                return
            }

            // 5. SUCCESS - Set character data
            setCharacter(data.character)
            setFetchError(null) // Clear any previous errors

            // Initialize relationship stats from character data
            if (data.character?.relationshipConfig) {
                const rel = data.character.relationshipConfig
                setAffectionPoints(rel.affectionPoints || 0)
                setIntimacyLevel(rel.intimacyLevel || 0)
                setRelationshipStage(rel.stage || 'UNDEFINED')

                // 🔓 Phone unlock state from API
                if (rel.phoneUnlocked !== undefined) {
                    setPhoneUnlocked(rel.phoneUnlocked)
                }
                if (rel.phoneJustUnlocked) {
                    setPhoneJustUnlocked(true)
                    console.log('🔓 [LOAD] Phone just unlocked! Showing celebration popup')
                }

                // 💀 HARD LOCK: Check for BROKEN state on load - prevent Zombie bug
                if (rel.stage === 'BROKEN' || (rel.affectionPoints !== undefined && rel.affectionPoints <= -10)) {
                    console.log('💀 [LOAD] Character is BROKEN! Affection:', rel.affectionPoints, 'Stage:', rel.stage)
                    console.log('💀 [LOAD] Triggering Hard Lock - UI will be blocked by breakup modal')
                    setIsBrokenUp(true)
                    // Don't return - let background continue loading, but modal covers everything
                }
            } else {
                // 🔒 SAFETY: Explicitly lock Phone if no relationshipConfig from API
                console.log('[ChatPage] 🔒 No relationshipConfig - Phone LOCKED by default')
                setPhoneUnlocked(false)
            }

            // 🔥 NEW: Check for missing info (age/gender) and show warning
            const charInfoMissing = !data.character.age && !data.character.gender
            if (charInfoMissing) {
                // Also check user profile
                try {
                    const profileRes = await authFetch('/api/user-profile')
                    if (profileRes.ok) {
                        const profileData = await profileRes.json()
                        const userInfoMissing = !profileData.profile?.age && !profileData.profile?.gender
                        if (userInfoMissing) {
                            setShowMissingInfoWarning(true)
                        }
                    }
                } catch (err) {
                    console.error('[ChatPage] Error checking user profile for missing info:', err)
                }
            }
        } catch (error) {
            // 6. CATCH NETWORK/JSON ERRORS
            console.error('[ChatPage] Error loading character:', error)
            setFetchError({
                code: 500,
                message: 'Không thể tải dữ liệu. Vui lòng thử lại.'
            })
        } finally {
            // 7. ALWAYS STOP LOADING - No matter what happens
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

    const loadMoonshotPresets = async () => {
        try {
            const res = await authFetch('/api/moonshot-presets')
            const data = await res.json()
            setMoonshotPresets(data.presets || [])
        } catch (error) {
            console.error('Error loading moonshot presets:', error)
        }
    }

    const loadOpenRouterPresets = async () => {
        try {
            const res = await authFetch('/api/openrouter-presets')
            const data = await res.json()
            setOpenrouterPresets(data.presets || [])
        } catch (error) {
            console.error('Error loading openrouter presets:', error)
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
                    // Multi-language support - AI responds in user's language
                    userLanguage: userLanguage,
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

                // 🔓 Update Phone unlock status if provided
                if (typeof data.relationship.phoneUnlocked === 'boolean') {
                    setPhoneUnlocked(data.relationship.phoneUnlocked)
                }
            }

            // 🔓 Handle Phone unlock celebration
            if (data.phoneJustUnlocked) {
                setPhoneJustUnlocked(true)
                console.log('[ChatPage] 🎉 Phone just unlocked from chat response!')
            }

            // 💔 AI BREAKUP: Check if relationship is broken
            if (data.isBroken) {
                console.log('💔 [AI BREAKUP] Relationship BROKEN! Showing modal...')
                setIsBrokenUp(true)
                setIsLoading(false)
                return // Stop processing, show breakup modal
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

            // Clean Sync: Reset phone notification when user sends new message
            // This ensures stale data doesn't trigger fake notifications
            setHasNewPhoneMessages(false)

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
            '• Reset điểm tình cảm về 0\n' +
            '• Xoá tất cả tin nhắn điện thoại\n\n' +
            'Hành động này không thể hoàn tác!'
        )
        if (!confirmed) return

        setIsResetting(true)
        try {
            // 🔄 Use new comprehensive reset API
            const res = await authFetch('/api/character/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    characterId,
                    userEmail: user?.email
                })
            })
            if (!res.ok) throw new Error('Failed to reset')

            const data = await res.json()
            console.log('[ChatPage] 🔄 Reset API response:', data)

            // 🧹 Clear all sessionStorage caches for this character
            const keysToRemove: string[] = []
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i)
                if (key && (key.includes(characterId) || key.includes('phone'))) {
                    keysToRemove.push(key)
                }
            }
            keysToRemove.forEach(key => sessionStorage.removeItem(key))
            console.log(`[ChatPage] 🧹 Cleared ${keysToRemove.length} cache keys`)

            // Reset local state
            setMessages([])
            setMemories([])
            setAffectionPoints(0)
            setIntimacyLevel(0)
            setRelationshipStage('STRANGER')
            setDevForceReaction('OFF')
            setHeartToast({ show: false, charName: '' })
            lastToastTimeRef.current = 0

            console.log('[ChatPage] ✅ Factory reset complete! Reloading page...')

            // 🔄 Reload page for completely fresh start
            window.location.reload()
        } catch (error) {
            console.error('Error resetting chat:', error)
            alert('Không thể reset. Vui lòng thử lại.')
        } finally {
            setIsResetting(false)
        }
    }


    // 🚀 DEV FLOATING BUBBLE: Quick Generate 25 messages + Phone unlock
    const handleQuickDevGenerate = async () => {
        if (!character?.id || !user || isQuickGenerating) return

        const confirmed = confirm('🚀 Generate 25 fake messages + unlock Phone?\n\n' +
            'This will:\n' +
            '✅ Create 25 chat messages (takes ~1 minute)\n' +
            '✅ Increase affection to 101+\n' +
            '✅ Unlock Phone immediately\n\n' +
            'Continue?')

        if (!confirmed) return

        setIsQuickGenerating(true) // Start loading

        try {
            console.log('[Quick Dev Gen] Starting 25 message generation...')

            const response = await authFetch('/api/chat/dev-generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userEmail: user.email,
                    userId: user.uid,
                    characterId: character.id,
                    characterName: character.name,
                    characterPersona: character.persona || '',
                    topic: 'caring',
                    messageCount: 25,
                    userLanguage,
                    saveToDb: true
                })
            })

            const data = await response.json()

            if (data.saved) {
                console.log('[Quick Dev Gen] ✅ Success! Reloading...')
                await Promise.all([loadMessages(), loadCharacter()])

                // 🔓 Force update phoneUnlocked based on affection
                if (data.relationship?.affectionPoints >= 101) {
                    setPhoneUnlocked(true)
                }
                if (data.phoneJustUnlocked) {
                    setPhoneJustUnlocked(true)
                }

                setShowDevMenu(false) // Close menu after action
                alert(`✅ Quick Dev Gen Complete!\n\n` +
                    `📊 Affection: ${data.relationship?.affectionPoints || 0}\n` +
                    `📱 Phone: ${data.relationship?.affectionPoints >= 101 ? 'UNLOCKED ✓' : 'Locked'}\n` +
                    `💬 Messages: 25`)
            } else {
                alert('❌ Gen failed: ' + (data.error || 'Unknown'))
            }
        } catch (error: any) {
            console.error('[Quick Dev Gen] Error:', error)
            alert('❌ Failed: ' + error.message)
        } finally {
            setIsQuickGenerating(false) // Stop loading
        }
    }

    // � DEV FLOATING BUBBLE: Adjust affection points
    const handleAffectionAdjust = async (delta: number) => {
        try {
            const res = await authFetch('/api/relationship/update-affection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ characterId, affectionDelta: delta })
            })
            if (res.ok) {
                await loadCharacter()
                console.log(`[Dev] Affection adjusted by ${delta}`)
            }
        } catch (error) {
            console.error('[Dev] Affection adjust error:', error)
        }
    }

    // 🔧 DEV FLOATING BUBBLE: Change relationship stage
    const handleDevStageChange = async (stage: string) => {
        try {
            const res = await authFetch(`/api/characters/${characterId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stage })
            })
            if (res.ok) {
                await loadCharacter()
                console.log(`[Dev] Stage changed to ${stage}`)
            }
        } catch (error) {
            console.error('[Dev] Stage change error:', error)
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
            setAutoSaveToast({ show: true, message: t.chat.autoTooShort, type: 'error' })
            setTimeout(() => setAutoSaveToast(prev => ({ ...prev, show: false })), 3000)
            return
        }

        setIsAutoSaving(true)
        setAutoSaveToast({ show: true, message: t.chat.autoSaving, type: 'loading' })

        try {
            const res = await authFetch('/api/memory/auto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ characterId, trigger })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.message || t.chat.couldNotSave)
            }

            setAutoSaveToast({ show: true, message: t.chat.autoSaved, type: 'success' })
            loadMemories() // Refresh memories list
            setTimeout(() => setAutoSaveToast(prev => ({ ...prev, show: false })), 3000)

        } catch (error: any) {
            console.error('[AutoMemory] Error:', error)
            setAutoSaveToast({ show: true, message: error.message || t.chat.somethingWentWrong, type: 'error' })
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

            // Stage 1 Gate: Check if 10+ new messages since last analysis
            const diff = messages.length - lastAnalysedMsgCountRef.current
            if (diff >= 10) {
                console.log(`[SilentGen] Triggering generation (${diff} new messages)`)
                lastAnalysedMsgCountRef.current = messages.length
                triggerSilentMessageGeneration()
            } else {
                console.log(`[SilentGen] Skipped - not enough new messages (${diff} < 10)`)
                // CRITICAL: Clear any stale notification to prevent "bait" from old messages
                setHasNewPhoneMessages(false)
            }
        } else {
            router.back()
        }
    }

    // Silent message generation for retention hook
    const triggerSilentMessageGeneration = async () => {
        if (isGeneratingPhoneMessages || !character) return

        setIsGeneratingPhoneMessages(true)
        setHasNewPhoneMessages(false)

        try {
            // Extract last 15 messages for context
            const recentHistory = messages.slice(-15).map(m => ({
                role: m.role,
                content: m.content
            }))

            const response = await fetch('/api/phone/generate-messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    characterName: character.name,
                    characterDescription: '',
                    userLanguage: userLanguage,
                    recentHistory: recentHistory
                })
            })

            const data = await response.json()

            // Stage 2: Check if AI generated or skipped
            if (data.skipped) {
                console.log(`[SilentGen] AI skipped: ${data.reason}`)
                // CRITICAL: Keep notification FALSE - don't use stale data to "bait" user
                // Even if there's old cached data, we don't show notification
            } else if (data.messages && data.messages.length > 0) {
                const generationTimestamp = Date.now()
                console.log(`[SilentGen] Generated ${data.messages.length} messages! ts=${generationTimestamp}`)

                // Cache the new messages with timestamp - MUST match MessagesApp getCacheKey format
                sessionStorage.setItem(
                    `phone_cached_messages_${characterId}`,
                    JSON.stringify(data.messages)
                )
                // Store generation timestamp to detect freshness
                sessionStorage.setItem(
                    `phone_generation_ts_${characterId}`,
                    generationTimestamp.toString()
                )

                // Only show notification if this generation is NEWER than last seen
                if (generationTimestamp > lastSeenPhoneTimestampRef.current) {
                    setHasNewPhoneMessages(true)
                    console.log(`[SilentGen] Fresh messages! Showing notification.`)
                } else {
                    console.log(`[SilentGen] User already saw these messages, no notification.`)
                }
            }
        } catch (error) {
            console.error('[SilentGen] Error:', error)
            // On error, keep notification FALSE - don't use stale cache
        } finally {
            setIsGeneratingPhoneMessages(false)
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
                        {fetchError.code === 403 ? t.common.noAccess : t.common.notFound}
                    </h2>
                    <p className="text-secondary mb-6">
                        {fetchError.message}
                    </p>
                    <button
                        onClick={() => router.push('/characters')}
                        className="btn-primary px-6 py-3 rounded-xl font-medium"
                    >
                        ← {t.common.backHome}
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
                <div className="animate-pulse text-secondary">{t.common.loading}</div>
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
                                        {/* 💔 FIX: Show broken heart for negative affection */}
                                        <span className="text-[10px]">
                                            {affectionPoints < 0 || relationshipStage === 'BROKEN' ? '💔' : LEVEL_EMOJIS[intimacyLevel]}
                                        </span>
                                        <span className="truncate text-[10px]">
                                            {affectionPoints < 0 || relationshipStage === 'BROKEN'
                                                ? (userLanguage === 'en' ? 'Broken' : 'Đã chia tay')
                                                : t.chat.intimacyLevels[intimacyLevel]}
                                        </span>
                                        <span className="text-[9px] opacity-70 whitespace-nowrap">
                                            {affectionPoints}/{STAGE_MAX_POINTS[relationshipStage] || 5000}
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
                                    <div className="w-full max-w-32 h-1.5 bg-gray-800/50 rounded-full overflow-hidden mt-1 border border-gray-700/30">
                                        <div
                                            className="h-full bg-gradient-to-r from-pink-500 to-rose-500 transition-all duration-700 ease-out shadow-[0_0_8px_rgba(236,72,153,0.5)]"
                                            style={{ width: `${Math.min(100, Math.max(0, ((affectionPoints || 0) / (STAGE_MAX_POINTS[relationshipStage] || 5000)) * 100))}%` }}
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
                                <p className="text-lg mb-2">{t.chat.startConversation}</p>
                                <p className="text-sm">
                                    {t.chat.waitingFrom.replace('{name}', character.name)}
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
                                placeholder={t.chat.placeholder.replace('{character}', character.name)}
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
                moonshotPresets={moonshotPresets}
                openrouterPresets={openrouterPresets}
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
                    // 🔒 HARD LOCK: Check unlock condition ONLY (NO DEV BYPASS)
                    const isUnlocked = phoneUnlocked || affectionPoints >= 101

                    console.log('[ChatPage] 🔒 onPhone click - HARD LOCK', {
                        phoneUnlocked,
                        affection: affectionPoints,
                        isUnlocked,
                        userEmail: user?.email
                    })

                    // Show lock modal if not unlocked
                    if (!isUnlocked) {
                        console.log('[ChatPage] ❌ Phone is LOCKED - affection < 101')
                        setShowPhoneLockedModal(true)
                        return
                    }

                    // ✅ SUCCESS: Unlocked properly
                    console.log('[ChatPage] ✅ Phone UNLOCKED - Opening Phone OS')

                    // Mark messages as "seen" - prevents stale notifications
                    lastSeenPhoneTimestampRef.current = Date.now()
                    setHasNewPhoneMessages(false)
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
                characterDescription={character?.persona} // CRITICAL: Pass persona for AI generation!
                messageCount={messages.length}
                userEmail={user?.email || undefined} // For DEV identity check (Rule #7)
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
                            {t.exit.title}
                        </h3>
                        <p className="text-sm text-secondary">
                            {t.exit.message}
                        </p>

                        {/* Phone messages notification hook */}
                        {hasNewPhoneMessages && (
                            <div className="bg-primary/20 border border-primary/40 rounded-xl p-3 animate-pulse">
                                <div className="flex items-center justify-center gap-2 text-sm">
                                    <span className="text-lg">📱</span>
                                    <span className="font-medium">{userLanguage === 'en' ? 'New phone messages!' : 'Có tin nhắn mới trong điện thoại!'}</span>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowExitConfirm(false)
                                        // Mark messages as "seen" - prevents stale notifications
                                        lastSeenPhoneTimestampRef.current = Date.now()
                                        setHasNewPhoneMessages(false)
                                        setShowPhoneOS(true)
                                    }}
                                    className="mt-2 text-xs text-primary hover:underline"
                                >
                                    {userLanguage === 'en' ? '→ Check phone' : '→ Xem điện thoại'}
                                </button>
                            </div>
                        )}
                        {isGeneratingPhoneMessages && (
                            <div className="text-xs text-secondary/70 flex items-center justify-center gap-1">
                                <span className="animate-spin">⏳</span>
                                <span>{userLanguage === 'en' ? 'Checking for updates...' : 'Đang kiểm tra...'}</span>
                            </div>
                        )}

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
                                {isAutoSaving ? t.exit.saving : t.exit.saveExit}
                            </button>
                            <button
                                onClick={() => {
                                    setShowExitConfirm(false)
                                    router.back()
                                }}
                                className="btn-secondary w-full"
                            >
                                {t.exit.exitOnly}
                            </button>
                            <button
                                onClick={() => setShowExitConfirm(false)}
                                className="text-sm text-secondary hover:text-white transition"
                            >
                                {t.exit.stay}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 💔 AI BREAKUP MODAL - Game Over Screen */}
            {isBrokenUp && (
                <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-6 animate-in fade-in duration-1000">
                    <div className="bg-gray-900 border border-red-500/50 p-8 rounded-2xl max-w-md text-center shadow-[0_0_50px_rgba(220,38,38,0.5)]">
                        <div className="text-6xl mb-4 animate-pulse">💔</div>
                        <h2 className="text-2xl font-bold text-red-500 mb-4">
                            {userLanguage === 'en' ? 'Relationship Broken' : 'Mối quan hệ đã tan vỡ'}
                        </h2>
                        <p className="text-gray-300 mb-8 leading-relaxed">
                            {userLanguage === 'en'
                                ? `${character?.name || 'They'} felt deeply hurt and doesn't want to continue this relationship anymore. Sometimes, words cut deeper than knives...`
                                : `${character?.name || 'Người ấy'} cảm thấy tổn thương sâu sắc và không muốn tiếp tục mối quan hệ này nữa. Đôi khi, lời nói sát thương còn đau hơn dao cứa...`}
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={async () => {
                                    setIsBrokenUp(false)
                                    await handleResetChat()
                                }}
                                disabled={isResetting}
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isResetting
                                    ? (userLanguage === 'en' ? '⏳ Resetting...' : '⏳ Đang reset...')
                                    : (userLanguage === 'en' ? '↺ Reset to start over' : '↺ Reset để làm lại từ đầu')}
                            </button>
                            <p className="text-xs text-gray-500 italic">
                                {userLanguage === 'en'
                                    ? '(You must reset to start a new conversation)'
                                    : '(Bạn buộc phải reset để bắt đầu một cuộc trò chuyện mới)'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* 🔥 NEW: Missing info warning popup */}
            {showMissingInfoWarning && (
                <MissingInfoWarningPopup
                    onClose={() => setShowMissingInfoWarning(false)}
                />
            )}


            {/* 🔒 Phone LOCKED Modal - shown when user taps Phone before unlock */}
            {showPhoneLockedModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-200">
                        <div className="text-6xl mb-4">🔒</div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                            Phone is Locked
                        </h3>
                        <p className="text-gray-600 mb-6">
                            {character?.name ? `Keep chatting with ${character.name} to unlock the Phone feature!` : 'Keep chatting to unlock the Phone feature!'}
                        </p>
                        <p className="text-sm text-gray-500 mb-6">
                            Reach a closer relationship (Affection ≥ 101) to access their private messages.
                        </p>
                        <button
                            onClick={() => setShowPhoneLockedModal(false)}
                            className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold rounded-xl hover:from-pink-600 hover:to-purple-600 transition-colors"
                        >
                            Got it! 💕
                        </button>
                    </div>
                </div>
            )}

            {/* 🎉 Phone UNLOCKED Celebration Popup - shown once when first unlocked */}
            {phoneJustUnlocked && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center animate-in zoom-in-95 duration-300 border-2 border-purple-200">
                        <div className="text-6xl mb-4 animate-bounce">🎉</div>
                        <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                            Phone Unlocked!
                        </h3>
                        <p className="text-gray-700 mb-2 font-semibold">
                            🎉 Chúc mừng! Bạn đã mở khóa tính năng Điện Thoại!
                        </p>
                        <p className="text-sm text-gray-500 mb-6">
                            Lần sau, hãy bấm vào icon Điện Thoại để mở lại nhé.
                        </p>
                        <button
                            onClick={() => {
                                setPhoneJustUnlocked(false);
                                setShowPhoneOS(true); // ✨ Immediately open Phone OS
                            }}
                            className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-colors shadow-lg"
                        >
                            Open Phone 📱
                        </button>
                    </div>
                </div>
            )}

            {/* 🧪 DEV TOOLS: Floating bubble (bottom-right) - Dev users only */}
            {isDev && character && (
                <div className="fixed bottom-24 right-4 z-[100]">
                    <DevRelationshipTools
                        characterId={characterId}
                        currentStage={relationshipStage}
                        currentAffection={affectionPoints}
                        onUpdate={(data) => {
                            setAffectionPoints(data.affectionPoints)
                            setIntimacyLevel(data.intimacyLevel)
                            setRelationshipStage(data.stage)
                        }}
                        userId={user?.uid}
                        userEmail={user?.email}
                        characterName={character.name}
                        userName={user?.displayName || 'User'}
                        onQuickGenComplete={() => {
                            // Reload messages and character after Quick Gen
                            loadMessages()
                            loadCharacter()
                        }}
                        onPhoneJustUnlocked={() => {
                            // 🎉 Trigger celebration modal
                            console.log('[ChatPage] 🎉 onPhoneJustUnlocked triggered - showing celebration modal!')
                            setPhoneJustUnlocked(true)
                            setPhoneUnlocked(true)  // Also update the unlocked state
                        }}
                    />
                </div>
            )}
        </>
    )
}
