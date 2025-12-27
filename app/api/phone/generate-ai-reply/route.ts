import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/require-auth'
import { generateWithProviders } from '@/lib/llm/router'
import { validateAIResponse, detectRole } from '@/lib/phone/pronoun-validator'

/**
 * API Route: Generate AI Reply for Phone Conversation (PRISMA VERSION)
 * POST /api/phone/generate-ai-reply
 * 
 * MIGRATED from Supabase to Prisma to avoid RLS and cache issues.
 * 
 * Features:
 * - Rate limiting (60s for users, bypass for devs)
 * - Reads last 20 messages for context
 * - Saves AI reply to database
 * - Sentiment analysis & affection points update
 */

// 🔐 DEV EMAILS - can bypass rate limits
const DEV_EMAILS = ['eyedontlie88@gmail.com', 'giangcm987@gmail.com']

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

Response Format:
Always end your reply with this JSON block:
\`\`\`json
{"impact": <-5 to +5 INTEGER>, "reaction": "NONE|LIKE|HEARTBEAT", "reason": "<brief explanation>"}
\`\`\`

DO NOT include any text after the JSON block.
`

/**
 * Parse AI response to extract sentiment metadata
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
        const deepMatch = text.match(/(\{[\s\S]*"impact"[\s\S]*\})/i)

        if (deepMatch) {
            const fixedJson = deepMatch[1].replace(/,\s*}/g, '}')

            try {
                const metadata = JSON.parse(fixedJson)

                if (typeof metadata.impact === 'number') {
                    impactScore = Math.max(-5, Math.min(5, metadata.impact))
                }
                if (metadata.reaction) {
                    reactionType = metadata.reaction.toUpperCase()
                }

                console.log(`[Sentiment Parser] ✅ Parsed: impact=${impactScore}, reaction=${reactionType}`)

                text = text.replace(deepMatch[0], '').trim()
                text = text.replace(/```json/gi, '').replace(/```/gi, '').trim()

            } catch (parseErr) {
                console.warn('[Sentiment Parser] ⚠️ JSON parse failed:', parseErr)
            }
        }
    } catch (e) {
        console.error('[Sentiment Parser] 🔥 Critical error:', e)
    }

    return { cleanedReply: text, impactScore, reactionType }
}

function mapImpactToSentiment(impact: number): 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' {
    if (impact > 0) return 'POSITIVE'
    if (impact < 0) return 'NEGATIVE'
    return 'NEUTRAL'
}

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
        const { uid, prisma, email } = await getAuthContext(req)
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

        // ========================================
        // 🏦 BANKING SOFT-BLOCK: User can send, AI won't reply
        // User messages still saved to DB, but AI generation skipped
        // ========================================
        const isBankingContact = senderName.toLowerCase().includes('ngân hàng') ||
            senderName.toLowerCase().includes('bank') ||
            senderName.toLowerCase().includes('shopee') ||
            senderName.toLowerCase().includes('lazada') ||
            senderName.toLowerCase().includes('grab') ||
            senderName.toLowerCase().includes('momo') ||
            senderName.toLowerCase().includes('zalopay')

        if (isBankingContact) {
            console.log('[AI Reply] 🏦 Banking/Notification contact detected - skipping AI generation (user can still send messages)')
            return NextResponse.json({
                success: true,
                message: null,
                generated: false,
                reason: 'NOTIFICATION_ONLY_CONTACT',
                info: 'User message saved but AI will not reply'
            }, { status: 200 }) // Return 200 OK, not 403 Forbidden
        }

        // 1. Validation
        if (!conversationId) {
            return NextResponse.json({ error: 'conversationId is required' }, { status: 400 })
        }

        // 2. Check if dev user (can bypass rate limits)
        const effectiveEmail = userEmail || email || ''
        const isDev = DEV_EMAILS.includes(effectiveEmail)
        console.log(`[AI Reply] 👤 User: ${effectiveEmail || 'anonymous'}, isDev: ${isDev}`)

        // 3. Rate limit check (60 seconds for non-devs) using Prisma
        const conversation = await prisma.phoneConversation.findUnique({
            where: { id: conversationId }
        })

        if (!conversation) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
        }

        // Note: We don't have last_generated_at in Prisma schema yet, skip rate limiting for now
        // TODO: Add lastGeneratedAt field to PhoneConversation model

        // 4. Fetch recent chat history (last 20 messages) using Prisma
        console.log(`[AI Reply] 📖 Fetching chat history...`)
        const messages = await prisma.phoneMessage.findMany({
            where: { conversationId: conversationId },
            orderBy: { timestamp: 'desc' },
            take: 20
        })

        // Reverse to chronological order
        const chatHistory = messages.reverse()
        console.log(`[AI Reply] 📜 Found ${chatHistory.length} messages in history`)

        // 5. Check if there's anything to reply to
        if (chatHistory.length === 0) {
            console.log('[AI Reply] ⚠️ No messages to reply to')
            return NextResponse.json({
                error: 'No messages',
                message: 'No messages in conversation to reply to'
            }, { status: 400 })
        }

        // 6. Build LLM prompt with CORRECT ROLE CONTEXT
        // 🔥 CRITICAL: AI is playing as senderName (e.g., "Mẹ yêu"), NOT characterName (e.g., "Hiếu")
        // characterName = the phone owner (user is roleplaying as them)
        // senderName = the contact who sent messages (AI plays this role)
        const isEnglish = userLanguage === 'en'
        const aiRole = senderName || 'Contact' // AI plays as the sender
        const userRole = characterName || 'User' // User is playing as character

        // Helper: Detect relationship from contact name
        const getRelationshipContext = (name: string): string => {
            const lower = name.toLowerCase()
            if (lower.includes('mẹ') || lower.includes('mom') || lower.includes('me ')) {
                return isEnglish
                    ? `You are ${userRole}'s MOTHER. Address them as "con" (child). Speak with maternal love and care.`
                    : `Bạn là MẸ của ${userRole}. Gọi họ là "con". Nói chuyện với tình thương của người mẹ.`
            }
            if (lower.includes('bố') || lower.includes('ba') || lower.includes('dad')) {
                return isEnglish
                    ? `You are ${userRole}'s FATHER. Address them as "con". Speak with paternal authority and care.`
                    : `Bạn là BỐ của ${userRole}. Gọi họ là "con". Nói chuyện với tình thương của người cha.`
            }
            if (lower.includes('sếp') || lower.includes('boss')) {
                return isEnglish
                    ? `You are ${userRole}'s BOSS. Be professional but can be friendly.`
                    : `Bạn là SẾP của ${userRole}. Nói chuyện chuyên nghiệp.`
            }
            if (lower.includes('bạn') || lower.includes('friend')) {
                return isEnglish
                    ? `You are ${userRole}'s FRIEND. Be casual and fun.`
                    : `Bạn là BẠN của ${userRole}. Nói chuyện thân mật, vui vẻ.`
            }
            return isEnglish
                ? `You are a contact named "${aiRole}" who knows ${userRole}.`
                : `Bạn là "${aiRole}", một người quen của ${userRole}.`
        }

        const relationshipContext = getRelationshipContext(senderName)

        // 🔥 DETECT IF AI IS PLAYING A PARENT ROLE
        const lowerSenderName = senderName.toLowerCase()
        const isMotherRole = lowerSenderName.includes('mẹ') || lowerSenderName.includes('mom')
        const isFatherRole = lowerSenderName.includes('bố') || lowerSenderName.includes('ba') || lowerSenderName.includes('dad')
        const isBossRole = lowerSenderName.includes('sếp') || lowerSenderName.includes('boss')

        // Build EXPLICIT pronoun rules based on role
        let pronounRules = ''
        if (isMotherRole) {
            pronounRules = `
🚨🚨🚨 CRITICAL PRONOUN RULES - YOU ARE THE MOTHER 🚨🚨🚨

YOU MUST USE THESE PRONOUNS:
✅ Refer to yourself as: "mẹ" (mother)
✅ Refer to ${userRole} as: "con" (child)
✅ Example CORRECT responses:
   - "Ừ con, mẹ biết rồi"
   - "Con về chưa? Mẹ lo quá"
   - "Mẹ nấu cơm chờ con đây"
   - "Con ơi, mẹ nhớ con"

❌ ABSOLUTELY FORBIDDEN - NEVER SAY THESE:
   - NEVER start with "Dạ" (that's what a child says to parents!)
   - NEVER say "con biết rồi" (YOU are not "con", ${userRole} is!)
   - NEVER say "con nhớ" referring to yourself
   - NEVER use "ạ" at end of sentences (that's respectful particle used BY children)
   
IF YOU USE FORBIDDEN PRONOUNS, YOU HAVE FAILED YOUR ROLE!
`
        } else if (isFatherRole) {
            pronounRules = `
🚨 CRITICAL: YOU ARE THE FATHER
✅ CORRECT: "Ừ con", "Bố đây", "Bố nói con nghe"
❌ FORBIDDEN: "Dạ bố", "Con biết rồi ạ" (YOU ARE NOT THE CHILD!)
`
        } else if (isBossRole) {
            pronounRules = `
🚨 CRITICAL: YOU ARE THE BOSS
✅ CORRECT: "Tốt", "Được rồi", "Sếp đồng ý", "Em làm đi"
❌ FORBIDDEN: "Dạ sếp", "Em biết rồi ạ" (YOU ARE NOT THE EMPLOYEE!)
`
        } else {
            pronounRules = `Speak naturally as "${aiRole}". Use appropriate pronouns for your relationship with ${userRole}.`
        }

        const systemPrompt = `🎭 CRITICAL ROLE ASSIGNMENT - READ EVERY WORD CAREFULLY:

═══════════════════════════════════════════════════════════════
YOU ARE: "${aiRole}"
THE PERSON YOU ARE TEXTING WITH: "${userRole}"
═══════════════════════════════════════════════════════════════

${relationshipContext}

${pronounRules}

📱 CONVERSATION STRUCTURE:
- In the chat history below:
  • "assistant" messages = YOUR past messages (you sent these as ${aiRole})
  • "user" messages = ${userRole}'s past messages (they sent these)
- Your task: Continue the conversation AS ${aiRole}

${characterDescription ? `About ${userRole}: ${characterDescription}` : ''}

📝 RESPONSE RULES:
1. Reply as ${aiRole} - use ONLY ${aiRole}'s pronouns
2. Keep messages SHORT (1-3 sentences, casual text style)
3. Use ${isEnglish ? 'English' : 'Vietnamese'} language
4. DO NOT prefix with your name
5. Match the emotional tone

${SCORING_INSTRUCTION}`

        // Build message history for LLM
        // role: "user" = user messages (from app user), "contact" = AI/character messages
        const llmMessages = [
            { role: 'system' as const, content: systemPrompt },
            ...chatHistory.map(msg => ({
                role: (msg.role === 'contact' ? 'assistant' : 'user') as 'user' | 'assistant',
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

            const parsed = parseAIResponseWithSentiment(result.reply)
            aiReply = parsed.cleanedReply
            impactScore = parsed.impactScore
            reactionType = parsed.reactionType

            // FALLBACK: If AI returned only JSON without text
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

            // 🔒 CRITICAL: VALIDATE PRONOUNS BEFORE SAVING
            const role = detectRole(senderName)
            const validation = validateAIResponse(aiReply, role)

            if (!validation.valid) {
                console.error('🚨🚨🚨 [PRONOUN VALIDATION FAILED] 🚨🚨🚨')
                console.error(`Contact: ${senderName} | Role: ${role}`)
                console.error(`AI Reply: "${aiReply}"`)
                console.error('Errors:', validation.errors)

                // Use fallback reply
                if (validation.fallbackReply) {
                    aiReply = validation.fallbackReply
                    console.warn(`⚠️ Used fallback ${role} reply due to validation failure`)
                }
            }

            if (validation.warnings.length > 0) {
                console.warn('⚠️ Pronoun warnings:', validation.warnings)
            }

        } catch (llmError: any) {
            console.error('[AI Reply] ❌ LLM Error:', llmError)
            return NextResponse.json({
                error: 'AI generation failed',
                message: llmError.message || 'Failed to generate AI reply'
            }, { status: 500 })
        }

        // 8. Save AI reply to database using Prisma
        console.log(`[AI Reply] 💾 Saving AI reply to database...`)
        const newMessage = await prisma.phoneMessage.create({
            data: {
                conversationId: conversationId,
                content: aiReply,
                role: 'contact', // AI message = from contact/sender
                timestamp: new Date()
            }
        })

        console.log(`[AI Reply] ✅ AI reply saved! ID: ${newMessage.id}`)

        // 9. Update conversation preview using Prisma
        await prisma.phoneConversation.update({
            where: { id: conversationId },
            data: {
                lastMessage: aiReply.slice(0, 50),
                timestamp: new Date()
            }
        })

        console.log(`[AI Reply] ✅ Conversation preview updated`)

        // 10. UPDATE AFFECTION POINTS (non-blocking)
        try {
            const lastUserMessage = chatHistory
                .filter(msg => msg.role === 'user')
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
                            userId: effectiveEmail || 'anonymous',
                            characterId,
                            sentiment,
                            messageContent: lastUserMessage.content
                        })
                    }
                )

                if (affectionResponse.ok) {
                    const affectionData = await affectionResponse.json()
                    console.log(`[AI Reply] ✅ Affection updated: ${affectionData.affectionPoints} points`)
                }
            }
        } catch (affectionError) {
            console.error('[AI Reply] ⚠️ Affection update error (non-critical):', affectionError)
        }

        return NextResponse.json({
            success: true,
            message: newMessage,
            generated: true,
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
