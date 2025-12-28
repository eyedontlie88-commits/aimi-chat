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
    devModeEnabled?: boolean  // ✅ NEW: for dev testing bypass (defaults to false)
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
            userLanguage = 'vi',
            devModeEnabled = false  // ✅ NEW: defaults to false (production mode)
        } = body

        console.log(`[AI Reply] 🤖 Generating reply for conversation: ${conversationId}`)

        // ========================================
        // 🏦 AUTO-REPLY BOT: Realistic simulation of notification services
        // User messages saved, instant auto-reply generated (no LLM needed)
        // ========================================
        const lowerName = senderName.toLowerCase()
        const isBankingContact = lowerName.includes('ngân hàng') ||
            lowerName.includes('bank') ||
            lowerName.includes('shopee') ||
            lowerName.includes('lazada') ||
            lowerName.includes('grab') ||
            lowerName.includes('momo') ||
            lowerName.includes('zalopay')

        if (isBankingContact) {
            console.log('[AI Reply] 🏦 Notification contact detected - sending auto-reply template')

            // 📱 AUTO-REPLY TEMPLATES (Realistic simulation of real services)
            let autoReply = ''

            if (lowerName.includes('ngân hàng') || lowerName.includes('bank')) {
                autoReply = userLanguage === 'vi'
                    ? '📱 Tin nhắn không được phản hồi tự động. Vui lòng liên hệ Hotline: 1900-xxxx hoặc mở App ngân hàng để được hỗ trợ.'
                    : '📱 This number does not support auto-reply. Please contact Hotline: 1900-xxxx or open Banking App for support.'
            } else if (lowerName.includes('shopee')) {
                autoReply = userLanguage === 'vi'
                    ? '🛍️ Shopee không hỗ trợ phản hồi qua SMS. Vui lòng mở app Shopee hoặc liên hệ hotline: 1900-1234 để được hỗ trợ.'
                    : '🛍️ Shopee does not support SMS replies. Please open Shopee app or call: 1900-1234.'
            } else if (lowerName.includes('lazada')) {
                autoReply = userLanguage === 'vi'
                    ? '📦 Lazada không hỗ trợ phản hồi qua tin nhắn. Vui lòng truy cập app Lazada hoặc gọi: 1900-6035.'
                    : '📦 Lazada does not support SMS replies. Please visit Lazada app or call: 1900-6035.'
            } else if (lowerName.includes('grab')) {
                autoReply = userLanguage === 'vi'
                    ? '🚗 Grab không hỗ trợ phản hồi qua SMS. Vui lòng mở app Grab để theo dõi chuyến đi hoặc liên hệ hotline: 1900-1239.'
                    : '🚗 Grab does not support SMS replies. Please open Grab app to track your ride or call: 1900-1239.'
            } else if (lowerName.includes('momo')) {
                autoReply = userLanguage === 'vi'
                    ? '💰 MoMo không hỗ trợ phản hồi tự động. Vui lòng mở app MoMo hoặc gọi Hotline: 1900-545-436.'
                    : '💰 MoMo does not support auto-reply. Please open MoMo app or call: 1900-545-436.'
            } else if (lowerName.includes('zalopay')) {
                autoReply = userLanguage === 'vi'
                    ? '💳 ZaloPay không hỗ trợ phản hồi qua SMS. Vui lòng mở app ZaloPay hoặc liên hệ: 1900-5555.'
                    : '💳 ZaloPay does not support SMS replies. Please open ZaloPay app or call: 1900-5555.'
            } else {
                // Generic fallback for other notification services
                autoReply = userLanguage === 'vi'
                    ? '🤖 Dịch vụ này không hỗ trợ phản hồi tự động. Vui lòng liên hệ qua app hoặc hotline.'
                    : '🤖 This service does not support auto-reply. Please contact via app or hotline.'
            }

            // Save auto-reply to database (as 'contact' role - from the service)
            console.log(`[AI Reply] 💬 Auto-reply: "${autoReply.slice(0, 50)}..."`)
            const autoMessage = await prisma.phoneMessage.create({
                data: {
                    conversationId: conversationId,
                    content: autoReply,
                    role: 'contact', // Auto-reply = from service/contact (LEFT side)
                    timestamp: new Date()
                }
            })

            // Update conversation preview
            await prisma.phoneConversation.update({
                where: { id: conversationId },
                data: {
                    lastMessage: autoReply.slice(0, 50),
                    timestamp: new Date()
                }
            })

            console.log('[AI Reply] ✅ Auto-reply sent successfully')

            return NextResponse.json({
                success: true,
                message: autoMessage,
                generated: true,
                isAutoReply: true,
                sentiment: { impact: 0, reaction: 'NONE' }
            }, { status: 200 })
        }

        // 1. Validation
        if (!conversationId) {
            return NextResponse.json({ error: 'conversationId is required' }, { status: 400 })
        }

        // 2. Check if dev user (can bypass rate limits)
        const effectiveEmail = userEmail || email || ''
        const isDev = DEV_EMAILS.includes(effectiveEmail)
        console.log(`[AI Reply] 👤 User: ${effectiveEmail || 'anonymous'}, isDev: ${isDev}`)

        // 🚦 EARLY COOLDOWN CHECK (before any generation logic)
        // This prevents self-continuation spam
        // 🎛️ COOLDOWN CONFIGURATION:
        // - Production (default): 2 hours (prevents spam, saves tokens)
        // - Dev Mode (opt-in via devModeEnabled): 10 seconds (for rapid testing)
        const COOLDOWN_PRODUCTION = 2 * 60 * 60 * 1000  // 2 hours
        const COOLDOWN_DEV = 10 * 1000                   // 10 seconds
        const cooldownMs = devModeEnabled ? COOLDOWN_DEV : COOLDOWN_PRODUCTION

        console.log(`[AI Reply] ⚙️ Cooldown mode: ${devModeEnabled ? 'DEV (10s)' : 'PRODUCTION (2h)'}`)

        // Fetch messages to check last sender
        const earlyMessages = await prisma.phoneMessage.findMany({
            where: { conversationId },
            orderBy: { timestamp: 'desc' },
            take: 1
        })

        if (earlyMessages.length > 0) {
            const lastMessage = earlyMessages[0]
            const isLastFromAI = lastMessage.role === 'contact'

            if (isLastFromAI && !forceTrigger) {
                const timeSinceLastAIMsg = Date.now() - new Date(lastMessage.timestamp).getTime()

                if (timeSinceLastAIMsg < cooldownMs) {
                    const remainingMs = cooldownMs - timeSinceLastAIMsg
                    const remainingSec = Math.ceil(remainingMs / 1000)

                    console.log(`[AI Reply] ⏰ Self-continuation cooldown: ${remainingSec}s remaining (last AI msg ${Math.floor(timeSinceLastAIMsg / 1000)}s ago)`)

                    return NextResponse.json({
                        success: false,
                        generated: false,
                        reason: 'SELF_CONTINUATION_COOLDOWN',
                        remainingMs,
                        info: `AI already replied ${Math.floor(timeSinceLastAIMsg / 1000)}s ago. Cooldown: ${cooldownMs / 1000}s`
                    }, { status: 200 }) // 200 not 429 - this is expected behavior
                }
            }
        }

        // 3. AI REPLY COOLDOWN - Prevent token waste
        const conversation = await prisma.phoneConversation.findUnique({
            where: { id: conversationId }
        })

        if (!conversation) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
        }

        // ⏰ SMART COOLDOWN LOGIC (uses cooldownMs from early check above)
        // In-chat = instant replies (user actively chatting)
        // Out-of-chat = cooldown enforced (prevents token waste)
        const IN_CHAT_WINDOW = 60 * 1000 // 60 seconds = considered "in chat"

        // Check if user is "in chat" (sent a message within last 60s)
        // This allows rapid back-and-forth conversation
        const lastUserMessage = await prisma.phoneMessage.findFirst({
            where: { conversationId, role: 'user' },
            orderBy: { timestamp: 'desc' }
        })

        const timeSinceLastUserMsg = lastUserMessage
            ? Date.now() - new Date(lastUserMessage.timestamp).getTime()
            : Infinity

        const isInChat = timeSinceLastUserMsg < IN_CHAT_WINDOW

        if (isInChat) {
            console.log(`[AI Reply] 💬 User in active chat (sent ${Math.floor(timeSinceLastUserMsg / 1000)}s ago) - INSTANT REPLY`)
        } else if (conversation.lastGeneratedAt) {
            // User left chat or returned after delay → Enforce cooldown
            const timeSinceLastGen = Date.now() - new Date(conversation.lastGeneratedAt).getTime()
            const remainingCooldown = cooldownMs - timeSinceLastGen

            if (remainingCooldown > 0 && !forceTrigger) {
                const remainingMinutes = Math.ceil(remainingCooldown / 1000 / 60)
                const cooldownLabel = isDev ? `${Math.ceil(remainingCooldown / 1000)}s` : `${remainingMinutes}m`

                console.log(`[AI Reply] ⏰ Cooldown active: ${cooldownLabel} remaining (user left chat ${Math.floor(timeSinceLastGen / 1000)}s ago)`)

                return NextResponse.json({
                    success: false,
                    message: null,
                    generated: false,
                    reason: 'COOLDOWN_ACTIVE',
                    remainingMs: remainingCooldown,
                    info: `AI reply on cooldown. Please wait ${cooldownLabel}.`
                }, { status: 429 })
            }
        }

        console.log('[AI Reply] ✅ Proceeding with AI generation')

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

        // 🤖 AI SELF-CONTINUATION CHECK
        // If last message was from AI/contact and user hasn't replied, AI continues the conversation
        const lastMessage = chatHistory[chatHistory.length - 1]
        const isLastFromUser = lastMessage.role === 'user'
        const isLastFromAI = lastMessage.role === 'contact'

        // If last message is from USER, this is a normal reply scenario (not self-continuation)
        // Continue to AI generation below to reply to user
        if (isLastFromUser) {
            console.log('[AI Reply] 📩 Last message from user - generating reply')
            // Continue to AI generation below
        } else if (isLastFromAI && !isInChat) {
            // Last message from AI + user not in chat = potential self-continuation
            // Check if cooldown passed for self-continuation
            const timeSinceLastAIMsg = Date.now() - new Date(lastMessage.timestamp).getTime()

            if (timeSinceLastAIMsg >= cooldownMs) {
                console.log(`[AI Reply] 🔄 AI Self-Continuation: Last AI message was ${Math.floor(timeSinceLastAIMsg / 1000)}s ago, generating follow-up`)
                // Continue with AI generation below - will generate follow-up message
            } else if (!forceTrigger) {
                const remainingCooldown = cooldownMs - timeSinceLastAIMsg
                const cooldownLabel = isDev ? `${Math.ceil(remainingCooldown / 1000)}s` : `${Math.ceil(remainingCooldown / 1000 / 60)}m`

                console.log(`[AI Reply] ⏰ AI Self-Continuation cooldown: ${cooldownLabel} remaining`)
                return NextResponse.json({
                    success: false,
                    generated: false,
                    reason: 'SELF_CONTINUATION_COOLDOWN',
                    remainingMs: remainingCooldown,
                    info: `AI will continue conversation in ${cooldownLabel}.`
                }, { status: 429 })
            }
        } else if (isLastFromAI && isInChat) {
            // Last message from AI but user is actively chatting
            // This means user is in chat, don't auto-continue - wait for user input
            console.log('[AI Reply] 📭 Last message from AI, user in chat - waiting for user reply')
            return NextResponse.json({
                success: false,
                generated: false,
                reason: 'NOT_NEEDED',
                info: 'Last message from AI, waiting for user to reply'
            }, { status: 200 })
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

        // 9. Update conversation preview + cooldown timestamp
        await prisma.phoneConversation.update({
            where: { id: conversationId },
            data: {
                lastMessage: aiReply.slice(0, 50),
                timestamp: new Date(),
                lastGeneratedAt: new Date() // ✅ Update cooldown timestamp
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
