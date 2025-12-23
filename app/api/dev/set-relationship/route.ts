// app/api/dev/set-relationship/route.ts
// 🛠️ DEV TOOL: Manually set relationship stats for testing
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Admin Client - bypasses RLS
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// DEV emails whitelist
const DEV_EMAILS = ['eyedontlie88@gmail.com', 'giangcm987@gmail.com']

export async function POST(req: NextRequest) {
    try {
        const { characterId, userId, stage, status, points, userEmail } = await req.json()

        // 🔐 Security check
        if (!userEmail || !DEV_EMAILS.includes(userEmail)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        if (!characterId || !userId) {
            return NextResponse.json({ error: 'Missing characterId or userId' }, { status: 400 })
        }

        console.log(`🛠️ [DEV TOOL] Setting Relationship: ${stage} (${points}pts) for ${characterId}`)

        // 1. Check if record exists
        const { data: existing } = await supabaseAdmin
            .from('RelationshipConfig')
            .select('id')
            .eq('characterId', characterId)
            .single()

        const now = new Date().toISOString()
        let error

        if (existing) {
            // ✅ UPDATE (Record exists)
            console.log(`[DEV TOOL] Updating existing record: ${existing.id}`)
            const res = await supabaseAdmin
                .from('RelationshipConfig')
                .update({
                    stage,
                    status,
                    affectionPoints: points,
                    intimacyLevel: points > 40 ? 3 : (points > 20 ? 2 : 1),
                    updatedAt: now,
                    lastActiveAt: now,
                })
                .eq('characterId', characterId)
            error = res.error
        } else {
            // ✅ INSERT (New character)
            const generatedId = `rel-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
            console.log(`[DEV TOOL] Creating new record: ${generatedId}`)
            const res = await supabaseAdmin
                .from('RelationshipConfig')
                .insert({
                    id: generatedId,
                    characterId,
                    userId,
                    stage,
                    status,
                    affectionPoints: points,
                    intimacyLevel: points > 40 ? 3 : (points > 20 ? 2 : 1),
                    createdAt: now,
                    updatedAt: now,
                    lastActiveAt: now,
                    // Default values for required fields
                    messageCount: 0,
                    trustDebt: 0,
                    emotionalMomentum: 0,
                    apologyCount: 0,
                    lastStageChangeAt: 0,
                })
            error = res.error
        }

        if (error) {
            console.error('[DEV TOOL] DB Error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        console.log(`💕 [DEV TOOL] Relationship set successfully!`)
        return NextResponse.json({
            success: true,
            stage,
            status,
            points,
            action: existing ? 'updated' : 'created'
        })
    } catch (e: any) {
        console.error('[DEV TOOL] Exception:', e)
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
