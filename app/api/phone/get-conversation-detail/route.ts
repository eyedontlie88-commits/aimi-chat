import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client'
import { generateWithProviders } from '@/lib/llm/router'

/**
 * API Route: Get or generate conversation detail
 * POST /api/phone/get-conversation-detail
 * 
 * "Lazy Generation" - Only generates messages when first accessed
 * 
 * Body: { senderName, characterId, characterDescription, conversationId? }
 * Returns: Array of message bubbles
 */

interface GeneratedMessage {
    content: string
    is_from_character: boolean
}

// Smart language-aware fallback messages based on sender persona
// 🚫 RULE: Only sender messages (is_from_character: false) - User writes their own replies!
const getFallbackMessages = (senderName: string, userLanguage: string = 'vi'): GeneratedMessage[] => {
    const senderLower = senderName.toLowerCase()
    const isEnglish = userLanguage === 'en'

    // Mom/Parent - NEVER uses formal greetings
    if (senderLower.includes('mẹ') || senderLower.includes('mom') || senderLower.includes('má')) {
        if (isEnglish) {
            return [
                { content: 'Hey sweetie!', is_from_character: false },
                { content: 'Come home early tonight, I\'m cooking your favorite!', is_from_character: false },
                { content: 'Don\'t forget your jacket, it\'s cold outside!', is_from_character: false },
            ]
        }
        return [
            { content: 'Con ơi!', is_from_character: false },
            { content: 'Tối nay về sớm nhé, mẹ nấu món con thích.', is_from_character: false },
            { content: 'Nhớ mang áo ấm, trời lạnh lắm con.', is_from_character: false },
        ]
    }

    // Boss - Professional
    if (senderLower.includes('sếp') || senderLower.includes('boss') || senderLower.includes('manager')) {
        if (isEnglish) {
            return [
                { content: 'Hey, is the weekly report done?', is_from_character: false },
                { content: 'Ok, deadline is 5pm today.', is_from_character: false },
                { content: 'Send it via email before you leave.', is_from_character: false },
            ]
        }
        return [
            { content: 'Em ơi, báo cáo tuần này xong chưa?', is_from_character: false },
            { content: 'Ok, deadline 5h chiều nay nhé.', is_from_character: false },
            { content: 'Nhớ gửi qua email trước khi về.', is_from_character: false },
        ]
    }

    // Bank - Robotic
    if (senderLower.includes('bank') || senderLower.includes('ngân hàng')) {
        if (isEnglish) {
            return [
                { content: 'Acct ****1234: +$500.00 from JOHN DOE. Balance: $1,250.00', is_from_character: false },
            ]
        }
        return [
            { content: 'TK ****1234: +5,000,000 VND từ NGUYEN VAN A. SD: 12,500,000 VND.', is_from_character: false },
        ]
    }

    // Friend - Casual
    if (senderLower.includes('bạn') || senderLower.includes('friend') || senderLower.includes('nhóm') || senderLower.includes('bestie')) {
        if (isEnglish) {
            return [
                { content: 'Yo!', is_from_character: false },
                { content: 'Wanna grab coffee this weekend?', is_from_character: false },
                { content: '3pm, usual spot!', is_from_character: false },
            ]
        }
        return [
            { content: 'Ê mày!', is_from_character: false },
            { content: 'Cuối tuần đi cafe không?', is_from_character: false },
            { content: '3h chiều đi, quán cũ nhé!', is_from_character: false },
        ]
    }

    // Generic fallback - only sender messages
    if (isEnglish) {
        return [
            { content: 'Hi there!', is_from_character: false },
            { content: 'How are you doing?', is_from_character: false },
            { content: 'Let me know when you\'re free!', is_from_character: false },
        ]
    }
    return [
        { content: 'Chào bạn!', is_from_character: false },
        { content: 'Bạn khỏe không?', is_from_character: false },
        { content: 'Rảnh nhắn lại mình nhé!', is_from_character: false },
    ]
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { senderName, characterId, characterDescription, conversationId, lastMessagePreview, userLanguage = 'vi' } = body

        if (!senderName || !characterId) {
            return NextResponse.json(
                { error: 'Missing senderName or characterId' },
                { status: 400 }
            )
        }

        const isEnglish = userLanguage === 'en'

        // Check Supabase configuration
        if (!isSupabaseConfigured() || !supabase) {
            console.error('[Phone Detail] Supabase not configured')
            // Apply consistency override even on fallback
            const fallbackMsgs = getFallbackMessages(senderName, userLanguage)
            if (lastMessagePreview) {
                const lastMsg = fallbackMsgs[fallbackMsgs.length - 1]
                if (!lastMsg || lastMsg.content !== lastMessagePreview) {
                    fallbackMsgs.push({ content: lastMessagePreview, is_from_character: false })
                }
            }
            return NextResponse.json({
                messages: fallbackMsgs,
                source: 'fallback',
                error: 'Database not configured'
            })
        }

        // Step 1: Find or create conversation
        let convId = conversationId

        if (!convId) {
            // Try to find existing conversation
            const { data: existingConv } = await supabase
                .from('phone_conversations')
                .select('id')
                .eq('character_id', characterId)
                .eq('sender_name', senderName)
                .single()

            if (existingConv) {
                convId = existingConv.id
            } else {
                // Create new conversation
                const { data: newConv, error: createError } = await supabase
                    .from('phone_conversations')
                    .insert({
                        character_id: characterId,
                        sender_name: senderName,
                        avatar: '👤',
                    })
                    .select('id')
                    .single()

                if (createError || !newConv) {
                    console.error('[Phone Detail] Failed to create conversation:', createError)
                    // Apply consistency override even on fallback
                    const fallbackMsgs = getFallbackMessages(senderName, userLanguage)
                    if (lastMessagePreview) {
                        const lastMsg = fallbackMsgs[fallbackMsgs.length - 1]
                        if (!lastMsg || lastMsg.content !== lastMessagePreview) {
                            fallbackMsgs.push({ content: lastMessagePreview, is_from_character: false })
                        }
                    }
                    return NextResponse.json({
                        messages: fallbackMsgs,
                        source: 'fallback',
                        error: 'Failed to create conversation'
                    })
                }
                convId = newConv.id
            }
        }

        // Step 2: Check for existing messages
        const { data: existingMessages, error: fetchError } = await supabase
            .from('phone_messages')
            .select('*')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: true })

        if (fetchError) {
            console.error('[Phone Detail] Failed to fetch messages:', fetchError)
        }

        // If messages exist, check if we need continuation
        if (existingMessages && existingMessages.length > 0) {
            const lastMessage = existingMessages[existingMessages.length - 1]

            // If last message is from CHARACTER (user's reply), sender might need to respond
            // But for now, just return existing - user can manually trigger refresh for new messages
            console.log(`[Phone Detail] Returning ${existingMessages.length} cached messages`)
            return NextResponse.json({
                messages: existingMessages,
                conversationId: convId,
                source: 'database'
            })
        }

        // Step 3: Generate new messages with AI
        console.log(`[Phone Detail] Generating messages for ${senderName}...`)

        // Determine sender type for persona
        const senderLower = senderName.toLowerCase()
        let senderPersona = ''

        if (senderLower.includes('mẹ') || senderLower.includes('mom') || senderLower.includes('má')) {
            senderPersona = `"${senderName}" is the CHARACTER'S MOTHER. She MUST:
- Speak affectionately as a mom to her child
- Use "con" (referring to child), "mẹ" (referring to self)
- NEVER use formal greetings like "Dạ", "anh/chị", "em chào"
- Be loving, caring, warm, casual`
        } else if (senderLower.includes('sếp') || senderLower.includes('boss')) {
            senderPersona = `"${senderName}" is the CHARACTER'S BOSS. Speaks professionally about work, deadlines, meetings.`
        } else if (senderLower.includes('bank') || senderLower.includes('ngân hàng')) {
            senderPersona = `"${senderName}" is a BANK NOTIFICATION. ONLY send transaction messages in format: "TK ****XXXX +/-amount VND". No human conversation.`
        } else if (senderLower.includes('bạn') || senderLower.includes('friend') || senderLower.includes('nhóm')) {
            senderPersona = `"${senderName}" is the CHARACTER'S FRIEND. Casual, fun, uses slang, talks about hangouts.`
        }

        // 🧠 Build existing message context (limit to 10 recent to prevent token overflow)
        const recentMessages = existingMessages?.slice(-10) || []
        const historyContext = recentMessages.length > 0
            ? `
=== 📜 EXISTING CONVERSATION HISTORY (DO NOT REWRITE!) ===
${recentMessages.map((msg: { content: string; is_from_character: boolean }) =>
                msg.is_from_character
                    ? `[User]: ${msg.content}`  // User's reply (blue bubble)
                    : `[${senderName}]: ${msg.content}`  // Sender's message (white bubble)
            ).join('\n')}
=== END HISTORY ===

⚠️ CRITICAL: The above messages ALREADY EXIST. You MUST NOT regenerate or modify them.
Your task is ONLY to generate 2-3 NEW follow-up messages from "${senderName}".
${recentMessages[recentMessages.length - 1]?.is_from_character
                ? `The last message was from the User. "${senderName}" should logically respond to it.`
                : `The last message was from "${senderName}". Generate a natural follow-up or escalation.`
            }
`
            : ''

        const systemPrompt = `You are generating a message conversation thread between a character and "${senderName}".

Character info: ${characterDescription || 'A normal person'}

=== SENDER PERSONA (CRITICAL) ===
${senderPersona || `"${senderName}" should speak appropriately for their relationship with the character.`}

=== 🚫 STRICT ROLE PROTECTION RULES 🚫 ===
1. You are ONLY generating messages FROM "${senderName}" (is_from_character: FALSE)
2. ❌ ABSOLUTELY FORBIDDEN: Do NOT generate character's replies (is_from_character: true)
3. Why? The USER will write their own replies. AI must NOT impersonate the user.
4. Generate 3-5 messages that ${senderName} would send, waiting for a reply.
${historyContext}
=== RULES ===
- Language: ${isEnglish ? 'English' : 'Vietnamese'}
- is_from_character = ALWAYS false (messages are FROM ${senderName} TO the character)
- Messages should escalate or follow a natural sender pattern (greet → ask → wait → follow-up)
${lastMessagePreview ? `- CRITICAL: The LAST message MUST be: "${lastMessagePreview}"` : ''}

=== OUTPUT FORMAT ===
Return ONLY a JSON array (no markdown, no explanation):
[
  { "content": "Message from ${senderName}", "is_from_character": false }
]`

        const userPrompt = `Generate 3-5 messages that "${senderName}" would send to the character. ONLY sender's messages, NO character replies. Return JSON array only.`

        let generatedMessages: GeneratedMessage[]

        try {
            const { parseJsonArray } = await import('@/lib/llm/json-parser')

            const result = await generateWithProviders(
                [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                { provider: 'default' }
            )

            // Use robust JSON parser
            generatedMessages = parseJsonArray<GeneratedMessage>(result.reply)

            if (generatedMessages.length === 0) {
                throw new Error('Parsed array is empty')
            }

            // Validate structure
            generatedMessages = generatedMessages.map(msg => ({
                content: msg.content || '...',
                is_from_character: typeof msg.is_from_character === 'boolean'
                    ? msg.is_from_character
                    : false
            }))

        } catch (parseError) {
            console.error('[Phone Detail] AI parse error:', parseError)
            generatedMessages = getFallbackMessages(senderName, userLanguage)
        }

        // Step 3.5: HARD OVERRIDE - Force last message to match preview for consistency
        if (lastMessagePreview) {
            const lastMsg = generatedMessages[generatedMessages.length - 1]
            if (!lastMsg || lastMsg.content !== lastMessagePreview) {
                console.log('[Phone Detail] Forcing last message to match preview')
                generatedMessages.push({
                    content: lastMessagePreview,
                    is_from_character: false // Message from the sender/contact, not character
                })
            }
        }

        // Step 4: Save messages to database
        const messagesToInsert = generatedMessages.map(msg => ({
            conversation_id: convId,
            content: msg.content,
            is_from_character: msg.is_from_character
        }))

        const { data: savedMessages, error: insertError } = await supabase
            .from('phone_messages')
            .insert(messagesToInsert)
            .select()

        if (insertError) {
            console.error('[Phone Detail] Failed to save messages:', insertError)
            // 🔒 CRITICAL: Still combine existing + new temp messages
            const tempNewMessages = generatedMessages.map((msg, idx) => ({
                id: `temp-${Date.now()}-${idx}`,
                conversation_id: convId,
                content: msg.content,
                is_from_character: msg.is_from_character,
                created_at: new Date().toISOString()
            }))
            const allMessages = [
                ...(existingMessages || []),
                ...tempNewMessages
            ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

            return NextResponse.json({
                messages: allMessages,
                conversationId: convId,
                source: 'ai',
                warning: 'Messages generated but not saved to database'
            })
        }

        // Update conversation with last message preview
        const lastMessage = generatedMessages[generatedMessages.length - 1]
        await supabase
            .from('phone_conversations')
            .update({
                last_message_preview: lastMessage?.content?.slice(0, 50) || '...',
                updated_at: new Date().toISOString()
            })
            .eq('id', convId)

        console.log(`[Phone Detail] Generated and saved ${savedMessages?.length || 0} messages`)

        // 🔒 CRITICAL: Combine existing + new messages, sorted by created_at
        const allMessages = [
            ...(existingMessages || []),
            ...(savedMessages || [])
        ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

        console.log(`[Phone Detail] Returning ${allMessages.length} total messages (${existingMessages?.length || 0} existing + ${savedMessages?.length || 0} new)`)

        return NextResponse.json({
            messages: allMessages,
            conversationId: convId,
            source: 'ai'
        })

    } catch (error: any) {
        console.error('[Phone Detail] API error:', error)
        return NextResponse.json(
            { error: error.message, messages: [], source: 'error' },
            { status: 500 }
        )
    }
}
