import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth/require-auth'
import { generateWithFallback } from '@/lib/llm/fallback'
import { buildChatPrompt } from '@/lib/prompt/builder'
import { updateRelationshipStats } from '@/lib/relationship'
import type { SceneState, LLMProviderId } from '@/lib/llm/types'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
    try {
        const authContext = await getAuthContext(request)
        const { uid, prisma, isAuthed } = authContext

        // Block guest users from chatting
        if (!isAuthed) {
            console.log('[Auth] Guest cannot chat - login required')
            return NextResponse.json(
                { error: 'Vui lòng đăng nhập để nhắn tin', requiresAuth: true },
                { status: 403 }
            )
        }

        const body = await request.json()
        const { characterId, message, sceneState, replyToMessageId, sceneGoal, nextDirection, userLanguage } = body

        if (!characterId || !message) {
            return NextResponse.json({ error: 'characterId and message are required' }, { status: 400 })
        }

        // Verify character belongs to this user
        const relationshipConfig = await prisma.relationshipConfig.findFirst({
            where: { characterId, userId: uid },
        })

        if (!relationshipConfig) {
            return NextResponse.json({ error: 'Character not found' }, { status: 404 })
        }

        // Load all required context
        const [character, userProfile] = await Promise.all([
            prisma.character.findUnique({ where: { id: characterId } }),
            prisma.userProfile.findUnique({ where: { id: uid } }),
        ])

        if (!character) {
            return NextResponse.json({ error: 'Character not found' }, { status: 404 })
        }

        // Create user profile if doesn't exist (for authenticated users)
        let profile = userProfile
        if (!profile) {
            profile = await prisma.userProfile.create({
                data: {
                    id: uid,
                    displayName: 'Bạn',
                    nicknameForUser: 'em',
                },
            })
        }

        // ============================================
        // ADAPTIVE CONTEXT WINDOW
        // Different providers have different context capacities
        // ============================================
        const getContextLimits = (provider: string): { historyLimit: number; memoryLimit: number } => {
            // Normalize provider name
            const p = (provider || 'default').toLowerCase()

            // HIGH CONTEXT TIER: Google Gemini (1M+ tokens)
            if (p === 'gemini' || p === 'google') {
                return { historyLimit: 100, memoryLimit: 30 }
            }

            // STANDARD CONTEXT TIER: SiliconFlow, DeepSeek, Qwen, Moonshot (32k-128k tokens)
            if (['silicon', 'siliconflow', 'deepseek', 'qwen', 'moonshot'].includes(p)) {
                return { historyLimit: 50, memoryLimit: 15 }
            }

            // DEFAULT TIER: Unknown or fallback providers
            return { historyLimit: 30, memoryLimit: 10 }
        }

        // Determine effective provider
        const rawProvider = (character.provider || 'default') as LLMProviderId | 'default'
        const defaultProviderEnv = (process.env.LLM_DEFAULT_PROVIDER as LLMProviderId) || 'silicon'
        const effectiveProvider = rawProvider === 'default' ? defaultProviderEnv : rawProvider

        // Get adaptive limits based on provider
        const { historyLimit, memoryLimit } = getContextLimits(effectiveProvider)
        console.log(`[Chat API] Adaptive Context: provider=${effectiveProvider}, history=${historyLimit}, memories=${memoryLimit}`)

        // Load recent messages (adaptive limit for context)
        const recentMessages = await prisma.message.findMany({
            where: { characterId },
            orderBy: { createdAt: 'desc' },
            take: historyLimit,
        })
        const messagesForContext = recentMessages.reverse() // Chronological order

        // Load relevant memories (adaptive limit, only public ones for prompt)
        const memories = await prisma.memory.findMany({
            where: {
                characterId,
                visibility: 'public', // Only include public memories in prompt
            },
            orderBy: [{ importanceScore: 'desc' }, { createdAt: 'desc' }],
            take: memoryLimit,
        })


        // Build base prompt from system + history
        const basePromptMessages = buildChatPrompt({
            character,
            userProfile: profile,
            relationshipConfig,
            memories,
            recentMessages: messagesForContext,
            sceneState: sceneState as SceneState | undefined,
            userLanguage: userLanguage || 'vi', // Default to Vietnamese
        })

        // Determine effective model (provider already determined above for context limits)
        const rawModel = character.modelName && character.modelName !== 'default' ? character.modelName : undefined
        const preferredProvider: LLMProviderId = effectiveProvider as LLMProviderId

        const defaultModelEnv = process.env.LLM_DEFAULT_MODEL
        const preferredModel = rawModel || defaultModelEnv || undefined

        // CRITICAL: Always append current user message to prompt
        // (Otherwise Gemini receives empty contents array on first message)
        let userContent = sceneState
            ? `[Phone check scene] ${sceneState.description}`
            : message

        // If replying to a message, add context for LLM
        if (replyToMessageId) {
            const replyToMessage = await prisma.message.findUnique({
                where: { id: replyToMessageId },
                select: { role: true, content: true },
            })
            if (replyToMessage) {
                const replyAuthor = replyToMessage.role === 'user' ? profile.nicknameForUser : character.name
                userContent = `[Ngữ cảnh: Tin nhắn này đang trả lời tin nhắn trước của ${replyAuthor}: "${replyToMessage.content.slice(0, 200)}${replyToMessage.content.length > 200 ? '...' : ''}"]
${message}`
            }
        }

        // ============================================
        // 🎬 SCENE DIRECTOR - NARRATIVE CONTROL
        // Inject user-provided scene context and directions
        // ============================================

        // Long-term Scene Goal: Prepend as persistent context for entire session
        if (sceneGoal && sceneGoal.trim()) {
            userContent = `[IMPORTANT SCENE CONTEXT - Follow this throughout the conversation:]
${sceneGoal.trim()}

[User's message:]
${userContent}`
            console.log('[Chat API] 🎬 Scene Goal active:', sceneGoal.substring(0, 50) + '...')
        }

        // Quick Direction: Append as one-time instruction for this response only
        if (nextDirection && nextDirection.trim()) {
            userContent = `${userContent}

[INSTRUCTION FOR YOUR NEXT RESPONSE ONLY - After reading, execute this direction:]
${nextDirection.trim()}`
            console.log('[Chat API] 🎬 Next Direction:', nextDirection.substring(0, 50) + '...')
        }

        const promptMessages = [
            ...basePromptMessages,
            {
                role: 'user' as const,
                content: userContent,
            },
        ]

        // LANGUAGE LOCKDOWN: Add final English reminder if user prefers English
        // This is the last safeguard to prevent Vietnamese responses
        if (userLanguage === 'en') {
            promptMessages.push({
                role: 'system' as const,
                content: '⚠️ CRITICAL REMINDER: Reply in ENGLISH ONLY. Do NOT use Vietnamese AT ALL. This is a strict requirement.',
            })
        }

        // Generate AI response with Smart Fallback Chain
        // "Không bỏ lại User phía sau" - tries multiple models if primary fails
        const { reply: aiResponse, providerUsed, modelUsed, attemptCount, fallbackUsed } = await generateWithFallback(
            promptMessages,
            preferredProvider,
            preferredModel
        )

        if (fallbackUsed) {
            console.log(`[Chat API] ⚠️ Fallback used: ${providerUsed}/${modelUsed} (attempt ${attemptCount})`)
        }

        // ============================================
        // TASK A: Parse and ALWAYS strip [METADATA]
        // ============================================

        // Helper: Always strip metadata from text (best-effort even on parse fail)
        const stripMetadata = (rawText: string): string => {
            let clean = rawText
            // Strip [METADATA]{...} format (greedy to catch multiline)
            clean = clean.replace(/\[METADATA\]\s*\{[\s\S]*?\}/gi, '')
            // Strip ```json blocks
            clean = clean.replace(/```json[\s\S]*?```/gi, '')
            // Strip trailing JSON objects (common LLM behavior)
            clean = clean.replace(/\n\s*\{[^{}]*"impact"[^{}]*\}\s*$/gi, '')
            // Final trim
            return clean.trim()
        }

        // P0.1: Default impact = 0 (safe on parse fail)
        let impactScore = 0
        let reactionType = 'NONE'
        let reactionReason = ''
        let text = aiResponse || ''

        // Check for dev force reaction (non-production only)
        const devForceReaction = body.devForceReaction
        const isDev = process.env.NODE_ENV !== 'production'

        try {
            // Look for [METADATA]{...} format
            const metadataMatch = text.match(/\[METADATA\]\s*(\{[\s\S]*?\})/i)

            // Fallback to ```json block
            const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/)

            // Fallback to trailing JSON with "impact" key
            const trailingJsonMatch = text.match(/\n\s*(\{[^{}]*"impact"[^{}]*\})\s*$/)

            const jsonMatch = metadataMatch || jsonBlockMatch || trailingJsonMatch

            if (jsonMatch) {
                const jsonStr = jsonMatch[1]
                const metadata = JSON.parse(jsonStr)

                // Parse impact
                if (typeof metadata.impact === 'number') {
                    impactScore = Math.max(-2, Math.min(2, metadata.impact))
                }

                // Parse reaction
                if (metadata.reaction && ['NONE', 'LIKE', 'HEARTBEAT'].includes(metadata.reaction.toUpperCase())) {
                    reactionType = metadata.reaction.toUpperCase()
                }

                if (metadata.reason) {
                    reactionReason = metadata.reason
                }
            }
        } catch (e) {
            console.error('[Chat API] Failed to parse metadata JSON:', e)
            // impactScore stays 0, reactionType stays NONE
        }

        // CRITICAL: Always strip metadata from text (even on parse fail)
        text = stripMetadata(text)

        // Dev force reaction override (non-production only)
        if (isDev && devForceReaction && ['NONE', 'LIKE', 'HEARTBEAT'].includes(devForceReaction.toUpperCase())) {
            reactionType = devForceReaction.toUpperCase()
            impactScore = devForceReaction.toUpperCase() === 'HEARTBEAT' ? 2 : 1
            console.log(`[Chat API] 🧪 DEV FORCE: reaction=${reactionType}, impact=${impactScore}`)
        }

        // P0.2: Validate reaction by stage - STRANGER/ACQUAINTANCE cannot get HEARTBEAT
        const currentStage = relationshipConfig?.stage || 'UNDEFINED'
        if (['STRANGER', 'ACQUAINTANCE', 'UNDEFINED'].includes(currentStage) && reactionType === 'HEARTBEAT') {
            console.log(`[Chat API] ⬇️ Downgrade HEARTBEAT → LIKE (stage=${currentStage})`)
            reactionType = 'LIKE'
        }

        const cleanedReply = text

        if (!cleanedReply) {
            console.error('[Chat API] Empty AI response')
            return NextResponse.json(
                {
                    error: 'LLM_EMPTY_REPLY',
                    detail: 'AI trả về câu trả lời rỗng, vui lòng nhắn lại.',
                },
                { status: 500 }
            )
        }

        // Log for debugging
        console.log(`[Chat API] ${providerUsed}/${modelUsed} | Impact: ${impactScore} | Reaction: ${reactionType} | Reason: ${reactionReason}`)

        // Save user message with reaction
        const userMessage = await prisma.message.create({
            data: {
                characterId,
                role: 'user',
                content: message,
                sceneState: sceneState ? JSON.stringify(sceneState) : null,
                replyToMessageId: replyToMessageId || null,
                reactionType: reactionType !== 'NONE' ? reactionType : null, // Save only if not NONE
            },
        })

        // Save assistant message (clean - no metadata)
        const assistantMessage = await prisma.message.create({
            data: {
                characterId,
                role: 'assistant',
                content: cleanedReply,
            },
        })

        // Update relationship stats (pass user message for apology detection)
        const updatedRelationship = await updateRelationshipStats(prisma, characterId, impactScore, message)

        // PHONE CONTENT AUTO-UPDATE: Increment counter and trigger if threshold reached
        try {
            const character = await prisma.character.findUnique({
                where: { id: characterId },
                select: {
                    phoneMessageCount: true,
                    phoneUpdateFrequency: true,
                    phoneAutoUpdate: true,
                    phoneLastUpdated: true,
                    name: true
                }
            })

            console.log(`[PhoneContent] Auto-update check for ${character?.name}:`, {
                autoUpdate: character?.phoneAutoUpdate,
                currentCount: character?.phoneMessageCount,
                frequency: character?.phoneUpdateFrequency,
                lastUpdated: character?.phoneLastUpdated
            })

            if (character && character.phoneAutoUpdate) {
                const newCount = (character.phoneMessageCount || 0) + 1

                // Check if message is trivial (skip increment for very short messages)
                const isTrivial = message.trim().length < 5 ||
                    /^(ok|okay|yes|no|yeah|yep|nope|ừ|à|ờ|ô|ồ|ừm|uhm|hm|hmm|lol|haha|hihi)$/i.test(message.trim())

                console.log(`[PhoneContent] Message trivial check: "${message.substring(0, 20)}..." = ${isTrivial}`)

                if (!isTrivial) {
                    // Increment counter
                    await prisma.character.update({
                        where: { id: characterId },
                        data: { phoneMessageCount: newCount }
                    })
                    console.log(`[PhoneContent] Counter incremented: ${newCount}`)

                    // Check if threshold reached
                    const threshold = character.phoneUpdateFrequency || 20
                    console.log(`[PhoneContent] Threshold check: ${newCount} >= ${threshold} = ${newCount >= threshold}`)

                    if (newCount >= threshold) {
                        // Check 5-minute cooldown
                        const timeSinceLastUpdate = character.phoneLastUpdated
                            ? Date.now() - new Date(character.phoneLastUpdated).getTime()
                            : Infinity
                        const fiveMinutes = 5 * 60 * 1000

                        console.log(`[PhoneContent] Cooldown check: ${timeSinceLastUpdate}ms since last update (need ${fiveMinutes}ms)`)

                        if (timeSinceLastUpdate >= fiveMinutes) {
                            console.log(`[PhoneContent] ✅ Auto-trigger for ${character.name} (${newCount} messages)`)

                            // Trigger background generation (fire-and-forget)
                            fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/phone-content/generate`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ characterId, forceRefresh: false })
                            }).catch(err => console.error('[PhoneContent] Auto-trigger failed:', err))
                        } else {
                            console.log(`[PhoneContent] ⏳ Cooldown not passed, skipping auto-trigger`)
                        }
                    }
                } else {
                    console.log(`[PhoneContent] Skipped increment for trivial message`)
                }
            } else {
                console.log(`[PhoneContent] Auto-update disabled for this character`)
            }
        } catch (phoneError) {
            // Don't fail the chat if phone content update fails
            console.error('[PhoneContent] Auto-trigger error:', phoneError)
        }

        return NextResponse.json({
            reply: cleanedReply,
            messageId: assistantMessage.id,
            relationship: updatedRelationship,
            reaction: reactionType,
            reactionReason,
            // TASK B: Include impact for micro-feedback UI
            impactScaled: impactScore * 3, // Scaled impact applied to affection
            // 🟢 LIVE AI MONITOR: Include provider/model info for frontend
            meta: {
                provider: providerUsed,
                model: modelUsed,
            },
        })
    } catch (error: any) {
        if (isAuthError(error)) {
            return NextResponse.json({ error: error.message }, { status: 401 })
        }

        console.error('[Chat API] LLM error:', error?.response?.data || error?.message || error)

        const code = error?.code

        // Handle case when all fallback providers failed
        if (code === 'LLM_ALL_PROVIDERS_FAILED') {
            const providersTried = (error.providersTried || []).join(', ')
            return NextResponse.json(
                {
                    error: 'LLM_ERROR',
                    detail: `Tất cả mô hình AI đều đang quá tải hoặc hết quota. Bạn thử lại sau một chút nhé. (Đã thử: ${providersTried})`,
                },
                { status: 503 }
            )
        }

        return NextResponse.json(
            {
                error: 'LLM_ERROR',
                detail: error?.response?.data || error?.message || 'Unknown error - AI không trả lời được'
            },
            { status: 500 }
        )
    }
}
