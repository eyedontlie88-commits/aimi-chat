import { NextRequest, NextResponse } from 'next/server'
import { generateWithProviders } from '@/lib/llm/router'
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client'

/**
 * 🔐 DEV ONLY: Auto-Conversation Generator
 * POST /api/phone/dev-generate-conversation
 * 
 * "Bàn tay của Chúa" - Generates a complete conversation with BOTH roles
 * Only accessible by whitelisted dev emails
 * 
 * Body: { 
 *   userEmail, characterId, characterName, characterDescription,
 *   senderName, topic, messageCount, userLanguage,
 *   saveToDb (optional - if true, saves to database)
 * }
 */

// 🔐 DEV EMAILS WHITELIST
const DEV_EMAILS = ['eyedontlie88@gmail.com', 'giangcm987@gmail.com']

// Available topics
const TOPICS = {
    arguing: { en: 'Having a heated argument', vi: 'Đang cãi nhau kịch liệt' },
    flirting: { en: 'Flirting intensely', vi: 'Thả thính cực mạnh' },
    work: { en: 'Discussing urgent work', vi: 'Bàn công việc gấp' },
    debt: { en: 'Chasing payment', vi: 'Nhắc nợ' },
    caring: { en: 'Showing care and love', vi: 'Quan tâm yêu thương' },
    gossip: { en: 'Gossiping about friends', vi: 'Buôn chuyện về bạn bè' },
    planning: { en: 'Making plans together', vi: 'Lên kế hoạch cùng nhau' },
}

interface GeneratedMessage {
    content: string
    is_from_character: boolean
    timestamp?: string
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const {
            userEmail,
            characterId,
            characterName = 'Character',
            characterDescription = '',
            senderName,
            topic = 'caring',
            messageCount = 10,
            userLanguage = 'vi',
            saveToDb = false, // Default: preview only, don't save
            conversationId
        } = body

        // 🔐 SECURITY: Verify DEV email
        if (!userEmail || !DEV_EMAILS.includes(userEmail)) {
            console.error(`🚫 [DEV GEN] Unauthorized access attempt from: ${userEmail || 'unknown'}`)
            return NextResponse.json(
                { error: 'Unauthorized: DEV access required' },
                { status: 403 }
            )
        }

        // Validate messageCount (max 20)
        const safeMessageCount = Math.min(Math.max(messageCount, 3), 20)
        const isEnglish = userLanguage === 'en'
        const topicText = TOPICS[topic as keyof typeof TOPICS]?.[isEnglish ? 'en' : 'vi'] || topic

        console.log(`🎬 [DEV GEN] Generating ${safeMessageCount} messages for "${senderName}" - Topic: ${topicText}`)

        // Build the DUAL-ROLE system prompt
        const systemPrompt = `
YOU ARE A MASTER SCRIPTWRITER.
Task: Create a SEAMLESS conversation between "${senderName}" and the Character "${characterName}".

=== CHARACTER INFO ===
${characterDescription || 'A normal person with their own personality'}

=== CONVERSATION TOPIC ===
${topicText}

=== IRON-CLAD RULES ===
1. Generate EXACTLY ${safeMessageCount} messages, alternating between sender and character.
2. Messages from "${senderName}" (the contact): is_from_character: FALSE
3. Messages from "${characterName}" (phone owner/user): is_from_character: TRUE
4. Each message must have incrementing timestamps (1-2 minutes apart).
5. Content must be REALISTIC, following the topic and character persona.
6. NO garbage messages (hi, ok, test, single letters).
7. Language: ${isEnglish ? 'ENGLISH ONLY' : 'VIETNAMESE ONLY'}

=== PATTERN (Example flow) ===
- Message 1: ${senderName} initiates (is_from_character: false)
- Message 2: ${characterName} responds (is_from_character: true)
- Message 3: ${senderName} continues (is_from_character: false)
- ... and so on, creating a natural back-and-forth

=== OUTPUT FORMAT ===
Return ONLY a valid JSON array (no markdown, no explanation):
[
  { "content": "Message text", "is_from_character": false, "timestamp": "14:30" },
  { "content": "Reply text", "is_from_character": true, "timestamp": "14:31" },
  ...
]`

        const userPrompt = isEnglish
            ? `Generate a ${safeMessageCount}-message conversation between "${senderName}" and "${characterName}" about: ${topicText}. Return JSON array only.`
            : `Tạo ${safeMessageCount} tin nhắn hội thoại giữa "${senderName}" và "${characterName}" về: ${topicText}. Chỉ trả về JSON array.`

        // Call AI
        const result = await generateWithProviders(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            { provider: process.env.SILICON_API_KEY ? 'silicon' : 'default' }
        )

        // Parse response
        const { parseJsonArray } = await import('@/lib/llm/json-parser')
        let messages: GeneratedMessage[] = parseJsonArray<GeneratedMessage>(result.reply)

        if (messages.length === 0) {
            throw new Error('AI returned empty array')
        }

        // Validate and enrich each message with proper created_at
        const baseTime = Date.now()
        messages = messages.slice(0, safeMessageCount).map((msg, idx) => ({
            id: `dev-${baseTime}-${idx}`,
            content: msg.content || '...',
            is_from_character: typeof msg.is_from_character === 'boolean'
                ? msg.is_from_character
                : idx % 2 === 1, // Alternate if not specified
            created_at: new Date(baseTime + (idx * 60000)).toISOString(), // 1 min apart
        }))

        console.log(`✅ [DEV GEN] Generated ${messages.length} messages successfully`)

        // If saveToDb is true, save to database
        if (saveToDb && isSupabaseConfigured() && supabase) {
            let convId = conversationId

            // Find or create conversation
            if (!convId && characterId && senderName) {
                const { data: existingConv } = await supabase
                    .from('phone_conversations')
                    .select('id')
                    .eq('character_id', characterId)
                    .eq('sender_name', senderName)
                    .single()

                if (existingConv) {
                    convId = existingConv.id
                } else {
                    const { data: newConv } = await supabase
                        .from('phone_conversations')
                        .insert({
                            character_id: characterId,
                            sender_name: senderName,
                            avatar: '👤',
                        })
                        .select('id')
                        .single()
                    convId = newConv?.id
                }
            }

            if (convId) {
                // Insert all messages
                const { error: insertError } = await supabase
                    .from('phone_messages')
                    .insert(messages.map(msg => ({
                        conversation_id: convId,
                        content: msg.content,
                        is_from_character: msg.is_from_character,
                    })))

                if (insertError) {
                    console.error('[DEV GEN] Save error:', insertError)
                    return NextResponse.json({
                        messages,
                        saved: false,
                        error: insertError.message,
                        source: 'ai-preview'
                    })
                }

                console.log(`💾 [DEV GEN] Saved ${messages.length} messages to DB`)
                return NextResponse.json({
                    messages,
                    saved: true,
                    conversationId: convId,
                    source: 'ai-saved'
                })
            }
        }

        // Return preview only (not saved)
        return NextResponse.json({
            messages,
            saved: false,
            source: 'ai-preview'
        })

    } catch (error: any) {
        console.error('[DEV GEN] Error:', error)
        return NextResponse.json(
            { error: error.message, messages: [] },
            { status: 500 }
        )
    }
}
