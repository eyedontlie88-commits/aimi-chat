import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth/require-auth'
import { generateWithFallback, generateWithSmartFallback, type SmartFallbackResult } from '@/lib/llm/fallback'
import { buildChatPrompt } from '@/lib/prompt/builder'
import { updateRelationshipStats } from '@/lib/relationship'
import type { SceneState, LLMProviderId } from '@/lib/llm/types'

export const dynamic = 'force-dynamic'

// 💣 REBALANCED: Conservative scoring for micro-progression (+1 to +5 per message)
const SCORING_INSTRUCTION = `
[CRITICAL SYSTEM REQUIREMENT]
You MUST evaluate user's message impact on a CONSERVATIVE scale.

Impact Range: -5 to +5 (STRICT - do NOT exceed)

Scoring Guidelines:
+5: Life-changing romantic confession, marriage proposal, deep vulnerability
+4: Strong sincere compliment, caring gesture, emotional support
+3: Genuine sweet message, flirting, showing interest
+2: Normal positive interaction, friendly conversation
+1: Polite response, neutral-positive acknowledgment
0: Completely neutral, irrelevant, or unclear intent
-1: Slightly dismissive, cold, brief
-2: Rude tone, ignoring, showing disinterest
-3: Hurtful comment, insult, criticism
-4: Major fight, accusation, toxic behavior
-5: Breakup threat, betrayal, unforgivable words

CONTEXT AWARENESS (ANTI-SPAM):
- Repeated compliments within 5 messages: Reduce score to +1 or +2
- Repeated apologies within 3 messages: Reduce score to +0 or +1
- Sarcasm detected: Make negative even if words seem positive
- User asking for forgiveness after hurtful words: Give +2 to +3 (not +5)

Response Format:
Always end your reply with this JSON block:
\`\`\`json
{"impact": <-5 to +5 INTEGER>, "reaction": "NONE|LIKE|HEARTBEAT", "reason": "<brief explanation>"}
\`\`\`

Examples:
User: "You're so beautiful" → impact: +3, reason: "Genuine compliment"
User: "sorry sorry sorry" (3rd time) → impact: +1, reason: "Apology spam detected"
User: "whatever" → impact: -2, reason: "Dismissive tone"

DO NOT include any text after the JSON block.
`

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
        // 🛡️ PER-USER COOLDOWN: Prevent rapid spam across all characters (DB-based, serverless-safe)
        // ============================================
        const COOLDOWN_MS = 2000 // 2 seconds

        if (profile.lastChatAt) {
            const timeSinceLastMessage = Date.now() - profile.lastChatAt.getTime()
            if (timeSinceLastMessage < COOLDOWN_MS) {
                const waitSeconds = Math.ceil((COOLDOWN_MS - timeSinceLastMessage) / 1000)
                return NextResponse.json(
                    {
                        error: `Bạn gửi nhanh quá, chờ ${waitSeconds} giây nhé 😊`,
                        cooldown: true
                    },
                    { status: 429 }
                )
            }
        }

        // ============================================
        // ❤️ HEARTS QUOTA: Daily limit (30 hearts/day, resets at UTC midnight)
        // ============================================
        const MAX_HEARTS = 30
        const now = new Date()

        // Check if hearts need reset (UTC midnight)
        if (!profile.heartsResetAt || now >= profile.heartsResetAt) {
            const nextMidnight = new Date(now)
            nextMidnight.setUTCHours(24, 0, 0, 0) // Next UTC midnight

            await prisma.userProfile.update({
                where: { id: uid },
                data: {
                    heartsRemaining: MAX_HEARTS,
                    heartsResetAt: nextMidnight,
                },
            })

            // Update local profile object
            profile.heartsRemaining = MAX_HEARTS
            profile.heartsResetAt = nextMidnight
        }

        // Check if user has hearts remaining
        if (profile.heartsRemaining <= 0) {
            const resetTime = profile.heartsResetAt?.toISOString() || new Date().toISOString()
            return NextResponse.json(
                {
                    error: 'OUT_OF_HEARTS',
                    detail: 'Bạn đã hết hearts hôm nay. Hearts sẽ được reset vào lúc nửa đêm UTC.',
                    heartsRemaining: 0,
                    heartsResetAt: resetTime,
                },
                { status: 402 }
            )
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

        // ============================================
        // 🛡️ PROVIDER VALIDATION: Block unsupported providers gracefully
        // ============================================
        const SUPPORTED_PROVIDERS = ['silicon', 'gemini', 'zhipu', 'moonshot', 'openrouter', 'default']

        if (!SUPPORTED_PROVIDERS.includes(preferredProvider)) {
            console.warn(`[Chat API] ⚠️ Unsupported provider "${preferredProvider}" - returning friendly message`)

            // Save user message
            await prisma.message.create({
                data: {
                    characterId,
                    role: 'user',
                    content: message,
                },
            })

            // Save assistant message explaining the issue
            const disabledMessage = `⚠️ Provider "${preferredProvider}" is currently disabled.\n\nPlease open Settings and select one of: Gemini, DeepSeek, SiliconFlow, Moonshot, or OpenRouter.`

            const assistantMsg = await prisma.message.create({
                data: {
                    characterId,
                    role: 'assistant',
                    content: disabledMessage,
                    reactionType: 'NONE',
                },
            })

            // Update message count
            await prisma.relationshipConfig.update({
                where: { characterId },
                data: { messageCount: { increment: 2 } },
            })

            return NextResponse.json({
                reply: disabledMessage,
                messageId: assistantMsg.id,
                providerUsed: 'none',
                modelUsed: 'none',
                relationship: {
                    affectionPoints: relationshipConfig?.affectionPoints || 0,
                    intimacyLevel: relationshipConfig?.intimacyLevel || 0,
                    stage: relationshipConfig?.stage || 'STRANGER',
                    messageCount: (relationshipConfig?.messageCount || 0) + 2,
                },
            })
        }

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

        // 💣 NUCLEAR INJECTION: Force AI to score by appending instruction to user message
        // This ensures AI sees it right before responding, can't ignore it
        userContent = `${userContent}

${SCORING_INSTRUCTION}`

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

        // ============================================
        // 🎯 SMART MODEL SELECTION
        // Uses message length to select optimal model
        // Long messages (≥100 words) → Vietnamese-optimized models
        // Short messages (<100 words) → Fast models
        // ============================================

        let aiResponse: string
        let providerUsed: LLMProviderId
        let modelUsed: string
        let attemptCount: number
        let fallbackUsed: boolean
        let messageCategory: 'short' | 'long' = 'short'

        // Check if character has a custom model configured
        const hasCustomModel = preferredModel && preferredModel !== 'default'

        if (hasCustomModel) {
            // Use character's preferred model with classic fallback
            console.log(`[Chat API] 🎮 Using character's preferred model: ${preferredProvider}/${preferredModel}`)

            const result = await generateWithFallback(
                promptMessages,
                preferredProvider,
                preferredModel
            )

            aiResponse = result.reply
            providerUsed = result.providerUsed
            modelUsed = result.modelUsed
            attemptCount = result.attemptCount
            fallbackUsed = result.fallbackUsed
        } else {
            // Use SMART model selection based on message length
            console.log('[Chat API] 🧠 Using SMART model selection based on message length...')

            const result = await generateWithSmartFallback(
                promptMessages,
                userLanguage || 'vi'
            )

            aiResponse = result.reply
            providerUsed = result.providerUsed
            modelUsed = result.modelUsed
            attemptCount = result.attemptCount
            fallbackUsed = result.fallbackUsed
            messageCategory = result.category

            console.log(`[Chat API] 📊 Smart Selection: ${messageCategory.toUpperCase()} mode, ${result.wordCount} words, maxTokens=${result.maxTokensUsed}`)
        }

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

        // --- DEEP SEARCH PARSER: Find JSON anywhere in response ---
        let impactScore = 0
        let reactionType = 'NONE'
        let reactionReason = ''
        let text = aiResponse || ''

        // 👁️ DEBUG: Show first 100 chars of raw AI response
        console.log('🤖 RAW AI REPLY:', text.substring(0, 100) + '...')

        try {
            // 🔥 ULTRA-AGGRESSIVE: Find ANY JSON block containing "impact"
            const deepMatch = text.match(/(\{[\s\S]*"impact"[\s\S]*\})/i)

            if (deepMatch) {
                // Fix common JSON errors (trailing commas, missing brackets)
                const fixedJson = deepMatch[1].replace(/,\s*}/g, '}')

                try {
                    // Attempt to parse found JSON
                    const metadata = JSON.parse(fixedJson)

                    // Validate and extract data
                    if (typeof metadata.impact === 'number') {
                        impactScore = Math.max(-5, Math.min(5, metadata.impact))
                    }
                    if (metadata.reaction) reactionType = metadata.reaction.toUpperCase()
                    if (metadata.reason) reactionReason = metadata.reason

                    console.log(`✅ [SCORING SUCCESS] Impact: ${impactScore}, Reaction: ${reactionType}`)

                    // Clean up: Remove JSON from display text
                    text = text.replace(deepMatch[0], '').trim()
                    // Remove leftover markdown blocks
                    text = text.replace(/```json/gi, '').replace(/```/gi, '').trim()

                } catch (parseErr) {
                    console.warn('⚠️ [SCORING ERROR] Parse failed:', parseErr)
                }
            } else {
                console.log('❌ [SCORING FAILED] No JSON found in response.')
            }
        } catch (e) {
            console.error('⚠️ [SCORING ERROR] Critical parser error:', e)
        }
        // --- END DEEP SEARCH PARSER ---

        // Check for dev force reaction (non-production only)
        const devForceReaction = body.devForceReaction
        const isDev = process.env.NODE_ENV !== 'production'

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

        let cleanedReply = text

        // 🛡️ FALLBACK: If AI returned only JSON without text, generate contextual fallback
        if (!cleanedReply || cleanedReply.trim().length === 0) {
            console.warn('[Chat API] ⚠️ AI returned only metadata, using fallback reply')

            // Generate contextual fallback based on impact score
            if (impactScore > 0) {
                cleanedReply = '❤️'
            } else if (impactScore < 0) {
                cleanedReply = '...'
            } else {
                cleanedReply = 'Ừm...'
            }
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

        // Update user's last chat timestamp (only after message successfully saved)
        await prisma.userProfile.update({
            where: { id: uid },
            data: { lastChatAt: new Date() },
        })

        // Decrement hearts (atomic)
        await prisma.userProfile.update({
            where: { id: uid },
            data: { heartsRemaining: { decrement: 1 } },
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
                            // Derive base URL from request headers or use NEXT_PUBLIC_APP_URL
                            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
                            fetch(`${baseUrl}/api/phone-content/generate`, {
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
            // 💔 AI BREAKUP: Include broken flag for frontend
            isBroken: updatedRelationship.isBroken,
            // TASK B: Include impact for micro-feedback UI
            impactScaled: impactScore * 3, // Scaled impact applied to affection
            // 🟢 LIVE AI MONITOR: Include provider/model info for frontend
            meta: {
                provider: providerUsed,
                model: modelUsed,
                // 🎯 Smart Model Selection: message category (short/long)
                category: messageCategory,
                // ❤️ Hearts quota: remaining + reset time
                heartsRemaining: profile.heartsRemaining - 1, // Show decremented value
                heartsResetAt: profile.heartsResetAt?.toISOString(),
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
            const attemptDetails = error.attempts || []
            
            // Build detailed error message showing what was tried
            let errorDetail = `Tất cả mô hình AI đều đang quá tải hoặc hết quota. Bạn thử lại sau một chút nhé.`
            
            // Add provider list in parentheses
            if (providersTried) {
                errorDetail += ` (Đã thử: ${providersTried})`
            }
            
            // Log detailed attempt info for debugging (server-side only)
            console.error('[Chat API] All providers failed. Attempt details:', 
                attemptDetails.map((a: any) => ({
                    provider: a.provider,
                    model: a.model,
                    status: a.status,
                    category: a.category
                }))
            )
            
            return NextResponse.json(
                {
                    error: 'LLM_ERROR',
                    detail: errorDetail,
                    providersTried: providersTried, // Include in response for client debugging
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
