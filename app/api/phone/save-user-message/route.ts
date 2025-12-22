import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client'

/**
 * API Route: Save User's Reply Message to Database
 * POST /api/phone/save-user-message
 * 
 * This ensures user's messages persist across page reloads
 * and are visible to AI when regenerating conversations.
 * 
 * Body: { conversationId, characterId, senderName, content }
 * Returns: { success, message: { id, content, is_from_character, created_at } }
 */

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { conversationId, characterId, senderName, content } = body

        // Validation
        if (!content?.trim()) {
            return NextResponse.json(
                { error: 'Message content is required' },
                { status: 400 }
            )
        }

        if (!characterId) {
            return NextResponse.json(
                { error: 'characterId is required' },
                { status: 400 }
            )
        }

        // Check Supabase configuration
        if (!isSupabaseConfigured() || !supabase) {
            console.error('[SaveUserMessage] Supabase not configured')
            // Return a fake success with temp ID for graceful degradation
            return NextResponse.json({
                success: true,
                message: {
                    id: `temp-${Date.now()}`,
                    content: content.trim(),
                    is_from_character: true,
                    created_at: new Date().toISOString()
                },
                source: 'temp'
            })
        }

        let convId = conversationId

        // If no conversationId, find or create one
        if (!convId && senderName) {
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
                    console.error('[SaveUserMessage] Failed to create conversation:', createError)
                    return NextResponse.json(
                        { error: 'Failed to create conversation' },
                        { status: 500 }
                    )
                }
                convId = newConv.id
                console.log(`[SaveUserMessage] Created new conversation: ${convId}`)
            }
        }

        if (!convId) {
            return NextResponse.json(
                { error: 'Could not determine conversation ID' },
                { status: 400 }
            )
        }

        // Insert the user's message
        // is_from_character: true = message FROM the character (phone owner)
        const { data: savedMessage, error: insertError } = await supabase
            .from('phone_messages')
            .insert({
                conversation_id: convId,
                content: content.trim(),
                is_from_character: true,  // User's reply = character's message
            })
            .select('id, content, is_from_character, created_at')
            .single()

        if (insertError || !savedMessage) {
            console.error('[SaveUserMessage] Failed to save message:', insertError)
            return NextResponse.json(
                { error: 'Failed to save message' },
                { status: 500 }
            )
        }

        console.log(`[SaveUserMessage] ✅ Saved user message ID: ${savedMessage.id} to conv: ${convId}`)

        return NextResponse.json({
            success: true,
            message: savedMessage,
            conversationId: convId,
            source: 'database'
        })

    } catch (error) {
        console.error('[SaveUserMessage] Error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
