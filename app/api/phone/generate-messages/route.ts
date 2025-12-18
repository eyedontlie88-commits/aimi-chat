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

        // Build the prompt
        const systemPrompt = `Bạn là ${characterName}. ${characterDescription || ''}
Nhiệm vụ: Tạo danh sách 5-6 tin nhắn gần đây trong điện thoại của bạn.
Bao gồm tin nhắn từ: gia đình, bạn bè, công việc, thông báo ngân hàng/app.
Tin nhắn phải phù hợp với tính cách và hoàn cảnh của nhân vật.
${relationshipContext ? `Bối cảnh quan hệ: ${relationshipContext}` : ''}

Trả về CHÍNH XÁC JSON array với format sau (không giải thích, không markdown):
[
  { "id": 1, "name": "Tên người gửi", "avatar": "emoji phù hợp", "lastMessage": "Nội dung tin nhắn ngắn", "time": "thời gian (vd: 14:00, Hôm qua, T6)", "unread": số tin chưa đọc (0-5) }
]

QUAN TRỌNG: 
- Chỉ trả về JSON array, không có text khác
- Avatar phải là emoji (👩, 👔, 🏦, 👥, 🛒, etc.)
- Tin nhắn phải tự nhiên, phù hợp văn hóa Việt Nam`

        const userPrompt = `Hãy tạo danh sách tin nhắn trong điện thoại của ${characterName}. Trả về JSON array.`

        // Call LLM
        const result = await generateWithProviders(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            { provider: 'default' }
        )

        // Parse the JSON response
        let messages: MessageItem[]
        try {
            // Clean up response - remove markdown code blocks if present
            let cleanedReply = result.reply.trim()
            if (cleanedReply.startsWith('```json')) {
                cleanedReply = cleanedReply.slice(7)
            }
            if (cleanedReply.startsWith('```')) {
                cleanedReply = cleanedReply.slice(3)
            }
            if (cleanedReply.endsWith('```')) {
                cleanedReply = cleanedReply.slice(0, -3)
            }
            cleanedReply = cleanedReply.trim()

            messages = JSON.parse(cleanedReply)

            // Validate structure
            if (!Array.isArray(messages)) {
                throw new Error('Response is not an array')
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

        } catch (parseError) {
            console.error('[Phone Messages] Failed to parse AI response:', parseError)
            console.error('[Phone Messages] Raw response:', result.reply)
            // Return fallback on parse error
            return NextResponse.json({
                messages: fallbackMessages,
                source: 'fallback',
                error: 'Parse error'
            })
        }

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
