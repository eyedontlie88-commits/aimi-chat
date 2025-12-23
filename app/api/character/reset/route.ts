import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * 🔄 Factory Reset API for Character
 * POST /api/character/reset
 * 
 * "Selective Wipe" - Deletes user's data with a character while keeping the character card intact
 * 
 * Deletes:
 * - Chat History (Message table)
 * - Long-term Memory (Memory table)
 * - Phone Conversations & Messages (phone_conversations, phone_messages)
 * - Resets Relationship to STRANGER status (RelationshipConfig)
 * 
 * Keeps:
 * - Character Card (name, avatar, persona, etc.)
 * - Feature configurations
 */

// 🔥 ADMIN CLIENT - bypasses RLS for reset operations
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { characterId, userEmail } = body

        if (!characterId) {
            return NextResponse.json(
                { error: 'Missing characterId' },
                { status: 400 }
            )
        }

        console.log(`[RESET] 🔄 Starting factory reset for CharID: ${characterId} by User: ${userEmail || 'unknown'}`)

        // Track errors but continue with other deletions
        const errors: string[] = []
        let deletedCounts = {
            messages: 0,
            memories: 0,
            phoneConversations: 0,
            phoneMessages: 0,
            relationshipReset: false
        }

        // 1. Delete Chat History (Message table - Prisma style, capital M)
        try {
            const { data: msgData, error: msgError } = await supabaseAdmin
                .from('Message')
                .delete()
                .eq('characterId', characterId)
                .select('id')

            if (msgError) {
                console.error('[RESET] Message delete error:', msgError)
                errors.push(`Messages: ${msgError.message}`)
            } else {
                deletedCounts.messages = msgData?.length || 0
                console.log(`[RESET] ✅ Deleted ${deletedCounts.messages} messages`)
            }
        } catch (e) {
            console.error('[RESET] Message delete exception:', e)
        }

        // 2. Delete Memories (Memory table - Prisma style, capital M)
        try {
            const { data: memData, error: memError } = await supabaseAdmin
                .from('Memory')
                .delete()
                .eq('characterId', characterId)
                .select('id')

            if (memError) {
                console.error('[RESET] Memory delete error:', memError)
                errors.push(`Memories: ${memError.message}`)
            } else {
                deletedCounts.memories = memData?.length || 0
                console.log(`[RESET] ✅ Deleted ${deletedCounts.memories} memories`)
            }
        } catch (e) {
            console.error('[RESET] Memory delete exception:', e)
        }

        // 3. Delete Phone Messages
        try {
            const { data: phoneData, error: phoneError } = await supabaseAdmin
                .from('phone_messages')
                .delete()
                .eq('character_id', characterId) // snake_case for Supabase tables
                .select('id')

            if (phoneError) {
                console.error('[RESET] Phone messages delete error:', phoneError)
                errors.push(`Phone Messages: ${phoneError.message}`)
            } else {
                deletedCounts.phoneMessages = phoneData?.length || 0
                console.log(`[RESET] ✅ Deleted ${deletedCounts.phoneMessages} phone messages`)
            }
        } catch (e) {
            console.error('[RESET] Phone messages delete exception:', e)
        }

        // 4. Delete Phone Conversations
        try {
            const { data: convData, error: convError } = await supabaseAdmin
                .from('phone_conversations')
                .delete()
                .eq('character_id', characterId) // snake_case for Supabase tables
                .select('id')

            if (convError) {
                console.error('[RESET] Phone conversations delete error:', convError)
                errors.push(`Phone Conversations: ${convError.message}`)
            } else {
                deletedCounts.phoneConversations = convData?.length || 0
                console.log(`[RESET] ✅ Deleted ${deletedCounts.phoneConversations} phone conversations`)
            }
        } catch (e) {
            console.error('[RESET] Phone conversations delete exception:', e)
        }

        // 5. Reset Relationship to STRANGER status (RelationshipConfig)
        try {
            const { error: relError } = await supabaseAdmin
                .from('RelationshipConfig')
                .update({
                    stage: 'STRANGER',               // ✅ Code stage
                    status: 'Người lạ',              // ✅ Display text (DUAL SYNC)
                    intimacyLevel: 0,
                    affectionPoints: 0,
                    messageCount: 0,
                    lastStageChangeAt: 0,
                    trustDebt: 0.0,
                    emotionalMomentum: 0.0,
                    apologyCount: 0,
                    specialNotes: null,
                    startDate: null,
                })
                .eq('characterId', characterId)

            if (relError) {
                console.error('[RESET] Relationship reset error:', relError)
                errors.push(`Relationship: ${relError.message}`)
            } else {
                deletedCounts.relationshipReset = true
                console.log(`[RESET] ✅ Reset relationship to STRANGER`)
            }
        } catch (e) {
            console.error('[RESET] Relationship reset exception:', e)
        }

        // Summary
        console.log(`[RESET] 🏁 Factory reset completed.`, {
            deleted: deletedCounts,
            errors: errors.length > 0 ? errors : 'none'
        })

        return NextResponse.json({
            success: true,
            deleted: deletedCounts,
            errors: errors.length > 0 ? errors : undefined
        })

    } catch (error: any) {
        console.error('[RESET] Server Error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        )
    }
}
