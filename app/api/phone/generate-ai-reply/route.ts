import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client'
import { generateWithProviders } from '@/lib/llm/router'
import { LLMMessage } from '@/lib/llm/types'

/**
 * API Route: Generate AI Reply for Phone Conversation
 * POST /api/phone/generate-ai-reply
 * 
 * PURPOSE: Generate AI reply that READS chat history and responds meaningfully.
 * This is the ONLY place where AI generates individual conversation replies.
 * 
 * Features:
 * - Rate limiting (60s for users, bypass for devs)
 * - Reads last 20 messages for context
 * - Saves AI reply to database
 * - Updates rate limit timestamp
 * - 🆕 Sentiment analysis & affection points update
 */

// 🔐 DEV EMAILS - can bypass rate limits
const DEV_EMAILS = ['eyedontlie88@gmail.com', 'giangcm987@gmail.com']

// ============================================
// 🆕 SENTIMENT ANALYSIS SYSTEM
// Copied from /api/chat/route.ts for consistency
// ============================================

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

/**
 * Parse AI response to extract sentiment metadata
 * Returns cleaned reply without JSON block + extracted impact score
 */
function parseAIResponseWithSentiment(rawResponse: string): {
    cleanedReply: string
    impactScore: number
    reactionType: string
} {
    let text = rawResponse
    let impactScore = 0
    let reactionType = 'NONE'

    try {
        // 🔥 Find JSON block containing "impact"
        const deepMatch = text.match(/(\{[\s\S]*"impact"[\s\S]*\})/i)

        if (deepMatch) {
            // Fix common JSON errors (trailing commas)
            const fixedJson = deepMatch[1].replace(/,\s*}/g, '}')

            try {
                const metadata = JSON.parse(fixedJson)

                // Validate and extract data
                if (typeof metadata.impact === 'number') {
                    impactScore = Math.max(-5, Math.min(5, metadata.impact))
                }
                if (metadata.reaction) {
                    reactionType = metadata.reaction.toUpperCase()
                }

                console.log(`[Sentiment Parser] ✅ Parsed: impact=${impactScore}, reaction=${reactionType}`)

                // Remove JSON from display text
                text = text.replace(deepMatch[0], '').trim()
                // Remove leftover markdown blocks
                text = text.replace(/```json/gi, '').replace(/```/gi, '').trim()

            } catch (parseErr) {
                console.warn('[Sentiment Parser] ⚠️ JSON parse failed:', parseErr)
            }
        } else {
            console.log('[Sentiment Parser] ❌ No JSON found in response')
        }
    } catch (e) {
        console.error('[Sentiment Parser] 🔥 Critical error:', e)
    }

    return {
        cleanedReply: text,
        impactScore,
        reactionType
    }
}

/**
 * Map impact score (-20 to +20) to sentiment category
 */
function mapImpactToSentiment(impact: number): 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' {
    if (impact > 0) return 'POSITIVE'
    if (impact < 0) return 'NEGATIVE'
    return 'NEUTRAL'
}

// ============================================
// END SENTIMENT ANALYSIS SYSTEM
// ============================================

interface GenerateAIReplyRequest {
    conversationId: string
    characterId: string
    senderName: string
    characterName?: string
    characterDescription?: string
    userEmail?: string
    forceTrigger?: boolean
    userLanguage?: 'en' | 'vi'
}

export async function POST(req: NextRequest) {
    try {
        const body: GenerateAIReplyRequest = await req.json()
        const {
            conversationId,
            characterId,
            senderName,
            characterName,
            characterDescription,
            userEmail,
            forceTrigger = false,
            userLanguage = 'vi'
        } = body

        console.log(`[AI Reply] 🤖 Generating reply for conversation: ${conversationId}`)

        // 1. Validation
        if (!conversationId) {
            return NextResponse.json({ error: 'conversationId is required' }, { status: 400 })
        }

        if (!isSupabaseConfigured() || !supabase) {
            console.error('[AI Reply] ❌ Supabase not configured')
            return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
        }

        // 2. Check if dev user (can bypass rate limits)
        const isDev = userEmail && DEV_EMAILS.includes(userEmail)
        console.log(`[AI Reply] 👤 User: ${userEmail || 'anonymous'}, isDev: ${isDev}`)

        // 3. Rate limit check (60 seconds for non-devs)
        if (!isDev && !forceTrigger) {
            const { data: conv } = await supabase
                .from('phone_conversations')
                .select('last_generated_at')
                .eq('id', conversationId)
                .limit(1)
                .single()

            if (conv?.last_generated_at) {
                const elapsed = Date.now() - new Date(conv.last_generated_at).getTime()
                if (elapsed < 60000) { // 60 seconds
                    const remainingSeconds = Math.ceil((60000 - elapsed) / 1000)
                    console.log(`[AI Reply] ⏱️ Rate limited. Wait ${remainingSeconds}s`)
                    return NextResponse.json({
                        error: 'Rate limited',
                        message: `Please wait ${remainingSeconds} seconds before generating again`,
                        remainingSeconds
                    }, { status: 429 })
                }
            }
        }

        // 4. Fetch recent chat history (last 20 messages)
        console.log(`[AI Reply] 📖 Fetching chat history...`)
        const { data: messages, error: fetchError } = await supabase
            .from('phone_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false })
            .limit(20)

        if (fetchError) {
            console.error('[AI Reply] ❌ Error fetching messages:', fetchError)
            return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
        }

        // Reverse to chronological order
        const chatHistory = (messages || []).reverse()
        console.log(`[AI Reply] 📜 Found ${chatHistory.length} messages in history`)

        // 5. Check if there's anything to reply to
        if (chatHistory.length === 0) {
            console.log('[AI Reply] ⚠️ No messages to reply to')
            return NextResponse.json({
                error: 'No messages',
                message: 'No messages in conversation to reply to'
            }, { status: 400 })
        }

        // 6. Build LLM prompt with context
        const isEnglish = userLanguage === 'en'
        const charName = characterName || 'Character'

        // 🆕 Base system prompt + SCORING_INSTRUCTION for sentiment analysis
        const systemPrompt = `You are ${charName}, responding to messages from ${senderName}.

${characterDescription || 'No character description provided.'}

CRITICAL RULES:
- Read the chat history carefully
- Respond as if you ARE ${charName}, addressing ${senderName}
- THIS IS A TEXT MESSAGE CONVERSATION - keep messages SHORT (1-3 sentences max)
- Use casual text message style (can use abbreviations, emojis sparingly)
- Continue the conversation naturally - respond to the LAST message
- Use ${isEnglish ? 'English' : 'Vietnamese'} language
- DO NOT include your name or any prefix like "${charName}:" - just write the message content
- DO NOT ask too many questions - keep it natural

The last message you need to respond to is from ${senderName}.

${SCORING_INSTRUCTION}`

        // Build message history for LLM
        const llmMessages = [
            { role: 'system' as const, content: systemPrompt },
            ...chatHistory.map(msg => ({
                role: (msg.is_from_character ? 'assistant' : 'user') as 'user' | 'assistant',
                content: msg.content
            }))
        ]

        console.log(`[AI Reply] 🧠 Calling LLM with ${llmMessages.length} messages...`)

        // 7. Call LLM to generate reply
        let aiReply: string
        let impactScore = 0
        let reactionType = 'NONE'

        try {
            const result = await generateWithProviders(llmMessages, {
                provider: 'default'
            })

            // 🆕 Parse sentiment from AI response
            const parsed = parseAIResponseWithSentiment(result.reply)
            aiReply = parsed.cleanedReply
            impactScore = parsed.impactScore
            reactionType = parsed.reactionType

            // 🛡️ FALLBACK: If AI returned only JSON without text, generate contextual fallback
            if (!aiReply || aiReply.trim().length === 0) {
                console.warn('[AI Reply] ⚠️ AI returned only metadata, using fallback reply')
                if (impactScore > 0) {
                    aiReply = '❤️'
                } else if (impactScore < 0) {
                    aiReply = '...'
                } else {
                    aiReply = 'Ừm...'
                }
            }

            console.log(`[AI Reply] ✅ LLM responded (${result.providerUsed}): "${aiReply.slice(0, 50)}..."`)
            console.log(`[AI Reply] 📊 Sentiment: impact=${impactScore}, reaction=${reactionType}`)

        } catch (llmError: any) {
            console.error('[AI Reply] ❌ LLM Error:', llmError)
            return NextResponse.json({
                error: 'AI generation failed',
                message: llmError.message || 'Failed to generate AI reply'
            }, { status: 500 })
        }

        // 8. Save AI reply to database
        console.log(`[AI Reply] 💾 Saving AI reply to database...`)
        const { data: newMessage, error: saveError } = await supabase
            .from('phone_messages')
            .insert({
                conversation_id: conversationId,
                content: aiReply,
                is_from_character: false, // AI message = LEFT side (from sender)
                created_at: new Date().toISOString()
            })
            .select()
            .single()

        if (saveError) {
            console.error('[AI Reply] ❌ Error saving message:', saveError)
            return NextResponse.json({
                error: 'Failed to save AI reply',
                message: saveError.message
            }, { status: 500 })
        }

        console.log(`[AI Reply] ✅ AI reply saved! ID: ${newMessage?.id}`)

        // 9. Update rate limit timestamp & conversation preview
        await supabase
            .from('phone_conversations')
            .update({
                last_generated_at: new Date().toISOString(),
                last_message_preview: aiReply.slice(0, 50),
                updated_at: new Date().toISOString()
            })
            .eq('id', conversationId)

        console.log(`[AI Reply] ✅ Rate limit timestamp updated`)

        // ============================================
        // 🆕 10. UPDATE AFFECTION POINTS
        // Non-blocking: don't fail request if this fails
        // ============================================
        try {
            // Find the last user message to attribute sentiment to
            const lastUserMessage = chatHistory
                .filter(msg => msg.is_from_character === true) // User messages
                .slice(-1)[0]

            if (lastUserMessage && characterId) {
                const sentiment = mapImpactToSentiment(impactScore)

                console.log(`[AI Reply] 🎯 Updating affection: sentiment=${sentiment}, characterId=${characterId}`)

                const affectionResponse = await fetch(
                    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/relationship/update-affection`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            userId: userEmail || 'anonymous',
                            characterId,
                            sentiment,
                            messageContent: lastUserMessage.content
                        })
                    }
                )

                if (affectionResponse.ok) {
                    const affectionData = await affectionResponse.json()
                    console.log(`[AI Reply] ✅ Affection updated: ${affectionData.affectionPoints} points (${affectionData.pointsDelta >= 0 ? '+' : ''}${affectionData.pointsDelta})`)
                } else {
                    const errorText = await affectionResponse.text()
                    console.warn(`[AI Reply] ⚠️ Affection update failed: ${affectionResponse.status} - ${errorText}`)
                }
            } else {
                console.log(`[AI Reply] ⏭️ Skipped affection update (no user message or characterId)`)
            }
        } catch (affectionError) {
            // Non-blocking: log error but don't fail the request
            console.error('[AI Reply] ⚠️ Affection update error (non-critical):', affectionError)
        }
        // ============================================
        // END AFFECTION UPDATE
        // ============================================

        return NextResponse.json({
            success: true,
            message: newMessage,
            generated: true,
            // 🆕 Include sentiment data for frontend (optional)
            sentiment: {
                impact: impactScore,
                reaction: reactionType
            }
        })

    } catch (error: any) {
        console.error('[AI Reply] 🔥 CRITICAL ERROR:', error)
        return NextResponse.json({
            error: error.message || 'Unknown error'
        }, { status: 500 })
    }
}

