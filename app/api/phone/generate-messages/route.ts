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

// Fallback mock data if AI fails
const fallbackMessages: MessageItem[] = [
    { id: 1, name: 'Mẹ yêu 💕', avatar: '👩', lastMessage: 'Con nhớ về sớm nhé!', time: '14:00', unread: 2 },
    { id: 2, name: 'Sếp', avatar: '👔', lastMessage: 'Deadline slide gửi chưa em?', time: 'Hôm qua', unread: 0 },
    { id: 3, name: 'Bank', avatar: '🏦', lastMessage: 'TK ****1234 +500,000 VND', time: 'Hôm qua', unread: 0 },
]

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { characterName, characterDescription, relationshipContext } = body

        if (!characterName) {
            return NextResponse.json({ error: 'Missing characterName' }, { status: 400 })
        }

        // Build the prompt with STRICT sender persona rules
        const systemPrompt = `You are generating a list of phone messages that appear in ${characterName}'s phone inbox.
${characterDescription ? `About ${characterName}: ${characterDescription}` : ''}
${relationshipContext ? `Relationship context: ${relationshipContext}` : ''}

TASK: Generate 5-6 realistic message threads from DIFFERENT SENDERS in ${characterName}'s phone.

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
        let messages: MessageItem[] = parseJsonArray<MessageItem>(result.reply)

        // If parsing returned empty array, use fallback
        if (messages.length === 0) {
            console.warn('[Phone Messages] JSON parsing returned empty, using fallback')
            return NextResponse.json({
                messages: fallbackMessages,
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
            time: msg.time || 'Hôm nay',
            unread: typeof msg.unread === 'number' ? msg.unread : 0
        }))

        return NextResponse.json({
            messages,
            source: 'ai',
            provider: result.providerUsed
        })

    } catch (error: any) {
        console.error('[Phone Messages] API error:', error)
        return NextResponse.json({
            messages: fallbackMessages,
            source: 'fallback',
            error: error.message
        })
    }
}
