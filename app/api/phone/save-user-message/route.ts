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

        console.log('[SaveUserMessage] Request:', { conversationId, characterId, senderName, contentLength: content?.length })

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

        // Helper function to return temp message (graceful degradation)
        const returnTempMessage = (reason: string) => {
            console.warn(`[SaveUserMessage] ⚠️ Fallback to temp: ${reason}`)
            return NextResponse.json({
                success: true,
                message: {
                    id: `temp-${Date.now()}`,
                    content: content.trim(),
                    is_from_character: true,
                    created_at: new Date().toISOString()
                },
                source: 'temp',
                warning: reason
            })
        }

        // Check Supabase configuration
        if (!isSupabaseConfigured() || !supabase) {
            return returnTempMessage('Supabase not configured')
        }

        let convId = conversationId

        // If no conversationId, find or create one
        if (!convId && senderName) {
            try {
                const { data: existingConv, error: findError } = await supabase
                    .from('phone_conversations')
                    .select('id')
                    .eq('character_id', characterId)
                    .eq('sender_name', senderName)
                    .single()

                if (findError && findError.code !== 'PGRST116') {
                    // PGRST116 = no rows returned (expected when doesn't exist)
                    console.error('[SaveUserMessage] Error finding conversation:', findError)
                }

                if (existingConv) {
                    convId = existingConv.id
                    console.log(`[SaveUserMessage] Found existing conversation: ${convId}`)
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

                    if (createError) {
                        console.error('[SaveUserMessage] Failed to create conversation:', createError)
                        return returnTempMessage(`Create conv failed: ${createError.message}`)
                    }

                    if (!newConv) {
                        return returnTempMessage('No conversation returned after insert')
                    }

                    convId = newConv.id
                    console.log(`[SaveUserMessage] Created new conversation: ${convId}`)
                }
            } catch (dbError) {
                console.error('[SaveUserMessage] DB error finding/creating conversation:', dbError)
                return returnTempMessage('Database error')
            }
        }

        if (!convId) {
            return returnTempMessage('Could not determine conversation ID')
        }

        // Insert the user's message
        // is_from_character: true = message FROM the character (phone owner)
        try {
            const { data: savedMessage, error: insertError } = await supabase
                .from('phone_messages')
                .insert({
                    conversation_id: convId,
                    content: content.trim(),
                    is_from_character: true,  // User's reply = character's message
                })
                .select('id, content, is_from_character, created_at')
                .single()

            if (insertError) {
                console.error('[SaveUserMessage] Insert error:', insertError)
                return returnTempMessage(`Insert failed: ${insertError.message}`)
            }

            if (!savedMessage) {
                return returnTempMessage('No message returned after insert')
            }

            console.log(`[SaveUserMessage] ✅ Saved user message ID: ${savedMessage.id} to conv: ${convId}`)

            return NextResponse.json({
                success: true,
                message: savedMessage,
                conversationId: convId,
                source: 'database'
            })
        } catch (insertCatch) {
            console.error('[SaveUserMessage] Insert catch:', insertCatch)
            return returnTempMessage('Insert exception')
        }

    } catch (error) {
        console.error('[SaveUserMessage] Outer error:', error)
        // Return temp message even on total failure - graceful degradation
        return NextResponse.json({
            success: true,
            message: {
                id: `temp-error-${Date.now()}`,
                content: 'Error saving',
                is_from_character: true,
                created_at: new Date().toISOString()
            },
            source: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
        })
    }
}

