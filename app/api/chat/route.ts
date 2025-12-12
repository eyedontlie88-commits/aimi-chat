import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateWithProviders } from '@/lib/llm'
import { buildChatPrompt } from '@/lib/prompt/builder'
import { updateRelationshipStats } from '@/lib/relationship'
import type { SceneState, LLMProviderId } from '@/lib/llm/types'

const USER_ID = 'me'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { characterId, message, sceneState, replyToMessageId } = body

        if (!characterId || !message) {
            return NextResponse.json({ error: 'characterId and message are required' }, { status: 400 })
        }

        // Load all required context
        const [character, userProfile, relationshipConfig] = await Promise.all([
            prisma.character.findUnique({ where: { id: characterId } }),
            prisma.userProfile.findUnique({ where: { id: USER_ID } }),
            prisma.relationshipConfig.findUnique({ where: { characterId } }),
        ])

        if (!character) {
            return NextResponse.json({ error: 'Character not found' }, { status: 404 })
        }

        if (!userProfile) {
            return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
        }

        if (!relationshipConfig) {
            return NextResponse.json({ error: 'Relationship config not found' }, { status: 404 })
        }

        // Load recent messages (last 20 for context)
        const recentMessages = await prisma.message.findMany({
            where: { characterId },
            orderBy: { createdAt: 'desc' },
            take: 20,
        })
        const messagesForContext = recentMessages.reverse() // Chronological order

        // Load relevant memories (only public ones for prompt)
        const memories = await prisma.memory.findMany({
            where: {
                characterId,
                visibility: 'public', // Only include public memories in prompt
            },
            orderBy: [{ importanceScore: 'desc' }, { createdAt: 'desc' }],
            take: 10,
        })


        // Build base prompt from system + history
        const basePromptMessages = buildChatPrompt({
            character,
            userProfile,
            relationshipConfig,
            memories,
            recentMessages: messagesForContext,
            sceneState: sceneState as SceneState | undefined,
        })

        // Determine effective provider and model
        const rawProvider = (character.provider || 'default') as LLMProviderId | 'default'
        const rawModel = character.modelName && character.modelName !== 'default' ? character.modelName : undefined

        const defaultProviderEnv = (process.env.LLM_DEFAULT_PROVIDER as LLMProviderId) || 'silicon'
        const preferredProvider: LLMProviderId = rawProvider === 'default' ? defaultProviderEnv : rawProvider

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
                const replyAuthor = replyToMessage.role === 'user' ? userProfile.nicknameForUser : character.name
                userContent = `[Ngữ cảnh: Tin nhắn này đang trả lời tin nhắn trước của ${replyAuthor}: "${replyToMessage.content.slice(0, 200)}${replyToMessage.content.length > 200 ? '...' : ''}"]
${message}`
            }
        }

        const promptMessages = [
            ...basePromptMessages,
            {
                role: 'user' as const,
                content: userContent,
            },
        ]

        // Generate AI response
        const { reply: aiResponse, providerUsed, modelUsed } = await generateWithProviders(promptMessages, {
            provider: preferredProvider,
            model: preferredModel,
        })

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
        const updatedRelationship = await updateRelationshipStats(characterId, impactScore, message)

        return NextResponse.json({
            reply: cleanedReply,
            messageId: assistantMessage.id,
            relationship: updatedRelationship,
            reaction: reactionType,
            reactionReason,
            // TASK B: Include impact for micro-feedback UI
            impactScaled: impactScore * 3, // Scaled impact applied to affection
        })
    } catch (error: any) {
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
