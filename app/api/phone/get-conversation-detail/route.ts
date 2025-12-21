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

// Smart fallback messages based on sender persona
const getFallbackMessages = (senderName: string): GeneratedMessage[] => {
    const senderLower = senderName.toLowerCase()

    // Mom/Parent - NEVER uses formal greetings
    if (senderLower.includes('mẹ') || senderLower.includes('mom') || senderLower.includes('má')) {
        return [
            { content: 'Con ơi!', is_from_character: false },
            { content: 'Dạ mẹ, có gì không ạ?', is_from_character: true },
            { content: 'Tối nay về sớm nhé, mẹ nấu món con thích.', is_from_character: false },
            { content: 'Dạ con về liền!', is_from_character: true },
            { content: 'Nhớ mang áo ấm, trời lạnh lắm con.', is_from_character: false },
        ]
    }

    // Boss - Professional
    if (senderLower.includes('sếp') || senderLower.includes('boss') || senderLower.includes('manager')) {
        return [
            { content: 'Em ơi, báo cáo tuần này xong chưa?', is_from_character: false },
            { content: 'Dạ em đang hoàn thiện ạ.', is_from_character: true },
            { content: 'Ok, deadline 5h chiều nay nhé.', is_from_character: false },
            { content: 'Dạ em hiểu ạ.', is_from_character: true },
            { content: 'Nhớ gửi qua email trước khi về.', is_from_character: false },
        ]
    }

    // Bank - Robotic
    if (senderLower.includes('bank') || senderLower.includes('ngân hàng')) {
        return [
            { content: 'TK ****1234: +5,000,000 VND từ NGUYEN VAN A. SD: 12,500,000 VND.', is_from_character: false },
        ]
    }

    // Friend - Casual
    if (senderLower.includes('bạn') || senderLower.includes('friend') || senderLower.includes('nhóm')) {
        return [
            { content: 'Ê mày!', is_from_character: false },
            { content: 'Gì vậy?', is_from_character: true },
            { content: 'Cuối tuần đi cafe không?', is_from_character: false },
            { content: 'Ok luôn, mấy giờ?', is_from_character: true },
            { content: '3h chiều đi, quán cũ nhé!', is_from_character: false },
        ]
    }

    // Generic fallback (no more "Dạ em chào anh/chị")
    return [
        { content: `Chào bạn!`, is_from_character: true },
        { content: 'Hi!', is_from_character: false },
        { content: 'Khỏe không?', is_from_character: true },
        { content: 'Khỏe nè, còn bạn?', is_from_character: false },
        { content: 'Mình cũng ổn!', is_from_character: true },
    ]
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { senderName, characterId, characterDescription, conversationId, lastMessagePreview } = body

        if (!senderName || !characterId) {
            return NextResponse.json(
                { error: 'Missing senderName or characterId' },
                { status: 400 }
            )
        }

        // Check Supabase configuration
        if (!isSupabaseConfigured() || !supabase) {
            console.error('[Phone Detail] Supabase not configured')
            // Apply consistency override even on fallback
            const fallbackMsgs = getFallbackMessages(senderName)
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
                    const fallbackMsgs = getFallbackMessages(senderName)
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

        // If messages exist, return them
        if (existingMessages && existingMessages.length > 0) {
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

        const systemPrompt = `You are generating a message conversation thread between a character and "${senderName}".

Character info: ${characterDescription || 'A normal person'}

=== SENDER PERSONA (CRITICAL) ===
${senderPersona || `"${senderName}" should speak appropriately for their relationship with the character.`}

=== RULES ===
- Generate 8-12 short messages alternating between character and ${senderName}
- Messages must be natural, like real texting
- Language: Vietnamese
- is_from_character = true if CHARACTER sends, false if ${senderName} sends
${lastMessagePreview ? `- IMPORTANT: The conversation MUST END with this message from ${senderName}: "${lastMessagePreview}"` : ''}

=== OUTPUT FORMAT ===
Return ONLY a JSON array (no markdown, no explanation):
[
  { "content": "Message text", "is_from_character": true/false }
]`

        const userPrompt = `Generate a conversation thread between the character and "${senderName}". Return JSON array only.`

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
            generatedMessages = getFallbackMessages(senderName)
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
            // Return generated messages even if save failed
            return NextResponse.json({
                messages: generatedMessages.map((msg, idx) => ({
                    id: `temp-${idx}`,
                    conversation_id: convId,
                    content: msg.content,
                    is_from_character: msg.is_from_character,
                    created_at: new Date().toISOString()
                })),
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

        return NextResponse.json({
            messages: savedMessages || [],
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
