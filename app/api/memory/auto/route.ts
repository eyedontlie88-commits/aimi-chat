import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/require-auth'
import { generateWithProviders } from '@/lib/llm'
import { parseJsonObject } from '@/lib/llm/json-parser'

export const dynamic = 'force-dynamic'

interface AutoMemoryResult {
    content: string
    mood: string
    type: 'auto_summary'
}

/**
 * POST /api/memory/auto
 * 
 * AI-powered conversation summarization into a memory note.
 * Uses Gemini Flash for fast, cost-effective summarization.
 */
export async function POST(request: NextRequest) {
    try {
        const { uid, prisma } = await getAuthContext(request)
        const { characterId, trigger } = await request.json()

        if (!characterId) {
            return NextResponse.json({ error: 'characterId is required' }, { status: 400 })
        }

        // Verify character ownership via relationshipConfig
        const relationshipConfig = await prisma.relationshipConfig.findFirst({
            where: { characterId, userId: uid },
            include: {
                character: {
                    select: { id: true, name: true }
                }
            }
        })

        if (!relationshipConfig || !relationshipConfig.character) {
            return NextResponse.json({ error: 'Character not found' }, { status: 404 })
        }

        const character = relationshipConfig.character

        // Get user profile for context
        const userProfile = await prisma.userProfile.findUnique({
            where: { id: uid },
            select: { displayName: true, nicknameForUser: true }
        })

        const userName = userProfile?.nicknameForUser || userProfile?.displayName || 'Bạn'

        // Fetch last 50 messages for summarization
        const messages = await prisma.message.findMany({
            where: { characterId },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: {
                role: true,
                content: true,
                createdAt: true,
            }
        })

        if (messages.length < 3) {
            return NextResponse.json({
                error: 'NOT_ENOUGH_MESSAGES',
                message: 'Cuộc trò chuyện quá ngắn để tạo kỷ niệm.'
            }, { status: 400 })
        }

        // Build conversation context (chronological order)
        const conversationContext = messages
            .reverse()
            .map(msg => {
                const speaker = msg.role === 'user' ? userName : character.name
                return `${speaker}: ${msg.content.slice(0, 200)}`
            })
            .join('\n')

        // AI Summarization Prompt
        const systemPrompt = `Bạn là AI trợ lý giúp ghi lại kỷ niệm trong các cuộc trò chuyện tình cảm.

NHIỆM VỤ:
Phân tích đoạn hội thoại sau và tạo một ghi chú ngắn gọn về những điều đáng nhớ.

QUY TẮC:
1. Viết từ góc nhìn của người dùng (${userName})
2. Tối đa 300 ký tự
3. Tập trung vào:
   - Sự kiện quan trọng (hẹn hò, tỏ tình, cãi nhau, làm hòa...)
   - Cảm xúc nổi bật (vui, buồn, hạnh phúc, xúc động...)
   - Chi tiết đáng nhớ (lời nói ngọt ngào, khoảnh khắc đặc biệt...)
4. Viết tự nhiên, như nhật ký cá nhân
5. Dùng tiếng Việt 100%

OUTPUT FORMAT (JSON only, no markdown):
{"content": "Ghi chú ngắn gọn...", "mood": "happy|romantic|sad|emotional|peaceful|excited"}

QUAN TRỌNG: Chỉ trả về JSON, không có text khác.`

        const userPrompt = `Đây là đoạn hội thoại giữa ${userName} và ${character.name}:

${conversationContext}

---
Trigger: ${trigger === 'exit' ? 'Người dùng rời chat' : 'Người dùng nhấn nút lưu'}
Hãy tạo ghi chú kỷ niệm JSON.`

        // Use Gemini 2.5 Flash for fast, stable summarization
        // Falls back to SiliconFlow with valid model if Gemini fails
        const geminiModel = process.env.GOOGLE_MODEL_3 || 'gemini-2.5-flash'

        let result
        try {
            result = await generateWithProviders(
                [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                { provider: 'gemini', model: geminiModel }
            )
        } catch (geminiError: any) {
            console.warn('[Auto Memory] Gemini failed, trying SiliconFlow fallback:', geminiError.message)
            // Fallback to SiliconFlow with a valid model
            result = await generateWithProviders(
                [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                { provider: 'silicon', model: 'Qwen/Qwen2.5-14B-Instruct' }
            )
        }

        // Parse AI response with fallback
        const fallback: AutoMemoryResult = {
            content: `Hôm nay trò chuyện với ${character.name} thật vui. Những khoảnh khắc bên nhau luôn đáng nhớ.`,
            mood: 'peaceful',
            type: 'auto_summary'
        }

        const parsed = parseJsonObject<AutoMemoryResult>(result.reply, fallback)

        // Validate content length
        const content = parsed.content.slice(0, 500)
        const mood = ['happy', 'romantic', 'sad', 'emotional', 'peaceful', 'excited'].includes(parsed.mood)
            ? parsed.mood
            : 'peaceful'

        // Save to database
        // Note: Using 'category' to store mood since Memory schema doesn't have metadata field
        const memory = await prisma.memory.create({
            data: {
                characterId,
                type: `auto_summary:${mood}:${trigger}`, // Encode mood and trigger in type
                content,
                visibility: 'public',
                importanceScore: 3, // Medium importance for auto-generated
                category: 'diary', // Auto-generated memories go to diary
            }
        })

        console.log(`[Auto Memory] Created memory for ${character.name}: "${content.slice(0, 50)}..."`)

        return NextResponse.json({
            success: true,
            memory: {
                id: memory.id,
                content: memory.content,
                mood,
                createdAt: memory.createdAt
            }
        })

    } catch (error: any) {
        console.error('[Auto Memory] Error:', error)

        // Handle specific LLM errors gracefully
        if (error?.code === 'LLM_ALL_PROVIDERS_FAILED') {
            return NextResponse.json({
                error: 'AI_UNAVAILABLE',
                message: 'Không thể tạo kỷ niệm lúc này. Thử lại sau nhé!'
            }, { status: 503 })
        }

        return NextResponse.json({
            error: 'INTERNAL_ERROR',
            message: error.message || 'Có lỗi xảy ra'
        }, { status: 500 })
    }
}
