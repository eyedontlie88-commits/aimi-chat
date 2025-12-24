import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client'
import { generateWithProviders } from '@/lib/llm/router'
import { LLMMessage } from '@/lib/llm/types'

/**
 * API Route: Generate AI Reply for Phone Conversation
 * POST /api/phone/generate-ai-reply
 * 
 * PURPOSE: Generate AI reply that READS chat history and responds meaningfully.
 * This is the ONLY place where AI generates individual conversation replies.
 * 
 * Features:
 * - Rate limiting (60s for users, bypass for devs)
 * - Reads last 20 messages for context
 * - Saves AI reply to database
 * - Updates rate limit timestamp
 */

// 🔐 DEV EMAILS - can bypass rate limits
const DEV_EMAILS = ['eyedontlie88@gmail.com', 'giangcm987@gmail.com']

interface GenerateAIReplyRequest {
    conversationId: string
    characterId: string
    senderName: string
    characterName?: string
    characterDescription?: string
    userEmail?: string
    forceTrigger?: boolean
    userLanguage?: 'en' | 'vi'
}

export async function POST(req: NextRequest) {
    try {
        const body: GenerateAIReplyRequest = await req.json()
        const {
            conversationId,
            characterId,
            senderName,
            characterName,
            characterDescription,
            userEmail,
            forceTrigger = false,
            userLanguage = 'vi'
        } = body

        console.log(`[AI Reply] 🤖 Generating reply for conversation: ${conversationId}`)

        // 1. Validation
        if (!conversationId) {
            return NextResponse.json({ error: 'conversationId is required' }, { status: 400 })
        }

        if (!isSupabaseConfigured() || !supabase) {
            console.error('[AI Reply] ❌ Supabase not configured')
            return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
        }

        // 2. Check if dev user (can bypass rate limits)
        const isDev = userEmail && DEV_EMAILS.includes(userEmail)
        console.log(`[AI Reply] 👤 User: ${userEmail || 'anonymous'}, isDev: ${isDev}`)

        // 3. Rate limit check (60 seconds for non-devs)
        if (!isDev && !forceTrigger) {
            const { data: conv } = await supabase
                .from('phone_conversations')
                .select('last_generated_at')
                .eq('id', conversationId)
                .limit(1)
                .single()

            if (conv?.last_generated_at) {
                const elapsed = Date.now() - new Date(conv.last_generated_at).getTime()
                if (elapsed < 60000) { // 60 seconds
                    const remainingSeconds = Math.ceil((60000 - elapsed) / 1000)
                    console.log(`[AI Reply] ⏱️ Rate limited. Wait ${remainingSeconds}s`)
                    return NextResponse.json({
                        error: 'Rate limited',
                        message: `Please wait ${remainingSeconds} seconds before generating again`,
                        remainingSeconds
                    }, { status: 429 })
                }
            }
        }

        // 4. Fetch recent chat history (last 20 messages)
        console.log(`[AI Reply] 📖 Fetching chat history...`)
        const { data: messages, error: fetchError } = await supabase
            .from('phone_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false })
            .limit(20)

        if (fetchError) {
            console.error('[AI Reply] ❌ Error fetching messages:', fetchError)
            return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
        }

        // Reverse to chronological order
        const chatHistory = (messages || []).reverse()
        console.log(`[AI Reply] 📜 Found ${chatHistory.length} messages in history`)

        // 5. Check if there's anything to reply to
        if (chatHistory.length === 0) {
            console.log('[AI Reply] ⚠️ No messages to reply to')
            return NextResponse.json({
                error: 'No messages',
                message: 'No messages in conversation to reply to'
            }, { status: 400 })
        }

        // 6. Build LLM prompt with context
        const isEnglish = userLanguage === 'en'
        const charName = characterName || 'Character'

        const systemPrompt = `You are ${charName}, responding to messages from ${senderName}.

${characterDescription || 'No character description provided.'}

CRITICAL RULES:
- Read the chat history carefully
- Respond as if you ARE ${charName}, addressing ${senderName}
- THIS IS A TEXT MESSAGE CONVERSATION - keep messages SHORT (1-3 sentences max)
- Use casual text message style (can use abbreviations, emojis sparingly)
- Continue the conversation naturally - respond to the LAST message
- Use ${isEnglish ? 'English' : 'Vietnamese'} language
- DO NOT include your name or any prefix like "${charName}:" - just write the message content
- DO NOT ask too many questions - keep it natural

The last message you need to respond to is from ${senderName}.`

        // Build message history for LLM
        const llmMessages = [
            { role: 'system' as const, content: systemPrompt },
            ...chatHistory.map(msg => ({
                role: (msg.is_from_character ? 'assistant' : 'user') as 'user' | 'assistant',
                content: msg.content
            }))
        ]

        console.log(`[AI Reply] 🧠 Calling LLM with ${llmMessages.length} messages...`)

        // 7. Call LLM to generate reply
        let aiReply: string
        try {
            const result = await generateWithProviders(llmMessages, {
                provider: 'default'
            })
            aiReply = result.reply.trim()
            console.log(`[AI Reply] ✅ LLM responded (${result.providerUsed}): "${aiReply.slice(0, 50)}..."`)
        } catch (llmError: any) {
            console.error('[AI Reply] ❌ LLM Error:', llmError)
            return NextResponse.json({
                error: 'AI generation failed',
                message: llmError.message || 'Failed to generate AI reply'
            }, { status: 500 })
        }

        // 8. Save AI reply to database
        console.log(`[AI Reply] 💾 Saving AI reply to database...`)
        const { data: newMessage, error: saveError } = await supabase
            .from('phone_messages')
            .insert({
                conversation_id: conversationId,
                content: aiReply,
                is_from_character: false, // AI message = LEFT side (from sender)
                created_at: new Date().toISOString()
            })
            .select()
            .single()

        if (saveError) {
            console.error('[AI Reply] ❌ Error saving message:', saveError)
            return NextResponse.json({
                error: 'Failed to save AI reply',
                message: saveError.message
            }, { status: 500 })
        }

        console.log(`[AI Reply] ✅ AI reply saved! ID: ${newMessage?.id}`)

        // 9. Update rate limit timestamp & conversation preview
        await supabase
            .from('phone_conversations')
            .update({
                last_generated_at: new Date().toISOString(),
                last_message_preview: aiReply.slice(0, 50),
                updated_at: new Date().toISOString()
            })
            .eq('id', conversationId)

        console.log(`[AI Reply] ✅ Rate limit timestamp updated`)

        return NextResponse.json({
            success: true,
            message: newMessage,
            generated: true
        })

    } catch (error: any) {
        console.error('[AI Reply] 🔥 CRITICAL ERROR:', error)
        return NextResponse.json({
            error: error.message || 'Unknown error'
        }, { status: 500 })
    }
}
