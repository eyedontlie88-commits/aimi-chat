import { NextRequest, NextResponse } from 'next/server'
import { generateWithProviders } from '@/lib/llm/router'
import { createClient } from '@supabase/supabase-js'

/**
 * 🔐 DEV ONLY: Auto-Conversation Generator for MAIN CHAT
 * POST /api/chat/dev-generate
 * 
 * "Bàn tay của Chúa" - Generates a complete conversation with BOTH roles
 * ✅ Saves to `Message` table (MAIN CHAT) via DIRECT INSERT (no RPC needed)
 * 
 * Body: { 
 *   userEmail, userId, characterId, characterName, topic, messageCount, userLanguage,
 *   saveToDb (optional - if true, saves to database)
 * }
 */

// 🔥 ADMIN CLIENT - for direct inserts with service role key
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 🔐 DEV EMAILS WHITELIST (sync with ADMIN_EMAILS in ChatPage)
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
    toxic: { en: '💔 Toxic & Abusive (Test Breakup)', vi: '💔 Xúc phạm nặng (Test Chia tay)' }, // 🔥 NEW
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

        // 🔧 DEV TOOL RESILIENCE: If parseJsonArray returns empty, provide fallback messages
        // This ensures the dev tool still works even if LLM returns slightly malformed JSON
        if (!messages || messages.length === 0) {
            console.warn('[DEV CHAT GEN] parseJsonArray returned empty, building minimal fallback messages')
            console.warn('[DEV CHAT GEN] This allows dev tool to continue and affection progression to work')

            // Build a safe fallback: 4 messages alternating user/assistant so dev tool still works
            messages = [
                { role: 'user', content: 'Hi, lâu rồi không nói chuyện đó.' },
                { role: 'assistant', content: `${characterName} nhớ bạn đó, hôm nay thấy bạn dùng Dev Generator nè.` },
                { role: 'user', content: 'Ừ, để mình seed lại cuộc trò chuyện cho dễ test nha.' },
                { role: 'assistant', content: 'Ok, để mình nói chuyện thiệt cảm xúc luôn cho Affection tăng đều nhé.' },
            ]
        }

        // Validate and ensure proper structure
        messages = messages.slice(0, safeMessageCount).map((msg, idx) => ({
            role: (msg.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
            content: msg.content || '...',
        }))

        console.log(`✅ [DEV CHAT GEN] Generated ${messages.length} messages successfully`)

        // If saveToDb is true, save to Message table via DIRECT INSERT (no RPC needed)
        if (saveToDb) {
            console.log(`💾 [DEV CHAT GEN] Direct insert to Message table for Character: ${characterId}`)

            // Validate required fields before insert
            if (!characterId || !userId) {
                console.error('[DEV CHAT GEN] Missing characterId or userId for save')
                return NextResponse.json(
                    { error: 'characterId and userId are required for save' },
                    { status: 400 }
                )
            }

            // 1. Prepare data array for insert (matching Message table schema)
            const messagesToInsert = messages.map((msg, idx) => ({
                id: `dev-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
                characterId: characterId,
                role: msg.role,
                content: msg.content,
                createdAt: new Date(Date.now() + idx * 1000).toISOString(), // Stagger timestamps by 1 second
            }))

            // 2. ✅ DIRECT INSERT - No RPC needed, uses service role key
            const { data, error } = await supabaseAdmin
                .from('Message')
                .insert(messagesToInsert)
                .select('id')

            if (error) {
                console.error('[DEV CHAT GEN] Direct insert error:', error)
                return NextResponse.json(
                    { error: `Save Failed: ${error.message}`, details: error.code },
                    { status: 500 }
                )
            }

            console.log(`💾 [DEV CHAT GEN] ✅ Saved ${messagesToInsert.length} messages to Message table (direct insert)`)

            // 🔓 AFFECTION PROGRESSION HACK (DEV ONLY)
            // Process exactly 25 messages to legitimately unlock Phone through affection system
            console.log(`💕 [DEV GEN] Starting affection progression for ${characterId}...`)

            const { updateAffection } = await import('@/lib/relationship/update-affection-helper')

            let finalResult = null
            let phoneUnlockedDuringRun = false
            const PROGRESSION_MESSAGE_COUNT = 25

            // Loop through exactly 25 messages, applying POSITIVE sentiment each time
            for (let i = 0; i < PROGRESSION_MESSAGE_COUNT; i++) {
                const result = await updateAffection(userId, characterId, 'POSITIVE')

                if (!result.success) {
                    console.warn(`[DEV GEN] Affection update ${i + 1}/${PROGRESSION_MESSAGE_COUNT} failed:`, result.error)
                    continue
                }

                // Track if Phone was unlocked during this run
                if (result.phoneJustUnlocked) {
                    phoneUnlockedDuringRun = true
                    console.log(`🔓 [DEV GEN] PHONE UNLOCKED at message ${i + 1}/${PROGRESSION_MESSAGE_COUNT}!`)
                }

                finalResult = result
            }

            if (finalResult) {
                console.log(`💕 [DEV GEN] Affection progression complete:`, {
                    affection: finalResult.affectionPoints,
                    level: finalResult.intimacyLevel,
                    stage: finalResult.stage,
                    phoneUnlocked: finalResult.phoneUnlocked,
                    phoneJustUnlocked: phoneUnlockedDuringRun,
                })
            }


            // 💉 TOPIC-BASED RELATIONSHIP SYNC (DUAL SYNC: stage + status)
            let affectionChange = 5
            let intimacyChange = 0
            let newStage = 'ACQUAINTANCE'
            let newStatus = 'Người quen'  // Status text for display

            switch (topic) {
                case 'flirting':   // Thả thính
                case 'love':       // Yêu đương
                    affectionChange = 250  // 🔥 HARDCORE: +250
                    intimacyChange = 3
                    newStage = 'CRUSH'
                    newStatus = 'Bạn thân'
                    break

                case 'makeup':     // Làm lành
                    affectionChange = 150  // 🔥 HARDCORE: +150
                    intimacyChange = 2
                    newStage = 'ACQUAINTANCE'
                    newStatus = 'Người quen'
                    break

                case 'planning':   // Hẹn hò
                    affectionChange = 80   // 🔥 HARDCORE: +80
                    intimacyChange = 2
                    newStage = 'DATING'
                    newStatus = 'Đang hẹn hò'
                    break

                case 'arguing':    // Cãi nhau
                    affectionChange = -200  // 🔥 HARDCORE: -200
                    intimacyChange = 1
                    newStage = 'COMPLICATED'
                    newStatus = 'Phức tạp'
                    break

                case 'jealous':    // Ghen tuông
                case 'breakup':    // Chia tay
                    affectionChange = -100  // 🔥 HARDCORE: -100
                    intimacyChange = 1
                    newStage = 'COMPLICATED'
                    newStatus = 'Phức tạp'
                    break

                case 'caring':     // Quan tâm
                    affectionChange = 150  // 🔥 HARDCORE: +150
                    intimacyChange = 2
                    newStage = 'CRUSH'
                    newStatus = 'Bạn bè'
                    break

                case 'gossip':     // Buôn chuyện
                    affectionChange = 50   // 🔥 HARDCORE: +50
                    intimacyChange = 1
                    newStage = 'ACQUAINTANCE'
                    newStatus = 'Bạn bè'
                    break

                case 'work':       // Công việc
                    affectionChange = 20   // 🔥 HARDCORE: +20
                    intimacyChange = 1
                    newStage = 'ACQUAINTANCE'
                    newStatus = 'Người quen'
                    break

                case 'toxic':      // 💔 Test Breakup - Xúc phạm nặng
                    affectionChange = -5000  // 🔥 HARDCORE: -5000 (Instant breakup)
                    intimacyChange = 0
                    newStage = 'BROKEN'
                    newStatus = 'Đã chia tay'
                    break

                default:
                    affectionChange = 20
                    intimacyChange = 1
                    newStage = 'ACQUAINTANCE'
                    newStatus = 'Người quen'
            }

            try {
                console.log(`💉 [DEV GEN] Calling set-relationship API: Stage=${newStage}, Status=${newStatus}, Points=${affectionChange}`)

                // 🔄 Call the dedicated set-relationship API (handles insert/update properly)
                const setRelRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(req.url).origin : 'http://localhost:3000'}/api/dev/set-relationship`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        characterId,
                        userId,
                        stage: newStage,
                        status: newStatus,
                        points: affectionChange,
                        userEmail
                    })
                })

                const setRelData = await setRelRes.json()

                if (!setRelRes.ok || setRelData.error) {
                    console.error('[DEV GEN] Set-Relationship Failed:', setRelData.error)
                    return NextResponse.json({
                        messages: data || messagesToInsert,
                        saved: true,
                        count: messagesToInsert.length,
                        devError: `Relationship Error: ${setRelData.error}`,
                        source: 'ai-saved-rpc'
                    })
                } else {
                    console.log(`💕 [DEV GEN] Relationship ${setRelData.action}! Stage=${newStage}, Status=${newStatus}`)
                }
            } catch (e: any) {
                console.warn('[DEV GEN] Set-Relationship Exception:', e?.message || e)
            }

            return NextResponse.json({
                messages: data || messagesToInsert,
                saved: true,
                count: messagesToInsert.length,
                relationshipForced: true,  // Flag to indicate we forced the update
                source: 'ai-saved-rpc',
                // 💔 FIX: Return stage info for frontend to detect BROKEN
                newStage: newStage,
                newStatus: newStatus,
                // 🔓 NEW: Return affection progression result for Phone unlock
                relationship: finalResult ? {
                    affectionPoints: finalResult.affectionPoints,
                    intimacyLevel: finalResult.intimacyLevel,
                    stage: finalResult.stage,
                    phoneUnlocked: finalResult.phoneUnlocked,
                } : undefined,
                phoneJustUnlocked: phoneUnlockedDuringRun,
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
