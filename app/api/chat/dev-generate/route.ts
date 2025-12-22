import { NextRequest, NextResponse } from 'next/server'
import { generateWithProviders } from '@/lib/llm/router'
import { createClient } from '@supabase/supabase-js'

/**
 * 🔐 DEV ONLY: Auto-Conversation Generator for MAIN CHAT
 * POST /api/chat/dev-generate
 * 
 * "Bàn tay của Chúa" - Generates a complete conversation with BOTH roles
 * Saves to `messages` table (MAIN CHAT, not phone)
 * Uses SERVICE_ROLE_KEY to bypass RLS
 * 
 * Body: { 
 *   userEmail, userId, characterId, characterName, topic, messageCount, userLanguage,
 *   saveToDb (optional - if true, saves to database)
 * }
 */

// 🔥 ADMIN CLIENT - BYPASSES RLS (Service Role Key)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 🔐 DEV EMAILS WHITELIST
const DEV_EMAILS = ['eyedontlie88@gmail.com', 'giangcm987@gmail.com']

// Available topics
const TOPICS: Record<string, { en: string; vi: string }> = {
    arguing: { en: 'Having a heated argument', vi: 'Đang cãi nhau kịch liệt' },
    flirting: { en: 'Flirting intensely', vi: 'Thả thính cực mạnh' },
    work: { en: 'Discussing urgent work', vi: 'Bàn công việc gấp' },
    caring: { en: 'Showing care and love', vi: 'Quan tâm yêu thương' },
    gossip: { en: 'Gossiping about mutual friends', vi: 'Buôn chuyện về bạn bè' },
    planning: { en: 'Making romantic plans', vi: 'Lên kế hoạch hẹn hò' },
    jealous: { en: 'Jealousy and suspicion', vi: 'Ghen tuông nghi ngờ' },
    makeup: { en: 'Making up after a fight', vi: 'Làm lành sau khi cãi nhau' },
}

interface GeneratedMessage {
    role: 'user' | 'assistant'
    content: string
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const {
            userEmail,      // Required for DEV check
            userId,         // Required for saving to DB
            characterId,
            characterName = 'Character',
            characterPersona = '',
            topic = 'caring',
            messageCount = 10,
            userLanguage = 'vi',
            saveToDb = false,
        } = body

        // 🔐 SECURITY: Verify DEV email from request body
        if (!userEmail || !DEV_EMAILS.includes(userEmail)) {
            console.error(`🚫 [DEV CHAT GEN] Unauthorized access attempt from: ${userEmail || 'unknown'}`)
            return NextResponse.json(
                { error: 'Unauthorized: DEV access required' },
                { status: 403 }
            )
        }

        // Validate messageCount (max 20)
        const safeMessageCount = Math.min(Math.max(messageCount, 3), 20)
        const isEnglish = userLanguage === 'en'
        const topicText = TOPICS[topic]?.[isEnglish ? 'en' : 'vi'] || topic

        console.log(`🎬 [DEV CHAT GEN] Generating ${safeMessageCount} messages - Topic: ${topicText}`)

        // Build the DUAL-ROLE system prompt
        const systemPrompt = `
YOU ARE A MASTER SCRIPTWRITER FOR A DATING SIM GAME.
Task: Create a SEAMLESS chat conversation between the Player (user) and "${characterName}".

=== CHARACTER PERSONA ===
${characterPersona || `${characterName} is a charming, complex character with their own personality.`}

=== CONVERSATION TOPIC ===
${topicText}

=== IRON-CLAD RULES ===
1. Generate EXACTLY ${safeMessageCount} messages, alternating between user and character.
2. Messages from PLAYER: role = "user"
3. Messages from ${characterName}: role = "assistant"
4. Content must be REALISTIC and emotionally engaging.
5. NO garbage messages (hi, ok, test, single letters).
6. Show character development and emotional progression.
7. Language: ${isEnglish ? 'ENGLISH ONLY' : 'VIETNAMESE ONLY'}

=== PATTERN (Alternating) ===
- Message 1: user (player speaks first)
- Message 2: assistant (character responds)
- Message 3: user (player continues)
- Message 4: assistant (character responds)
... and so on

=== OUTPUT FORMAT ===
Return ONLY a valid JSON array (no markdown, no explanation):
[
  { "role": "user", "content": "Player's message" },
  { "role": "assistant", "content": "${characterName}'s response" },
  ...
]`

        const userPrompt = isEnglish
            ? `Generate a ${safeMessageCount}-message chat conversation between the player and "${characterName}" about: ${topicText}. Make it emotional and engaging. Return JSON array only.`
            : `Tạo ${safeMessageCount} tin nhắn chat giữa người chơi và "${characterName}" về: ${topicText}. Làm cho nó cảm xúc và hấp dẫn. Chỉ trả về JSON array.`

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

        // Validate and ensure proper structure
        messages = messages.slice(0, safeMessageCount).map((msg, idx) => ({
            role: (msg.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
            content: msg.content || '...',
        }))

        console.log(`✅ [DEV CHAT GEN] Generated ${messages.length} messages successfully`)

        // If saveToDb is true, save to MAIN messages table using ADMIN client
        if (saveToDb && userId) {
            console.log(`💾 [DEV CHAT GEN] Using ADMIN client to save for User: ${userId}`)
            const savedMessages = []

            for (const msg of messages) {
                const { data, error } = await supabaseAdmin
                    .from('messages')
                    .insert({
                        character_id: characterId,
                        user_id: userId,
                        role: msg.role,
                        content: msg.content,
                    })
                    .select()
                    .single()

                if (error) {
                    console.error('[DEV CHAT GEN] Insert error:', error)
                } else {
                    savedMessages.push(data)
                }
            }

            console.log(`💾 [DEV CHAT GEN] Saved ${savedMessages.length} messages to DB`)

            // Update relationship stats (trigger intimacy recalculation)
            try {
                await supabaseAdmin.rpc('recalculate_relationship', {
                    p_user_id: userId,
                    p_character_id: characterId
                })
                console.log(`💕 [DEV CHAT GEN] Relationship stats recalculated`)
            } catch (e) {
                console.warn('[DEV CHAT GEN] Could not recalculate relationship:', e)
            }

            return NextResponse.json({
                messages: savedMessages,
                saved: true,
                count: savedMessages.length,
                source: 'ai-saved'
            })
        }

        // Return preview only (not saved)
        return NextResponse.json({
            messages,
            saved: false,
            source: 'ai-preview'
        })

    } catch (error: any) {
        console.error('[DEV CHAT GEN] Error:', error)
        return NextResponse.json(
            { error: error.message, messages: [] },
            { status: 500 }
        )
    }
}
