import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client'

/**
 * API Route: Get Conversation Detail (READ-ONLY with optional AI trigger)
 * POST /api/phone/get-conversation-detail
 * 
 * 🔥 CRITICAL: This API is primarily READ-ONLY.
 * It can optionally trigger AI reply generation via forceRegenerate parameter.
 * 
 * Body: { senderName, characterId, conversationId?, forceRegenerate?, userEmail?, characterDescription? }
 * Returns: { messages: [], conversationId, source: 'database' }
 */

// 🔐 DEV EMAILS - can bypass restrictions
const DEV_EMAILS = ['eyedontlie88@gmail.com', 'giangcm987@gmail.com']

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const {
            senderName,
            characterId,
            characterName,
            characterDescription,
            conversationId,
            userLanguage = 'vi',
            forceRegenerate = false,
            userEmail
        } = body

        console.log(`[Phone Detail] 📖 Request for: "${senderName}" (Char: ${characterId}) | forceRegenerate: ${forceRegenerate}`)

        // Validation
        if (!senderName || !characterId) {
            return NextResponse.json({ error: 'Missing senderName or characterId' }, { status: 400 })
        }

        if (!isSupabaseConfigured() || !supabase) {
            console.error('[Phone Detail] Supabase not configured')
            return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
        }

        // 1. Find conversation ID (idempotent lookup by name)
        let convId = conversationId

        // ALWAYS search by name first (ignore temp/fake IDs from frontend)
        if (!convId || convId.startsWith('temp-')) {
            console.log(`[Phone Detail] 🔍 Searching for conversation: "${senderName}" + Character ${characterId}`)

            const { data: existingConvs, error: findError } = await supabase
                .from('phone_conversations')
                .select('id')
                .eq('character_id', characterId)
                .eq('contact_name', senderName)
                .limit(1)

            if (findError) {
                console.error('[Phone Detail] Error searching conversation:', findError)
            }

            if (existingConvs && existingConvs.length > 0) {
                convId = existingConvs[0].id
                console.log(`[Phone Detail] ✅ Found existing conversation: ${convId}`)
            } else {
                // Create empty conversation placeholder (no messages yet)
                console.log(`[Phone Detail] 🆕 Creating empty conversation for "${senderName}"`)
                const { data: newConv, error: createError } = await supabase
                    .from('phone_conversations')
                    .insert({
                        character_id: characterId,
                        contact_name: senderName,
                        last_message_preview: '...'
                    })
                    .select('id')
                    .single()

                if (createError || !newConv) {
                    console.error('[Phone Detail] Failed to create conversation:', createError)
                    return NextResponse.json({
                        messages: [],
                        source: 'error',
                        error: 'Failed to create conversation'
                    }, { status: 500 })
                }

                convId = newConv.id
                console.log(`[Phone Detail] ✅ Created conversation: ${convId}`)
            }
        } else {
            console.log(`[Phone Detail] Using provided conversation ID: ${convId}`)
        }

        // 2. If forceRegenerate, trigger AI reply first
        let regenerated = false
        if (forceRegenerate) {
            console.log(`[Phone Detail] 🤖 Force regenerate requested, triggering AI reply...`)

            try {
                const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
                const regenRes = await fetch(`${appUrl}/api/phone/generate-ai-reply`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        conversationId: convId,
                        characterId,
                        senderName,
                        characterName,
                        characterDescription,
                        userEmail,
                        userLanguage,
                        forceTrigger: false // Respect rate limit unless dev
                    })
                })

                if (regenRes.ok) {
                    console.log('[Phone Detail] ✅ AI reply generated')
                    regenerated = true
                } else {
                    const errorData = await regenRes.json().catch(() => ({}))
                    console.log('[Phone Detail] ⚠️ AI generation skipped:', errorData.message || regenRes.status)
                }
            } catch (err) {
                console.error('[Phone Detail] AI generation error (non-blocking):', err)
            }
        }

        // 3. Read messages from database
        console.log(`[Phone Detail] 📖 Reading messages from conversation: ${convId}`)
        const { data: messages, error: fetchError } = await supabase
            .from('phone_messages')
            .select('*')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: true })

        if (fetchError) {
            console.error('[Phone Detail] Error fetching messages:', fetchError)
            return NextResponse.json({
                messages: [],
                conversationId: convId,
                source: 'error',
                error: fetchError.message
            }, { status: 500 })
        }

        // 4. Return messages
        const messageCount = messages?.length || 0
        console.log(`[Phone Detail] ✅ Returning ${messageCount} messages from DB${regenerated ? ' (AI reply included)' : ''}`)

        return NextResponse.json({
            messages: messages || [],
            conversationId: convId,
            source: 'database',
            regenerated
        })

    } catch (error: any) {
        console.error('[Phone Detail] Error:', error)
        return NextResponse.json({
            error: error.message || 'Unknown error'
        }, { status: 500 })
    }
}
