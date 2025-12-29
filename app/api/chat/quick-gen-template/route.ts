import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import conversationTemplate from '@/lib/templates/conversation-template.json'
import { updateAffection } from '@/lib/relationship/update-affection-helper'

/**
 * 🚀 QUICK GEN FROM TEMPLATE
 * POST /api/chat/quick-gen-template
 * 
 * Uses pre-made JSON template instead of AI generation.
 * Much faster (~2s vs ~30s) and consistent results.
 * 
 * Body: { userEmail, userId, characterId, characterName, userName }
 */

// 🔥 ADMIN CLIENT - for direct inserts with service role key
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 🔐 DEV EMAILS WHITELIST
const DEV_EMAILS = ['eyedontlie88@gmail.com', 'giangcm987@gmail.com']

interface TemplateMessage {
    order: number
    role: 'user' | 'assistant'
    content: string
    sentiment: string
    affectionImpact: number
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const {
            userEmail,
            userId,
            characterId,
            characterName = 'Character',
            userName = 'User',
        } = body

        // 🔐 SECURITY: Verify DEV email
        if (!userEmail || !DEV_EMAILS.includes(userEmail)) {
            console.error(`🚫 [QUICK GEN TEMPLATE] Unauthorized: ${userEmail || 'unknown'}`)
            return NextResponse.json(
                { error: 'Unauthorized: DEV access required' },
                { status: 403 }
            )
        }

        // Validate required fields
        if (!characterId || !userId) {
            return NextResponse.json(
                { error: 'characterId and userId are required' },
                { status: 400 }
            )
        }

        console.log(`🚀 [QUICK GEN TEMPLATE] Starting for character: ${characterName}`)
        console.log(`📋 [QUICK GEN TEMPLATE] Loading template with ${conversationTemplate.messages.length} messages`)

        // 1. Process template - replace placeholders
        const messages = (conversationTemplate.messages as TemplateMessage[]).map(msg => ({
            ...msg,
            content: msg.content
                .replace(/\[userName\]/g, userName)
                .replace(/\[characterName\]/g, characterName)
        }))

        // 2. Prepare messages for DB insert
        const baseTimestamp = Date.now()
        const messagesToInsert = messages.map((msg, idx) => ({
            id: `template-${baseTimestamp}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
            characterId: characterId,
            role: msg.role,
            content: msg.content,
            createdAt: new Date(baseTimestamp + idx * 2000).toISOString(), // 2 second intervals
        }))

        // 3. Insert messages to DB
        const { data, error } = await supabaseAdmin
            .from('Message')
            .insert(messagesToInsert)
            .select('id')

        if (error) {
            console.error('[QUICK GEN TEMPLATE] Insert error:', error)
            return NextResponse.json(
                { error: `Insert failed: ${error.message}` },
                { status: 500 }
            )
        }

        console.log(`💾 [QUICK GEN TEMPLATE] ✅ Inserted ${messagesToInsert.length} messages`)

        // 4. Update affection for each user message
        let totalAffectionGain = 0
        let phoneUnlockedDuringRun = false
        let finalResult = null

        for (const msg of messages) {
            // Only user messages increase affection
            if (msg.role === 'user' && msg.affectionImpact > 0) {
                // Call updateAffection for each user message with POSITIVE sentiment
                const result = await updateAffection(userId, characterId, 'POSITIVE', supabaseAdmin)

                if (result.success) {
                    totalAffectionGain += 4 // Average gain per POSITIVE sentiment
                    finalResult = result

                    if (result.phoneJustUnlocked) {
                        phoneUnlockedDuringRun = true
                        console.log(`🔓 [QUICK GEN TEMPLATE] 🎉 Phone UNLOCKED!`)
                    }
                }
            }
        }

        // 5. Log final result
        console.log(`✅ [QUICK GEN TEMPLATE] Complete!`, {
            messagesCreated: messages.length,
            affectionGain: totalAffectionGain,
            phoneUnlocked: finalResult?.phoneUnlocked || false,
            phoneJustUnlocked: phoneUnlockedDuringRun,
            finalAffection: finalResult?.affectionPoints || 0,
        })

        return NextResponse.json({
            success: true,
            saved: true,
            messagesCreated: messages.length,
            affectionGain: totalAffectionGain,
            source: 'template',
            relationship: finalResult ? {
                affectionPoints: finalResult.affectionPoints,
                intimacyLevel: finalResult.intimacyLevel,
                stage: finalResult.stage,
                phoneUnlocked: finalResult.phoneUnlocked,
            } : undefined,
            phoneJustUnlocked: phoneUnlockedDuringRun,
        })

    } catch (error: any) {
        console.error('[QUICK GEN TEMPLATE] Error:', error)
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        )
    }
}
