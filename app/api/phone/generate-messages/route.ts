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

// Language-aware fallback mock data
const getFallbackMessages = (userLanguage: string): MessageItem[] => {
    if (userLanguage === 'en') {
        return [
            { id: 1, name: 'Mom ❤️', avatar: '👩', lastMessage: 'Remember to come home early!', time: '2:00 PM', unread: 2 },
            { id: 2, name: 'Boss', avatar: '👔', lastMessage: 'Did you send the slides yet?', time: 'Yesterday', unread: 0 },
            { id: 3, name: 'Bank', avatar: '🏦', lastMessage: 'Acct ****1234 +$500.00', time: 'Yesterday', unread: 0 },
        ]
    }
    return [
        { id: 1, name: 'Mẹ yêu 💕', avatar: '👩', lastMessage: 'Con nhớ về sớm nhé!', time: '14:00', unread: 2 },
        { id: 2, name: 'Sếp', avatar: '👔', lastMessage: 'Deadline slide gửi chưa em?', time: 'Hôm qua', unread: 0 },
        { id: 3, name: 'Bank', avatar: '🏦', lastMessage: 'TK ****1234 +500,000 VND', time: 'Hôm qua', unread: 0 },
    ]
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const {
            characterName,
            characterDescription,
            relationshipContext,
            userLanguage = 'vi',
            recentHistory = [] // Array of recent chat messages for context
        } = body

        if (!characterName) {
            return NextResponse.json({ error: 'Missing characterName' }, { status: 400 })
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

        // Build context from recent history if provided
        const historyContext = recentHistory.length > 0
            ? `\n\n=== RECENT CHAT HISTORY (ANALYZE THIS) ===\n${recentHistory.slice(-15).map((msg: { role: string; content: string }, i: number) =>
                `${i + 1}. [${msg.role}]: ${msg.content.slice(0, 200)}`
            ).join('\n')}\n=== END HISTORY ===`
            : ''

        // Build the prompt with SEMANTIC EVALUATION + sender persona rules
        const systemPrompt = `You are generating a list of phone messages that appear in ${characterName}'s phone inbox.
${characterDescription ? `About ${characterName}: ${characterDescription}` : ''}
${relationshipContext ? `Relationship context: ${relationshipContext}` : ''}${historyContext}

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

=== LANGUAGE REQUIREMENT ===
${langConfig.langInstruction}
Sender names: Use "${langConfig.mom}" for mom, "${langConfig.boss}" for boss, "${langConfig.bank}" for bank, "${langConfig.friend}" for friend.

TASK: Generate 3-5 realistic message threads from DIFFERENT SENDERS in ${characterName}'s phone.
${recentHistory.length > 0 ? 'Messages SHOULD be RELEVANT to the chat history events if meaningful content was found.' : ''}

=== CRITICAL SENDER PERSONA RULES ===

1. "Mẹ" / "Mẹ yêu" / "Mom" (Parent):
   - MUST speak affectionately as a mother to her child
   - Uses: "con" (referring to child), "mẹ" (referring to self)
   - NEVER use formal greetings like "Dạ", "anh/chị", "em chào"
   - Examples: "Con về chưa?", "Mẹ nấu cơm rồi.", "Nhớ ăn đủ bữa nha con."
   - Tone: Loving, caring, warm, casual family talk

2. "Sếp" / "Boss" (Workplace superior):
   - Professional but direct
   - Talks about work: deadlines, meetings, tasks
   - Can be slightly demanding
   - Examples: "Deadline slide gửi chưa em?", "Mai họp 9h nhé.", "Báo cáo xong chưa?"

3. "Bank" / "Ngân hàng" (Bank notifications):
   - ROBOTIC, transaction-only format
   - NO human conversation
   - Format: "TK ****XXXX +/-[amount] VND từ [source]"
   - Examples: "TK ****1234 +5,000,000 VND từ NGUYEN VAN A"

4. "Bạn thân" / "Best Friend" / "Nhóm bạn":
   - Casual, fun, uses slang
   - Topics: hangouts, gossip, jokes
   - Examples: "Cuối tuần đi cafe k?", "Ê có drama mới kìa!", "Mai rảnh không?"

5. "Shopee" / "Lazada" / "Grab" (Apps/Ads):
   - Promotional, notification style
   - Examples: "Đơn hàng của bạn đang được giao...", "Flash Sale 50% OFF!"

6. "Crush" / "Người yêu" / "Lover" (if applicable):
   - Sweet, flirty, caring
   - Examples: "Nhớ anh/em quá.", "Tối nay gặp nhau nhé 💕"

=== ABSOLUTE RULES ===
- Each sender MUST stay in character
- Mom NEVER says "Dạ" or uses formal honorifics to her own child
- Messages must feel authentic and natural
- Language: Vietnamese (unless character context suggests otherwise)

=== OUTPUT FORMAT ===
Return ONLY a valid JSON array (no markdown, no explanation):
[
  { "id": 1, "name": "Mẹ yêu 💕", "avatar": "👩", "lastMessage": "Con nhớ về sớm nhé!", "time": "14:00", "unread": 2 },
  { "id": 2, "name": "Sếp", "avatar": "👔", "lastMessage": "...", "time": "Hôm qua", "unread": 0 },
  ...
]`

        const userPrompt = `Generate phone inbox messages for ${characterName}. Return JSON array only.`

        // Call LLM
        const result = await generateWithProviders(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            { provider: 'default' }
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

        // If parsing returned empty array, use fallback
        if (messages.length === 0) {
            console.warn('[Phone Messages] JSON parsing returned empty, using fallback')
            return NextResponse.json({
                skipped: false,
                messages: getFallbackMessages(userLanguage),
                source: 'fallback',
                error: 'Parse returned empty'
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
        // Note: userLanguage may not be available in catch block, default to 'vi'
        return NextResponse.json({
            messages: getFallbackMessages('vi'),
            source: 'fallback',
            error: error.message
        })
    }
}
