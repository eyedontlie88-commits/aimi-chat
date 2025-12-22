import { NextRequest, NextResponse } from 'next/server'
import { generateWithProviders } from '@/lib/llm/router'

/**
 * API Route: Generate AI-generated phone messages for a character
 * POST /api/phone/generate-messages
 * 
 * Body: { characterName, characterDescription, relationshipContext }
 * Returns: Array of message objects
 */

interface MessageItem {
    id: number
    name: string
    avatar: string
    lastMessage: string
    time: string
    unread: number
}

// FALLBACK STRATEGY: Return empty array instead of fake messages
// UI will show "Locked State" - "Chat more to unlock their private messages!"
// This is more realistic than fake System messages

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const {
            characterName,
            characterDescription,
            relationshipContext,
            userLanguage = 'vi',
            recentHistory = [], // Array of recent chat messages for context
            isInitial = false,  // Flag for first-time phone open (persona-based generation)
            forceGenerate = false, // DEV bypass - force AI generation without thresholds
            currentMessages = [], // 🧠 RULE #6: Existing phone messages for context
            userEmail = '' // 🔐 For DEV verification
        } = body

        if (!characterName) {
            return NextResponse.json({ error: 'Missing characterName' }, { status: 400 })
        }

        // 🔐 SERVER-SIDE DEV EMAIL VERIFICATION
        // Only whitelisted emails can use forceGenerate
        const DEV_EMAILS = ['eyedontlie88@gmail.com', 'giangcm987@gmail.com']

        if (forceGenerate && !DEV_EMAILS.includes(userEmail)) {
            console.error(`🚫 [SECURITY] Unauthorized forceGenerate attempt from: ${userEmail || 'unknown'}`)
            return NextResponse.json(
                { error: 'Unauthorized: DEV access required' },
                { status: 403 }
            )
        }

        // DEBUG: Log flags
        console.log(`[Phone Messages] API called: char=${characterName}, lang=${userLanguage}, isInitial=${isInitial}, forceGenerate=${forceGenerate}, existingMsgs=${currentMessages?.length || 0}`)

        // 🔓 DEV BYPASS: Explicit server-side logging
        if (forceGenerate) {
            console.log('🔓🔓🔓 [DEV BYPASS] ==========================================')
            console.log('🔓 [DEV BYPASS] forceGenerate=true TRIGGERED!')
            console.log(`🔓 [DEV BYPASS] Authorized user: ${userEmail}`)
            console.log('🔓 [DEV BYPASS] Bypassing ALL thresholds and cooldowns')
            console.log('🔓 [DEV BYPASS] Forcing AI generation immediately...')
            console.log(`🔓 [DEV BYPASS] Character: ${characterName}`)
            console.log(`🔓 [DEV BYPASS] Language: ${userLanguage}`)
            console.log(`🔓 [DEV BYPASS] Persona: ${characterDescription?.slice(0, 100)}...`)
            console.log('🔑 [DEV BYPASS] API Key Status:')
            console.log(`   - SILICON_API_KEY: ${!!process.env.SILICON_API_KEY ? '✅ SET' : '❌ MISSING'}`)
            console.log(`   - GEMINI_API_KEY: ${!!process.env.GEMINI_API_KEY ? '✅ SET' : '❌ MISSING'}`)
            console.log('🔓🔓🔓 ========================================================')
        }

        // Language-specific configuration
        const isEnglish = userLanguage === 'en'
        const langConfig = isEnglish ? {
            mom: 'Mom ❤️',
            boss: 'Boss',
            bank: 'Bank',
            friend: 'Bestie',
            langInstruction: 'ALL content MUST be in English.',
            skipReason: 'No meaningful content to respond to',
        } : {
            mom: 'Mẹ yêu 💕',
            boss: 'Sếp',
            bank: 'Bank',
            friend: 'Bạn thân',
            langInstruction: 'ALL content MUST be in Vietnamese.',
            skipReason: 'Không có nội dung đáng để phản hồi',
        }

        // Build context from recent history if provided (only for non-initial)
        const historyContext = (!isInitial && recentHistory.length > 0)
            ? `\n\n=== RECENT CHAT HISTORY (ANALYZE THIS) ===\n${recentHistory.slice(-15).map((msg: { role: string; content: string }, i: number) =>
                `${i + 1}. [${msg.role}]: ${msg.content.slice(0, 200)}`
            ).join('\n')}\n=== END HISTORY ===`
            : ''

        // 🧠 RULE #6: THREAD CONTINUITY - AI must FOLLOW the exact conversation topic!
        // Build per-sender thread context for precise follow-up
        const existingMessagesContext = (currentMessages && currentMessages.length > 0)
            ? `

=== 🔒 STRICT THREAD CONTINUITY MODE ===
⚠️ CRITICAL: You are NOT creating new conversations. You MUST CONTINUE existing threads!

**EXISTING THREADS TO CONTINUE:**
${currentMessages.slice(-10).map((msg: { name: string; lastMessage: string }, i: number) =>
                `📱 [${msg.name}] Last said: "${msg.lastMessage}"
   → Your follow-up MUST relate to this topic!`
            ).join('\n')}

**THREAD-FOLLOWING RULES:**
1. Each sender's NEW message MUST logically follow their LAST message above
2. If last was about FOOD → follow-up about food ("Ăn chưa?" / "Cơm nguội rồi")
3. If last was a QUESTION → nag for answer ("Hello?" / "Sao không rep?")
4. If last was about WORK → continue work topic ("Báo cáo xong chưa?")
5. ❌ FORBIDDEN: Random new topics like "Trời đẹp" when last was about food

**OUTPUT:** 1-3 NEW messages that CONTINUE the topics above. Do NOT repeat old messages.

=== END THREAD CONTINUITY ===
`
            : ''

        // Build the prompt with SEMANTIC EVALUATION + sender persona rules
        // SPECIAL HANDLING: isInitial uses persona-based sender generation
        const systemPrompt = `You are generating a list of phone messages that appear in ${characterName}'s phone inbox.
${characterDescription ? `About ${characterName}: ${characterDescription}` : ''}
${relationshipContext ? `Relationship context: ${relationshipContext}` : ''}${historyContext}${existingMessagesContext}

=== CRITICAL LANGUAGE REQUIREMENT - READ FIRST! ===
${isEnglish
                ? `OUTPUT LANGUAGE: ENGLISH ONLY
- ALL sender names MUST be in English (e.g., "Mom", "Boss", "Manager")
- ALL message content MUST be in English
- ALL time formats MUST be English (e.g., "Yesterday", "2:00 PM")
- DO NOT use ANY Vietnamese words, names, or phrases
- Violation of this rule = INVALID response`
                : `OUTPUT LANGUAGE: VIETNAMESE ONLY
- ALL sender names MUST be in Vietnamese (e.g., "Mẹ yêu", "Sếp", "Quản lý")
- ALL message content MUST be in Vietnamese
- ALL time formats MUST be Vietnamese (e.g., "Hôm qua", "14:00")
- If the chat history is in English, STILL output Vietnamese messages`}

${isInitial ? `
=== INITIAL PHONE STATE - PERSONA-BASED GENERATION ===
This is the FIRST TIME the user opens this character's phone. 
You MUST create messages that FIT the character's persona PERFECTLY.

**ANALYZE THE PERSONA ABOVE** and create senders that match:

EXAMPLE MAPPINGS:
- If character is an Idol/Singer/Kpop star → Senders: "Manager", "Bandmate", "Fanclub", "Stylist", "Mom"
- If character is a CEO/Business person → Senders: "Secretary", "Board Member", "Client", "Mom (nagging about marriage)"
- If character is a Student → Senders: "Classmate", "Professor", "Study Group", "Mom"
- If character is a Doctor/Nurse → Senders: "Hospital Admin", "Colleague Dr.", "Patient", "Mom"
- If character is a Chef → Senders: "Supplier", "Restaurant Owner", "Food Critic", "Mom"

**CRITICAL RULES FOR INITIAL STATE:**
- NEVER use generic "Boss" or "Sếp" if it doesn't fit the persona
- Messages should feel like you're peeking into their REAL phone
- Include at least one message from family (Mom/Dad)
- Make messages reference things appropriate to their profession/life
` : `
=== SEMANTIC EVALUATION (MANDATORY FIRST STEP) ===
${recentHistory.length > 0 ? `
You MUST first analyze the RECENT CHAT HISTORY above.
JUDGE: Does this contain MEANINGFUL conversation worth responding to?

✅ PASS CRITERIA (Generate messages):
- Actual dialogue discussing real topics
- Emotional content (flirting, arguing, support, concern)
- Life events mentioned (sick, tired, work stress, plans, dating)
- Relationship progress or meaningful exchanges

❌ FAIL CRITERIA (Skip generation):
- Repetitive spam ("hi", "a", "b", "test", "ok", single letters)
- Extremely short nonsensical replies
- User clearly trying to trick/abuse the system
- No real conversation, just noise

IF FAIL: Return ONLY this JSON: {"skipped": true, "reason": "${langConfig.skipReason}"}
IF PASS: Continue to generate messages below.` : 'No history provided, generate generic daily messages.'}
`}

TASK: Generate 3-5 realistic message threads from DIFFERENT SENDERS in ${characterName}'s phone.
${isInitial ? 'Create senders that match the character persona above. Be creative and contextual!' : ''}
${!isInitial && recentHistory.length > 0 ? 'Messages SHOULD be RELEVANT to the chat history events if meaningful content was found.' : ''}

=== CRITICAL SENDER PERSONA RULES ===
${isEnglish ? `
1. "${langConfig.mom}" (Parent):
   - MUST speak affectionately as a mother to her child
   - Loving, caring, warm, casual family talk
   - Examples: "Come home early!", "Did you eat yet?", "Remember your jacket!"

2. "${langConfig.boss}" (Workplace superior):
   - Professional but direct about work
   - Talks about: deadlines, meetings, tasks
   - Examples: "Where's the report?", "Meeting at 9am tomorrow", "Please review this ASAP"

3. "${langConfig.bank}" (Bank notifications):
   - ROBOTIC, transaction-only format
   - Format: "Acc ****XXXX +/-$XXX from [source]"
   - Examples: "Acc ****1234 +$500 from John Doe"

4. "${langConfig.friend}" (Best Friend):
   - Casual, fun, uses modern slang
   - Examples: "Wanna grab coffee?", "OMG did you see that?!", "Free this weekend?"

5. "Grab" / "Amazon" / "Uber" (Apps/Ads):
   - Promotional, notification style
   - Examples: "Your order is on the way!", "Flash Sale 50% OFF!"
` : `
1. "${langConfig.mom}" (Phụ huynh):
   - PHẢI nói chuyện thân mật như mẹ với con
   - Dùng: "con" (gọi con), "mẹ" (xưng mẹ)
   - KHÔNG BAO GIỜ dùng "Dạ", "anh/chị"
   - Ví dụ: "Con về chưa?", "Mẹ nấu cơm rồi.", "Nhớ ăn đủ bữa nha con."

2. "${langConfig.boss}" (Sếp):
   - Chuyên nghiệp, trực tiếp về công việc
   - Ví dụ: "Deadline slide gửi chưa em?", "Mai họp 9h nhé.", "Báo cáo xong chưa?"

3. "${langConfig.bank}" (Ngân hàng):
   - ROBOTIC, chỉ thông báo giao dịch
   - Format: "TK ****XXXX +/-XXX,XXX VND từ [nguồn]"
   - Ví dụ: "TK ****1234 +5,000,000 VND từ NGUYEN VAN A"

4. "${langConfig.friend}" (Bạn thân):
   - Casual, vui vẻ, dùng slang
   - Ví dụ: "Cuối tuần đi cafe k?", "Ê có drama mới kìa!", "Mai rảnh không?"

5. "Shopee" / "Grab" / "Lazada" (Apps/Ads):
   - Thông báo, quảng cáo
   - Ví dụ: "Đơn hàng đang được giao...", "Flash Sale 50% OFF!"
`}

=== ABSOLUTE RULES ===
- Each sender MUST stay in character
- ${isEnglish ? 'ALL messages MUST be in English - NO Vietnamese' : 'ALL messages MUST be in Vietnamese - NO English'}
- Messages must feel authentic and natural

=== OUTPUT FORMAT ===
Return ONLY a valid JSON array (no markdown, no explanation):
${isEnglish ? `[
  { "id": 1, "name": "${langConfig.mom}", "avatar": "👩", "lastMessage": "Remember to come home early!", "time": "2:00 PM", "unread": 2 },
  { "id": 2, "name": "${langConfig.boss}", "avatar": "👔", "lastMessage": "Where's the report?", "time": "Yesterday", "unread": 0 },
  ...
]` : `[
  { "id": 1, "name": "${langConfig.mom}", "avatar": "👩", "lastMessage": "Con nhớ về sớm nhé!", "time": "14:00", "unread": 2 },
  { "id": 2, "name": "${langConfig.boss}", "avatar": "👔", "lastMessage": "Deadline slide gửi chưa?", "time": "Hôm qua", "unread": 0 },
  ...
]`}`

        const userPrompt = isEnglish
            ? `Generate phone inbox messages for ${characterName}. REMINDER: ALL content must be in ENGLISH only. Return JSON array only.`
            : `Generate phone inbox messages for ${characterName}. REMINDER: Tất cả nội dung phải bằng TIẾNG VIỆT. Return JSON array only.`

        // Call LLM - Force Silicon on DEV bypass to avoid Gemini routing issues
        const providerToUse = forceGenerate && process.env.SILICON_API_KEY ? 'silicon' : 'default'
        console.log(`[Phone Messages] Using provider: ${providerToUse}`)

        const result = await generateWithProviders(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            { provider: providerToUse as any }
        )

        // Parse the JSON response using robust parser
        const { parseJsonArray } = await import('@/lib/llm/json-parser')

        // Check if AI returned a "skipped" response (semantic gate failed)
        const rawReply = result.reply.trim()
        try {
            // Try to parse as skipped response first
            if (rawReply.includes('\"skipped\"') && rawReply.includes('true')) {
                const skippedMatch = rawReply.match(/\\{[^{}]*\"skipped\"\\s*:\\s*true[^{}]*\\}/)
                if (skippedMatch) {
                    const skippedObj = JSON.parse(skippedMatch[0])
                    if (skippedObj.skipped === true) {
                        console.log('[Phone Messages] AI skipped generation:', skippedObj.reason)
                        return NextResponse.json({
                            skipped: true,
                            reason: skippedObj.reason || 'No meaningful content',
                            source: 'ai-skipped'
                        })
                    }
                }
            }
        } catch (skipParseError) {
            // Not a skipped response, continue with normal parsing
            console.log('[Phone Messages] Not a skipped response, parsing as messages...')
        }

        let messages: MessageItem[] = parseJsonArray<MessageItem>(result.reply)

        // If parsing returned empty array, return empty - UI will show "Locked State"
        if (messages.length === 0) {
            console.warn('[Phone Messages] JSON parsing returned empty, returning empty array for Locked State UI')
            return NextResponse.json({
                skipped: false,
                messages: [],
                source: 'empty',
                error: 'AI returned no messages'
            })
        }

        // Ensure each message has required fields
        messages = messages.map((msg, idx) => ({
            id: msg.id || idx + 1,
            name: msg.name || 'Unknown',
            avatar: msg.avatar || '👤',
            lastMessage: msg.lastMessage || '...',
            time: msg.time || (isEnglish ? 'Today' : 'Hôm nay'),
            unread: typeof msg.unread === 'number' ? msg.unread : 0
        }))

        return NextResponse.json({
            skipped: false,
            messages,
            source: 'ai',
            provider: result.providerUsed
        })

    } catch (error: any) {
        console.error('[Phone Messages] API error:', error)
        // Return empty array - UI will show "Locked State" (Chat more to unlock)
        return NextResponse.json({
            messages: [],
            source: 'empty',
            error: error.message
        })
    }
}
