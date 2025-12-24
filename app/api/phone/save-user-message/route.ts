import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client'

/**
 * API Route: Save User's Reply Message (ROBUST VERSION)
 * POST /api/phone/save-user-message
 * 
 * Accepts is_from_character from frontend to support both:
 * - User messages (is_from_character: true) - RIGHT side
 * - AI messages (is_from_character: false) - LEFT side
 */

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        console.log('[API SaveMsg] 📥 Received Body:', JSON.stringify(body, null, 2))

        const { conversationId, content, characterId, senderName, is_from_character } = body

        // 1. Validation
        if (!content?.trim()) {
            console.error('[API SaveMsg] ❌ Missing content')
            return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
        }

        if (!characterId) {
            console.error('[API SaveMsg] ❌ Missing characterId')
            return NextResponse.json({ error: 'characterId is required' }, { status: 400 })
        }

        if (!senderName) {
            console.error('[API SaveMsg] ❌ Missing senderName')
            return NextResponse.json({ error: 'senderName is required' }, { status: 400 })
        }

        if (!isSupabaseConfigured() || !supabase) {
            console.error('[API SaveMsg] ❌ Supabase not configured')
            return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
        }

        console.log(`[API SaveMsg] 🔍 Looking for conversation: "${senderName}" + Character ${characterId}`)

        // 2. ALWAYS find or create conversation by name (ignore provided ID)
        let finalConvId = null

        // 🔥 Use limit(1) to handle duplicates - just take first match
        const { data: existingConvs, error: findError } = await supabase
            .from('phone_conversations')
            .select('id')
            .eq('character_id', characterId)
            .eq('contact_name', senderName)
            .limit(1)  // Only get 1 result, even if duplicates exist

        if (findError) {
            console.error('[API SaveMsg] ⚠️ Error searching conversation:', findError)
            // Don't throw - try to create new instead
        }

        if (existingConvs && existingConvs.length > 0) {
            finalConvId = existingConvs[0].id  // Take first match
            console.log(`[API SaveMsg] ✅ Found existing conversation: ${finalConvId}`)
        } else {
            // Create new conversation
            console.log(`[API SaveMsg] 🆕 Creating new conversation for "${senderName}"`)
            const { data: newConv, error: createError } = await supabase
                .from('phone_conversations')
                .insert({
                    character_id: characterId,
                    contact_name: senderName,
                    last_message_preview: content.slice(0, 50)
                })
                .select('id')
                .single()

            if (createError) {
                console.error('[API SaveMsg] ❌ Error creating conversation:', createError)
                throw new Error(`Create conversation error: ${createError.message}`)
            }

            if (!newConv) {
                throw new Error('No conversation returned after insert')
            }

            finalConvId = newConv.id
            console.log(`[API SaveMsg] ✅ Created conversation: ${finalConvId}`)
        }

        // 3. Save message to database
        // 🔥 Accept is_from_character from frontend (default to true for user messages)
        const isFromChar = is_from_character ?? true
        console.log(`[API SaveMsg] 💾 Saving message to conversation ${finalConvId} (is_from_character: ${isFromChar})`)

        const { data: savedMessage, error: saveError } = await supabase
            .from('phone_messages')
            .insert({
                conversation_id: finalConvId,
                content: content.trim(),
                is_from_character: isFromChar,
                created_at: new Date().toISOString()
            })
            .select()
            .single()

        if (saveError) {
            console.error('[API SaveMsg] ❌ Error saving message:', saveError)
            console.error('[API SaveMsg] Error details:', JSON.stringify(saveError, null, 2))
            throw new Error(`Save message error: ${saveError.message}`)
        }

        if (!savedMessage) {
            throw new Error('No message returned after insert')
        }

        console.log(`[API SaveMsg] ✅ Message saved successfully! ID: ${savedMessage.id}`)

        // 4. Update conversation preview
        console.log(`[API SaveMsg] 📝 Updating conversation preview`)
        const { error: updateError } = await supabase
            .from('phone_conversations')
            .update({
                last_message_preview: content.slice(0, 50),
                updated_at: new Date().toISOString()
            })
            .eq('id', finalConvId)

        if (updateError) {
            console.warn('[API SaveMsg] ⚠️ Failed to update preview (non-critical):', updateError)
        }

        console.log(`[API SaveMsg] ✅ SUCCESS! Returning conversation ID: ${finalConvId}`)

        // 🔥 NOTE: Removed AI trigger - AI replies are now handled by:
        // 1. Frontend calling get-conversation-detail with forceRegenerate: true
        // 2. Or directly calling /api/phone/generate-ai-reply

        return NextResponse.json({
            success: true,
            message: savedMessage,
            conversationId: finalConvId  // Return real ID to frontend
        })

    } catch (error: any) {
        console.error('[API SaveMsg] 🔥 CRITICAL ERROR:', error)
        console.error('[API SaveMsg] Error stack:', error.stack)

        return NextResponse.json({
            error: error.message || 'Unknown error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 })
    }
}
