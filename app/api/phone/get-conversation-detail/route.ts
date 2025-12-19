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

// Fallback messages if AI/DB fails
const getFallbackMessages = (senderName: string): GeneratedMessage[] => [
    { content: `Chào ${senderName}!`, is_from_character: true },
    { content: 'Dạ, em chào anh/chị!', is_from_character: false },
    { content: 'Hôm nay có gì vui không?', is_from_character: true },
    { content: 'Dạ cũng bình thường thôi ạ.', is_from_character: false },
    { content: 'Oke, nhớ giữ sức khỏe nhé!', is_from_character: true },
]

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

        const systemPrompt = `Bạn là AI tạo đoạn hội thoại tin nhắn điện thoại.
Tạo đoạn chat 8-12 tin nhắn giữa một nhân vật và "${senderName}".

Thông tin nhân vật: ${characterDescription || 'Người bình thường'}

Quy tắc:
- Tin nhắn ngắn gọn, tự nhiên như nhắn tin thật
- Xen kẽ giữa nhân vật và ${senderName}
- Nội dung phù hợp với mối quan hệ (gia đình, bạn bè, đồng nghiệp...)
- Sử dụng tiếng Việt tự nhiên
${lastMessagePreview ? `- QUAN TRỌNG: Đoạn chat PHẢI KẾT THÚC bằng tin nhắn này từ ${senderName}: "${lastMessagePreview}"` : ''}

Trả về CHÍNH XÁC JSON array, không markdown:
[
  { "content": "Nội dung tin nhắn", "is_from_character": true/false }
]

is_from_character = true nếu nhân vật gửi, false nếu ${senderName} gửi.`

        const userPrompt = `Tạo đoạn chat giữa nhân vật và "${senderName}". Trả về JSON array.`

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
